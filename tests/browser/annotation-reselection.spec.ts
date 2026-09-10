import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const width of [1440,390]) {
  test(`saved annotation groups and Shift-click at ${width}px`,async({page},testInfo)=>{
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
    await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
    const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'annotations.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    const save=page.getByRole('button',{name:'Save',exact:true});
    async function exported(){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();return JSON.parse(await readFile((await(await pending).path())!,'utf8')).floors[0];}

    await save.press('ControlOrMeta+a');await save.press('ControlOrMeta+g');
    const before=await exported();expect(before.groups).toHaveLength(1);
    async function clickTarget(name:string,modifier?:'Shift'|'ControlOrMeta') {
      await page.getByTitle('Zoom to Fit (F)',{exact:true}).first().press('Enter');
      await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
      const target=await page.evaluate(name=>(window as any).__targets[name],name);
      if(modifier)await page.keyboard.down(modifier);
      await page.mouse.click(target.x,target.y);
      if(modifier)await page.keyboard.up(modifier);
    }
    for(const name of ['Group note','2 m','Dimension']) {
      await save.press('Escape');await clickTarget(name);
      await expect(page.getByText('3 selected',{exact:true}).first()).toBeVisible();
      expect(await exported()).toEqual(before);
    }
    await save.press('Escape');
    await page.getByTitle('Zoom to Fit (F)',{exact:true}).first().press('Enter');
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    const start=await page.evaluate(()=>(window as any).__targets['Group note']);
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+20,start.y+20,{steps:5});await page.mouse.up();
    const moved=await exported(),dx=moved.textAnnotations[0].x-before.textAnnotations[0].x,dy=moved.textAnnotations[0].y-before.textAnnotations[0].y;
    expect(Math.hypot(dx,dy)).toBeGreaterThan(0);
    for(const key of ['measurements','annotations'])expect(moved[key][0]).toEqual({...before[key][0],x1:before[key][0].x1+dx,y1:before[key][0].y1+dy,x2:before[key][0].x2+dx,y2:before[key][0].y2+dy});
    await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(before);
    await clickTarget('Group note','ControlOrMeta');
    await expect(page.getByText('3 selected',{exact:true})).toHaveCount(0);
    await clickTarget('2 m','Shift');
    await expect(page.getByText('2 selected',{exact:true}).first()).toBeVisible();
    await clickTarget('Dimension','Shift');
    await expect(page.getByText('3 selected',{exact:true}).first()).toBeVisible();
    await clickTarget('Dimension','Shift');
    await expect(page.getByText('2 selected',{exact:true}).first()).toBeVisible();
    await clickTarget('Group note','Shift');
    await expect(page.getByText('2 selected',{exact:true})).toHaveCount(0);
    expect(await exported()).toEqual(before);
    await save.press('Delete');await expect(page.getByRole('button',{name:'Fit selection',exact:true})).toBeDisabled();const deleted=await exported();
    expect(deleted.measurements).toEqual([]);expect(deleted.textAnnotations).toEqual(before.textAnnotations);expect(deleted.annotations).toEqual(before.annotations);
    await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(before);
  });
}
