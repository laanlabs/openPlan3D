import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const kind of ['mixed','note','measurement','dimension']) {
  const width=kind==='mixed'?1440:390;
  test(`rotate ${kind} annotations with Undo`,async({page},testInfo)=>{
    test.setTimeout(120_000);await page.setViewportSize({width,height:900});
    await page.addInitScript(()=>{
      localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door']));
      const fill=CanvasRenderingContext2D.prototype.fillText,stroke=CanvasRenderingContext2D.prototype.strokeRect;
      CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){
        if(this.canvas.getAttribute('aria-label')==='Floor plan editor canvas' && ['Group note','2 m','Dimension'].includes(text)) {
          const b=this.canvas.getBoundingClientRect(),p=new DOMPoint(x,y+(text==='2 m'?6:0)).matrixTransform(this.getTransform());
          ((window as any).__targets??={})[text]={x:b.x+p.x*b.width/this.canvas.width,y:b.y+p.y*b.height/this.canvas.height};
        }
        return maxWidth===undefined?fill.call(this,text,x,y):fill.call(this,text,x,y,maxWidth);
      };
      CanvasRenderingContext2D.prototype.strokeRect=function(x,y,w,h){
        if(this.canvas.getAttribute('aria-label')==='Floor plan editor canvas' && this.strokeStyle==='#8b5cf6') {
          const b=this.canvas.getBoundingClientRect(),t=this.getTransform(),p=new DOMPoint(x,y).matrixTransform(t),q=new DOMPoint(x+w,y+h).matrixTransform(t);
          (window as any).__group={left:b.x+p.x*b.width/this.canvas.width,top:b.y+p.y*b.height/this.canvas.height,right:b.x+q.x*b.width/this.canvas.width,bottom:b.y+q.y*b.height/this.canvas.height};
        }
        return stroke.call(this,x,y,w,h);
      };
    });
    const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
    for(const key of ['walls','doors','windows','furniture','stairs','columns','entourage','rooms','guides'])floor[key]=[];
    floor.textAnnotations=[{id:'note',x:100,y:50,text:'Group note',fontSize:16,rotation:25,color:'#123456'}];
    floor.measurements=[{id:'measure',x1:100,y1:200,x2:300,y2:200}];
    floor.annotations=[{id:'dimension',x1:100,y1:300,x2:300,y2:300,offset:40,label:'Dimension'}];
    if(kind==='mixed') floor.entourage=[{id:'object',defId:'person',position:{x:0,y:0},width:100,rotation:20},
      {id:'locked',defId:'person',position:{x:500,y:500},width:50,rotation:0,locked:true}];
    else {
      if(kind!=='note')floor.textAnnotations=[];
      if(kind!=='measurement')floor.measurements=[];
      if(kind!=='dimension')floor.annotations=[];
    }
    await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
    const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'annotations.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    const save=page.getByRole('button',{name:'Save',exact:true});
    async function exported(){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();return JSON.parse(await readFile((await(await pending).path())!,'utf8')).floors[0];}

    const before=await exported();
    if(kind==='mixed')await save.press('ControlOrMeta+a');
    await page.getByTitle('Zoom to Fit (F)',{exact:true}).first().press('Enter');
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    if(kind!=='mixed') {
      const name=kind==='note'?'Group note':kind==='measurement'?'2 m':'Dimension';
      const target=await page.evaluate(name=>(window as any).__targets[name],name);
      await page.mouse.click(target.x,target.y);
    }
    await save.press('r');const after=await exported();
    function points(f:any) {
      return [...f.entourage.filter((item:any)=>!item.locked).map((item:any)=>item.position),
        ...f.textAnnotations.map((item:any)=>({x:item.x,y:item.y})),
        ...[...f.measurements,...f.annotations].flatMap((item:any)=>[{x:item.x1,y:item.y1},{x:item.x2,y:item.y2}])];
    }
    const original=points(before),rotated=points(after),angle=Math.PI/12;
    for(let i=1;i<original.length;i++) {
      const dx=original[i].x-original[0].x,dy=original[i].y-original[0].y;
      expect(rotated[i].x-rotated[0].x).toBeCloseTo(dx*Math.cos(angle)-dy*Math.sin(angle));
      expect(rotated[i].y-rotated[0].y).toBeCloseTo(dx*Math.sin(angle)+dy*Math.cos(angle));
    }
    for(const item of before.textAnnotations) {
      const result=after.textAnnotations.find((other:any)=>other.id===item.id);
      expect(result).toEqual({...item,x:result.x,y:result.y,rotation:(item.rotation+15)%360});
    }
    for(const key of ['measurements','annotations']) for(const item of before[key]) {
      const result=after[key].find((other:any)=>other.id===item.id);
      expect(result).toEqual({...item,x1:result.x1,y1:result.y1,x2:result.x2,y2:result.y2});
    }
    if(kind==='mixed') {
      expect(after.entourage[0].rotation).toBe(35);
      expect(after.entourage[1]).toEqual(before.entourage[1]);
    } else {
      expect(rotated.reduce((sum:any,p:any)=>sum+p.x,0)/rotated.length).toBeCloseTo(original.reduce((sum:any,p:any)=>sum+p.x,0)/original.length);
      expect(rotated.reduce((sum:any,p:any)=>sum+p.y,0)/rotated.length).toBeCloseTo(original.reduce((sum:any,p:any)=>sum+p.y,0)/original.length);
    }
    expect(after).not.toEqual(before);
    await page.getByTitle('Zoom to Fit (F)',{exact:true}).first().press('Enter');
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    await testInfo.attach(`annotation-rotation-${kind}`,{body:await page.screenshot(),contentType:'image/png'});
    await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(before);
    await page.getByRole('button',{name:'Redo',exact:true}).click();expect(await exported()).toEqual(after);
  });
}
