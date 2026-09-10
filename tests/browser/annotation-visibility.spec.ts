import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const [key,category,label] of [['textAnnotations','Text notes','Note 1 (Hidden note)'],['measurements','Measurements','Measurement 1 (200 cm)'],['annotations','Annotations','Annotation 1 (Hidden dimension)']]) {
 test(`${category} visibility preserves data and excludes hidden selections`,async({page})=>{
  test.setTimeout(90_000);await page.setViewportSize({width:390,height:900});
  await page.addInitScript(()=>{
   localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door']));
   const fill=CanvasRenderingContext2D.prototype.fillText;
   CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){
    if(this.canvas.getAttribute('aria-label')==='Floor plan editor canvas'&&['Hidden note','Hidden dimension','2 m'].includes(text)) {
     (window as any).__annotationDraws=((window as any).__annotationDraws??0)+1;
     const b=this.canvas.getBoundingClientRect(),p=new DOMPoint(x,y).matrixTransform(this.getTransform());
     (window as any).__annotationPoint={x:b.x+p.x*b.width/this.canvas.width,y:b.y+p.y*b.height/this.canvas.height};
    }
    return maxWidth===undefined?fill.call(this,text,x,y):fill.call(this,text,x,y,maxWidth);
   };
  });
  const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
  for(const k of ['walls','doors','windows','rooms','stairs','columns','entourage','guides','textAnnotations','measurements','annotations'])floor[k]=[];
  floor.furniture=[{id:'chair',catalogId:'chair',position:{x:500,y:500},rotation:0,scale:{x:1,y:1,z:1}}];
  floor[key]=[key==='textAnnotations'?{id:'hidden',x:100,y:100,text:'Hidden note',fontSize:16,rotation:0,color:'#123456'}:
   {id:'hidden',x1:100,y1:100,x2:300,y2:100,...(key==='annotations'?{offset:40,label:'Hidden dimension'}:{})}];
  await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'visibility.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
  await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
  const save=page.getByRole('button',{name:'Save',exact:true});
  async function exported(){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();return JSON.parse(await readFile((await(await pending).path())!,'utf8')).floors[0];}
  const before=await exported();await save.press('f');
  await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
  const point=await page.evaluate(()=>(window as any).__annotationPoint);
  await save.press('l');await page.getByRole('button',{name:new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();
  await page.getByTitle(`Hide ${category}`,{exact:true}).click();await save.press('l');
  await save.press('Delete');expect(await exported()).toEqual(before);
  await page.mouse.click(point.x,point.y);await save.press('Delete');expect(await exported()).toEqual(before);
  await page.evaluate(()=>{(window as any).__annotationDraws=0;});await save.press('f');
  await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
  expect(await page.evaluate(()=>(window as any).__annotationDraws)).toBe(0);
  await save.press('Delete');expect(await exported()).toEqual(before);
  await save.press('ControlOrMeta+a');await save.press('Delete');
  const deleted=await exported();expect(deleted[key]).toEqual(before[key]);expect(deleted.furniture).toEqual([]);
  await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(before);
  await save.press('l');await page.getByRole('button',{name:new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();
  await expect(page.getByTitle(`Hide ${category}`,{exact:true})).toBeVisible();await save.press('l');await save.press('f');
  await expect.poll(()=>page.evaluate(()=>(window as any).__annotationDraws)).toBeGreaterThan(0);
  expect(await exported()).toEqual(before);
 });
}
