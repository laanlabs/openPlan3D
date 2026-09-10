import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const kind of ['saved','defaults']) {
  test(`unknown furniture remains visible and editable with ${kind} dimensions`,async({page},testInfo)=>{
    test.setTimeout(120_000);await page.setViewportSize({width:390,height:900});
    await page.addInitScript(()=>{
      localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door']));
      const fill=CanvasRenderingContext2D.prototype.fillText,stroke=CanvasRenderingContext2D.prototype.strokeRect;
      CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){
        if(this.canvas.getAttribute('aria-label')==='Floor plan editor canvas'&&text==='Unknown furniture') {
          const b=this.canvas.getBoundingClientRect(),t=this.getTransform(),p=new DOMPoint(0,0).matrixTransform(t);
          (window as any).__captionDeterminant=t.a*t.d-t.b*t.c;
          (window as any).__unknownCenter={x:b.x+p.x*b.width/this.canvas.width,y:b.y+p.y*b.height/this.canvas.height};
        }
        return maxWidth===undefined?fill.call(this,text,x,y):fill.call(this,text,x,y,maxWidth);
      };
      CanvasRenderingContext2D.prototype.strokeRect=function(x,y,w,h){
        if(this.canvas.getAttribute('aria-label')==='Floor plan editor canvas'&&this.strokeStyle==='#3b82f6'&&w>20&&h>20) {
          const b=this.canvas.getBoundingClientRect(),p=new DOMPoint(x+w-2,y+h-2).matrixTransform(this.getTransform());
          (window as any).__unknownCorner={x:b.x+p.x*b.width/this.canvas.width,y:b.y+p.y*b.height/this.canvas.height};
        }
        return stroke.call(this,x,y,w,h);
      };
    });
    const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
    for(const key of ['walls','doors','windows','furniture','stairs','columns','entourage','rooms','guides','measurements','annotations','textAnnotations'])floor[key]=[];
    floor.furniture=[{id:'missing',catalogId:'missing-custom-model',position:{x:100,y:200},rotation:kind==='saved'?30:0,color:'#123456',...(kind==='saved'?{width:160,depth:80,height:90,scale:{x:-1.5,y:.75,z:1}}:{})}];
    await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
    const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'missing.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    const save=page.getByRole('button',{name:'Save',exact:true});
    async function exported(){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();return JSON.parse(await readFile((await(await pending).path())!,'utf8')).floors[0];}
    async function fitted(){await page.getByTitle('Zoom to Fit (F)',{exact:true}).first().press('Enter');await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));}
    const before=await exported();await fitted();
    await expect.poll(()=>page.evaluate(()=>!!(window as any).__unknownCenter)).toBe(true);
    expect(await page.evaluate(()=>(window as any).__captionDeterminant)).toBeGreaterThan(0);
    let center=await page.evaluate(()=>(window as any).__unknownCenter);await page.mouse.click(center.x,center.y);await fitted();
    await expect.poll(()=>page.evaluate(()=>!!(window as any).__unknownCorner)).toBe(true);
    center=await page.evaluate(()=>(window as any).__unknownCenter);
    await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(center.x+40,center.y+30,{steps:5});await page.mouse.up();
    const moved=await exported();expect(moved.furniture[0].position).not.toEqual(before.furniture[0].position);
    expect(moved.furniture[0]).toEqual({...before.furniture[0],position:moved.furniture[0].position});
    await save.press('r');const rotated=await exported();expect(rotated.furniture[0]).toEqual({...moved.furniture[0],rotation:(moved.furniture[0].rotation+15)%360});
    await fitted();await testInfo.attach(`unknown-${kind}`,{body:await page.screenshot(),contentType:'image/png'});
    await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(moved);
    await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(before);
    await page.getByRole('button',{name:'Redo',exact:true}).click();expect(await exported()).toEqual(moved);
    await page.getByRole('button',{name:'Redo',exact:true}).click();expect(await exported()).toEqual(rotated);
    await fitted();const corner=await page.evaluate(()=>(window as any).__unknownCorner);
    await page.mouse.move(corner.x,corner.y);await page.mouse.down();await page.mouse.move(corner.x+20,corner.y+20,{steps:5});await page.mouse.up();
    const resized=await exported();expect(resized.furniture[0].scale).not.toEqual(rotated.furniture[0].scale);
    expect(resized.furniture[0]).toEqual({...rotated.furniture[0],position:resized.furniture[0].position,scale:resized.furniture[0].scale});
    await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(rotated);
    await save.press('Delete');expect((await exported()).furniture).toEqual([]);
    await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(rotated);
  });
}
