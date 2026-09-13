import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const width of [1440,390]) for (const op of ['Align Left','Distribute Horizontally']) {
  test(`${op} aligns straight and curved walls at ${width}px`, async ({page},testInfo) => {
    test.setTimeout(90_000); await page.setViewportSize({width,height:900});
    await page.addInitScript(() => localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door'])));
    const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
    for (const key of ['walls','doors','windows','rooms','stairs','columns']) floor[key]=[];
    floor.furniture=[]; floor.entourage=[];
    floor.textAnnotations=[];floor.measurements=[];floor.annotations=[];
    floor.walls=[
      {id:'a',start:{x:0,y:0},end:{x:200,y:0},height:250,thickness:20,color:'#123456'},
      {id:'b',start:{x:350,y:200},end:{x:550,y:220},curvePoint:{x:480,y:340},height:260,startHeight:240,endHeight:280,thickness:30,color:'#234567'},
      {id:'c',start:{x:900,y:500},end:{x:1200,y:540},curvePoint:{x:1000,y:380},height:270,thickness:10,color:'#345678'},
    ];
    floor.doors=[{id:'door',wallId:'b',position:0.2,width:60,height:200,type:'single',swingDirection:'left',flipSide:false}];
    floor.windows=[{id:'window',wallId:'c',position:0.6,width:80,height:120,sillHeight:90,type:'standard'}];
    await page.goto('/editor'); await page.getByRole('button',{name:'Export',exact:true}).click();
    const chooser=page.waitForEvent('filechooser'); await page.getByRole('button',{name:'Import JSON',exact:true}).click();
    await (await chooser).setFiles({name:'align.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    async function exported() {
      await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');
      await page.getByRole('button',{name:'Download JSON',exact:true}).click();
      return JSON.parse(await readFile((await (await pending).path())!,'utf8')).floors[0];
    }
    const before=await exported();
    await page.getByRole('button',{name:'Save',exact:true}).press('ControlOrMeta+a');
    await page.getByRole('button',{name:op,exact:true}).click();
    const moved=await exported();
    expect(moved).not.toEqual(before);
    expect(moved.doors).toEqual(before.doors);expect(moved.windows).toEqual(before.windows);
    moved.walls.forEach((wall:any,i:number)=>{
      const a=before.walls[i],dx=wall.start.x-a.start.x,dy=wall.start.y-a.start.y;
      expect(wall.end.x-a.end.x).toBeCloseTo(dx);expect(wall.end.y-a.end.y).toBeCloseTo(dy);
      if(a.curvePoint){expect(wall.curvePoint.x-a.curvePoint.x).toBeCloseTo(dx);expect(wall.curvePoint.y-a.curvePoint.y).toBeCloseTo(dy);}
      expect({...wall,start:a.start,end:a.end,...(a.curvePoint?{curvePoint:a.curvePoint}:{})}).toEqual(a);
    });
    await page.getByRole('button',{name:op,exact:true}).click();
    expect(await exported()).toEqual(moved);
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    const undone=await exported();expect(undone).toEqual(before);
    await page.getByRole('button',{name:'Redo',exact:true}).click();
    const redone=await exported();expect(redone).toEqual(moved);
    await page.getByRole('button',{name:'Save',exact:true}).press('f');
    await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
    await testInfo.attach(`wall-align-${width}-${op}`,{body:await page.screenshot(),contentType:'image/png'});
  });
}
