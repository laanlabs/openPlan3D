import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const width of [1440,390]) {
  test(`annotation group selection, drag and deletion at ${width}px`,async({page},testInfo)=>{
    test.setTimeout(90_000);await page.setViewportSize({width,height:900});
    await page.addInitScript(()=>{
      localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door']));
      const fill=CanvasRenderingContext2D.prototype.fillText,stroke=CanvasRenderingContext2D.prototype.strokeRect;
      CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){
        if(this.canvas.getAttribute('aria-label')==='Floor plan editor canvas' && text==='Group note') {
          const b=this.canvas.getBoundingClientRect(),p=new DOMPoint(x,y).matrixTransform(this.getTransform());
          (window as any).__note={x:b.x+p.x*b.width/this.canvas.width,y:b.y+p.y*b.height/this.canvas.height};
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
    const before=await exported();
    await page.getByTitle('Zoom to Fit (F)',{exact:true}).first().press('Enter');
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    const canvas=(await page.getByLabel('Floor plan editor canvas',{exact:true}).boundingBox())!;
    await page.mouse.move(canvas.x+20,canvas.y+20);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width-20,canvas.y+canvas.height-20,{steps:5});await page.mouse.up();
    await expect(page.getByText('3 selected',{exact:true}).first()).toBeVisible();
    await save.press('Escape');await save.press('ControlOrMeta+a');
    await expect(page.getByText('3 selected',{exact:true}).first()).toBeVisible();
    await save.press('ControlOrMeta+d');await save.press('Delete');expect(await exported()).toEqual(before);
    await save.press('ControlOrMeta+a');
    await page.getByRole('button',{name:'Fit selection',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>{
      const n=(window as any).__note,g=(window as any).__group;
      return !!n&&!!g&&n.x>g.left&&n.x<g.right&&n.y>g.top&&n.y<g.bottom;
    })).toBe(true);
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    await testInfo.attach(`annotation-group-${width}`,{body:await page.screenshot(),contentType:'image/png'});
    const note=await page.evaluate(()=>(window as any).__note);
    await page.mouse.move(note.x,note.y);await page.mouse.down();await page.mouse.move(note.x+30,note.y+30,{steps:5});await page.mouse.up();
    const moved=await exported(),dx=moved.textAnnotations[0].x-before.textAnnotations[0].x,dy=moved.textAnnotations[0].y-before.textAnnotations[0].y;
    expect(Math.hypot(dx,dy)).toBeGreaterThan(0);
    expect(moved.textAnnotations[0]).toEqual({...before.textAnnotations[0],x:before.textAnnotations[0].x+dx,y:before.textAnnotations[0].y+dy});
    for(const key of ['measurements','annotations'])expect(moved[key][0]).toEqual({...before[key][0],x1:before[key][0].x1+dx,y1:before[key][0].y1+dy,x2:before[key][0].x2+dx,y2:before[key][0].y2+dy});
    await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(before);
    await page.getByRole('button',{name:'Redo',exact:true}).click();expect(await exported()).toEqual(moved);
    await save.press('ControlOrMeta+a');await save.press('Delete');
    const deleted=await exported();for(const key of ['textAnnotations','measurements','annotations'])expect(deleted[key]).toEqual([]);
    await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(moved);
  });
}
