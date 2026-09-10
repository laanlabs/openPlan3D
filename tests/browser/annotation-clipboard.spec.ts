import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const [key,label] of [['textAnnotations','Copy note'],['measurements','Measurement 1'],['annotations','Annotation 1']]) {
  test(`${key} clipboard survives deletion and supports independent repeat pastes`,async({page})=>{
    test.setTimeout(90_000);await page.setViewportSize({width:390,height:900});
    await page.addInitScript(()=>{
      localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door']));
      const fill=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){
        if(text==='Copy note'&&this.canvas.getAttribute('aria-label')==='Floor plan editor canvas') {
          const p=new DOMPoint(x,y).matrixTransform(this.getTransform()),b=this.canvas.getBoundingClientRect();
          (window as any).__note={x:b.x+p.x*b.width/this.canvas.width,y:b.y+p.y*b.height/this.canvas.height};
        }
        return maxWidth===undefined?fill.call(this,text,x,y):fill.call(this,text,x,y,maxWidth);
      };
    });
    const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
    floor.textAnnotations=[{id:'t',text:'Copy note',x:100,y:50,fontSize:16,rotation:25,color:'#123456'}];
    floor.measurements=[{id:'m',x1:100,y1:200,x2:300,y2:200}];floor.annotations=[{id:'a',x1:100,y1:300,x2:300,y2:300,offset:40,label:'Dimension'}];
    await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
    const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'clipboard.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    const save=page.getByRole('button',{name:'Save',exact:true});
    async function exported(){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();return JSON.parse(await readFile((await(await pending).path())!,'utf8')).floors[0];}
    const before=await exported();await save.press('ControlOrMeta+a');
    if(key==='textAnnotations') {
      await page.getByTitle('Zoom to Fit (F)',{exact:true}).first().press('Enter');
      await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
      const point=await page.evaluate(()=>(window as any).__note);await page.mouse.click(point.x,point.y);
    } else {await save.press('l');await page.getByRole('button',{name:new RegExp(label)}).click();await save.press('l');}
    await save.press('ControlOrMeta+c');await save.press('Delete');expect((await exported())[key]).toEqual([]);
    await save.press('ControlOrMeta+v');const pasted=await exported();expect(pasted[key]).toHaveLength(1);
    const original=before[key][0],expected={...original,id:pasted[key][0].id};
    for(const coordinate of key==='textAnnotations'?['x','y']:['x1','y1','x2','y2'])expected[coordinate]+=30;
    expect(pasted[key][0]).toEqual(expected);expect(pasted[key][0].id).not.toBe(original.id);
    for(const other of ['walls','doors','windows','textAnnotations','measurements','annotations'].filter(other=>other!==key))expect(pasted[other]).toEqual(before[other]);
    await save.press('ControlOrMeta+v');const twice=await exported();expect(twice[key]).toHaveLength(2);expect(twice[key][1].id).not.toBe(twice[key][0].id);
    await page.getByRole('button',{name:'Undo',exact:true}).click();expect((await exported())[key]).toEqual(pasted[key]);
    await page.getByRole('button',{name:'Redo',exact:true}).click();expect((await exported())[key]).toEqual(twice[key]);
  });
}
