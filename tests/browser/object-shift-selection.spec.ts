import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const kind of ['furniture','columns','stairs','entourage','doors','windows','walls']) {
  test(`Shift-click toggles ${kind} without moving geometry`,async({page})=>{
    test.setTimeout(90_000);await page.setViewportSize({width:kind==='furniture'?1440:390,height:900});
    await page.addInitScript(()=>{
      localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door']));
      const fill=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){
        if(this.canvas.getAttribute('aria-label')==='Floor plan editor canvas' && ['Reference A','Reference B'].includes(text)) {
          const b=this.canvas.getBoundingClientRect(),p=new DOMPoint(x,y).matrixTransform(this.getTransform());
          ((window as any).__references??={})[text]={x:b.x+p.x*b.width/this.canvas.width,y:b.y+p.y*b.height/this.canvas.height};
        }
        return maxWidth===undefined?fill.call(this,text,x,y):fill.call(this,text,x,y,maxWidth);
      };
    });
    const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
    for(const key of ['walls','doors','windows','furniture','stairs','columns','entourage','rooms','guides','measurements','annotations'])floor[key]=[];
    floor.textAnnotations=[0,100].map((x,i)=>({id:`reference${i}`,x,y:-200,text:i?'Reference B':'Reference A',fontSize:10,rotation:0,color:'#123456'}));
    for(const [i,x] of [0,200].entries()) {
      const id=`item${i}`,position={x,y:0};
      if(kind==='furniture')floor.furniture.push({id,position,catalogId:'chair',width:60,depth:60,rotation:0});
      if(kind==='columns')floor.columns.push({id,position,diameter:60,height:300,shape:'square',rotation:0,color:'#123456'});
      if(kind==='stairs')floor.stairs.push({id,position,width:60,depth:100,rotation:0,stairType:'straight',riserCount:14,direction:'up'});
      if(kind==='entourage')floor.entourage.push({id,position,defId:'person',width:60,rotation:0});
      if(['doors','windows','walls'].includes(kind)) {
        const wallId=kind==='walls'?id:`host${i}`;
        floor.walls.push({id:wallId,start:{x:x-60,y:0},end:{x:x+60,y:0},thickness:20,height:250,color:'#444444'});
        if(kind==='doors')floor.doors.push({id,wallId,position:.5,width:60,height:210,type:'single',flipSide:false});
        if(kind==='windows')floor.windows.push({id,wallId,position:.5,width:60,height:120,sillHeight:90,type:'standard'});
      }
    }
    await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
    const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'shift.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    const save=page.getByRole('button',{name:'Save',exact:true});
    async function exported(){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();return JSON.parse(await readFile((await(await pending).path())!,'utf8')).floors[0];}
    async function fitted(){await page.getByTitle('Zoom to Fit (F)',{exact:true}).first().press('Enter');await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));}
    async function shiftClick(x:number) {
      await fitted();const target=await page.evaluate(x=>{
        const a=(window as any).__references['Reference A'],b=(window as any).__references['Reference B'],scale=(b.x-a.x)/100;
        return {x:a.x+x*scale,y:a.y+200*scale};
      },x);
      await page.keyboard.down('Shift');await page.mouse.click(target.x,target.y);await page.keyboard.up('Shift');
    }
    const before=await exported();await shiftClick(0);await shiftClick(200);
    await expect(page.getByText('2 selected',{exact:true}).first()).toBeVisible();
    await shiftClick(0);await expect(page.getByText('2 selected',{exact:true})).toHaveCount(0);
    expect(await exported()).toEqual(before);
    await save.press('Delete');const deleted=await exported();expect(deleted).toEqual({...before,[kind]:before[kind].filter((item:any)=>item.id!=='item1')});
    await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(before);
    if(kind==='furniture') {
      await save.press('Escape');await fitted();
      const initial=await page.evaluate(()=>(window as any).__references['Reference A']);
      const box=(await page.getByLabel('Floor plan editor canvas',{exact:true}).boundingBox())!;
      await page.keyboard.down('Shift');await page.mouse.move(box.x+box.width-60,box.y+box.height-100);await page.mouse.down();await page.mouse.move(box.x+box.width-30,box.y+box.height-80,{steps:5});await page.mouse.up();await page.keyboard.up('Shift');
      await expect.poll(()=>page.evaluate(initial=>{
        const next=(window as any).__references['Reference A'];return Math.hypot(next.x-initial.x,next.y-initial.y);
      },initial)).toBeGreaterThan(20);
      expect(await exported()).toEqual(before);
    }
  });
}
