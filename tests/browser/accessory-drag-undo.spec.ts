import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const kind of ['door','window','guide','entourage','entourage-resize']) {
  test(`${kind} drag has one undo entry and restores geometry`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door']));
      const fill = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text,x,y,maxWidth) {
        if ((text === 'Map A' || text === 'Map B') && this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') {
          const p = new DOMPoint(x,y).matrixTransform(this.getTransform()), b = this.canvas.getBoundingClientRect();
          if (text === 'Map B') (window as any).__mapFrame = ((window as any).__mapFrame ?? 0) + 1;
          ((window as any).__map ??= {})[text] = { x:b.x+p.x*b.width/this.canvas.width,y:b.y+p.y*b.height/this.canvas.height,width:b.width };
        }
        if (maxWidth === undefined) return fill.call(this,text,x,y);
        return fill.call(this,text,x,y,maxWidth);
      };
    });
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8'));
    const floor = plan.floors[0]; if(kind!=='door') floor.doors=[]; if(kind!=='window') floor.windows=[];
    floor.stairs=[{id:'s',position:{x:100,y:300},width:80,depth:140,rotation:0,riserCount:14,direction:'up',stairType:'straight'}];
    floor.columns=[{id:'c',position:{x:450,y:100},diameter:50,height:300,rotation:0,shape:'round',color:'#cc22cc'}];
    floor.textAnnotations=[{id:'a',text:'Map A',x:-500,y:-500,fontSize:10,rotation:0,color:'#555555'},
      {id:'b',text:'Map B',x:500,y:-500,fontSize:10,rotation:0,color:'#555555'},
      {id:'t',text:'Drag note',x:120,y:100,fontSize:16,rotation:0,color:'#cc22cc'}];
    floor.guides = kind==='guide' ? [{ id:'g',orientation:'horizontal',position:450 }] : [];
    floor.entourage = kind.startsWith('entourage') ? [{ id:'e',defId:'person',position:{x:400,y:300},width:100,rotation:0,locked:false }] : [];
    await page.goto('/editor');
    await page.getByRole('button',{name:'Export',exact:true}).click();
    const chooser=page.waitForEvent('filechooser');
    await page.getByRole('button',{name:'Import JSON',exact:true}).click();
    await (await chooser).setFiles({name:'drag.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    async function fit() {
      const frame = await page.evaluate(() => (window as any).__mapFrame ?? 0);
      await page.getByTitle('Zoom to Fit (F)', { exact:true }).first().press('Enter');
      await expect.poll(() => page.evaluate(() => (window as any).__mapFrame ?? 0)).toBeGreaterThan(frame);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    }
    const original = await exported();
    await fit();
    async function point(x:number,y:number) {
      await expect.poll(()=>page.evaluate(()=>{
        const m=(window as any).__map,b=document.querySelector('[aria-label="Floor plan editor canvas"]')!.getBoundingClientRect();
        return m?.['Map A']?.width===b.width && m?.['Map B']?.width===b.width;
      })).toBe(true);
      return page.evaluate(({x,y})=>{
        const a=(window as any).__map['Map A'],b=(window as any).__map['Map B'],zoom=(b.x-a.x)/1000;
        return {x:a.x+(x+500)*zoom,y:a.y+(y+500)*zoom};
      },{x,y});
    }
    let xy = kind==='guide' ? [400,450] : [400,300];
    if(kind==='door' || kind==='window') {
      const opening = kind==='door' ? floor.doors[0] : floor.windows[0];
      const wall=floor.walls.find((w:any)=>w.id===opening.wallId);
      xy=[wall.start.x+(wall.end.x-wall.start.x)*opening.position,wall.start.y+(wall.end.y-wall.start.y)*opening.position];
    }
    const selected=await point(xy[0],xy[1]); await page.mouse.click(selected.x,selected.y);
    if(kind==='entourage-resize') xy=[450,330];
    await fit();
    const start=await point(xy[0],xy[1]);
    await page.mouse.move(start.x,start.y); await page.mouse.down();
    await page.mouse.move(start.x+40,start.y+35,{steps:6}); await page.mouse.up();
    async function exported() {
      await page.getByRole('button',{name:'Export',exact:true}).click(); const pending=page.waitForEvent('download');
      await page.getByRole('button',{name:'Download JSON',exact:true}).click();
      return JSON.parse(await readFile((await (await pending).path())!,'utf8')).floors[0];
    }
    const key=kind==='door'?'doors':kind==='window'?'windows':kind==='guide'?'guides':'entourage';
    const moved=await exported(); expect(moved[key]).not.toEqual(original[key]);
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    const undone=await exported();
    for(const key of ['walls','doors','windows','guides','entourage','stairs','columns','textAnnotations']) expect(undone[key]).toEqual(original[key]);
    await page.getByRole('button',{name:'Redo',exact:true}).click();
    expect((await exported())[key]).toEqual(moved[key]);
  });
}
