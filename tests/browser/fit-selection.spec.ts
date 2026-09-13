import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const width of [1440,390]) {
  test(`Fit Selection frames a distant L stair above properties at ${width}px`,async({page},testInfo)=>{
    test.setTimeout(90_000);await page.setViewportSize({width,height:900});
    await page.addInitScript(()=>{
      localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door']));
      const clear=CanvasRenderingContext2D.prototype.clearRect,fill=CanvasRenderingContext2D.prototype.fillRect;
      CanvasRenderingContext2D.prototype.clearRect=function(x,y,w,h){if(this.canvas.getAttribute('aria-label')==='Floor plan editor canvas')(window as any).__stairs=[];return clear.call(this,x,y,w,h);};
      CanvasRenderingContext2D.prototype.fillRect=function(x,y,w,h){
        if(this.canvas.getAttribute('aria-label')==='Floor plan editor canvas' && /^#(?:e5e7eb|bfdbfe)80$|^rgba\((?:229,\s*231,\s*235|191,\s*219,\s*254),/.test(String(this.fillStyle))) {
          const t=this.getTransform(),b=this.canvas.getBoundingClientRect();
          for(const [a,c] of [[x,y],[x+w,y],[x+w,y+h],[x,y+h]]){const p=new DOMPoint(a,c).matrixTransform(t);((window as any).__stairs??=[]).push({x:b.x+p.x*b.width/this.canvas.width,y:b.y+p.y*b.height/this.canvas.height});}
        }
        return fill.call(this,x,y,w,h);
      };
    });
    const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
    for(const key of ['doors','windows','rooms','furniture','columns','entourage'])floor[key]=[];
    floor.walls=[{id:'far',start:{x:1e6,y:1e6},end:{x:1e6+600,y:1e6},thickness:20,height:250,color:'#444'}];
    floor.stairs=[{id:'s',position:{x:9000,y:-8000},width:100,depth:900,rotation:30,stairType:'l-shaped',riserCount:14,direction:'up'}];
    await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
    const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'selection.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Fit selection',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'Save',exact:true}).press('ControlOrMeta+a');
    await page.getByRole('button',{name:'Save',exact:true}).press('l');
    await page.getByRole('button',{name:/Stair 1 \(up\)/}).click();
    await page.getByRole('button',{name:'Save',exact:true}).press('l');
    await page.getByRole('button',{name:'Fit selection',exact:true}).click();
    async function fitted(){
      await expect.poll(()=>page.evaluate(()=>{
        const points=(window as any).__stairs,b=document.querySelector('[aria-label="Floor plan editor canvas"]')!.getBoundingClientRect(),sheet=document.querySelector('[data-plan-properties]')?.getBoundingClientRect();
        const bottom=sheet&&sheet.left<b.right&&sheet.right>b.left?Math.min(b.bottom,sheet.top):b.bottom;
        return points?.length===12&&points.every((p:any)=>p.x>b.left+20&&p.x<b.right-20&&p.y>b.top+20&&p.y<bottom-20);
      })).toBe(true);
      expect(parseFloat(await page.getByRole('button',{name:'Zoom to 100%',exact:true}).innerText())).toBeGreaterThan(5);
    }
    await fitted();
    await page.getByTitle('Zoom to Fit (F)',{exact:true}).first().press('Enter');
    await page.getByRole('button',{name:'Save',exact:true}).press('Shift+F');await fitted();
    await testInfo.attach(`fit-selection-${width}`,{body:await page.screenshot(),contentType:'image/png'});
    await page.getByRole('button',{name:'Export',exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();
    const saved=JSON.parse(await readFile((await(await download).path())!,'utf8')).floors[0];expect(saved.walls).toEqual(floor.walls);expect(saved.stairs).toEqual(floor.stairs);
  });
}
