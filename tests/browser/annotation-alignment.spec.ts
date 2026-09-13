import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const width of [1440,390]) for (const op of ['Align Left','Distribute Horizontally']) {
  test(`${op} aligns saved annotations at ${width}px`, async ({page},testInfo) => {
    test.setTimeout(90_000); await page.setViewportSize({width,height:900});
    await page.addInitScript(() => localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door'])));
    const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
    for (const key of ['walls','doors','windows','rooms','stairs','columns']) floor[key]=[];
    floor.furniture=[]; floor.entourage=[];
    floor.textAnnotations=[{id:'note',x:100,y:50,text:'Two\nlines',fontSize:16,rotation:30,color:'#123456'}];
    floor.measurements=[{id:'measure',x1:250,y1:200,x2:350,y2:240}];
    floor.annotations=[{id:'dimension',x1:500,y1:300,x2:700,y2:340,offset:40,label:'Dimension'}];
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
    for(const key of ['measurements','annotations']) {
      const a=before[key][0], b=moved[key][0];
      expect(b.x2-b.x1).toBeCloseTo(a.x2-a.x1);expect(b.y2-b.y1).toBeCloseTo(a.y2-a.y1);
      expect({...b,x1:a.x1,x2:a.x2,y1:a.y1,y2:a.y2}).toEqual(a);
    }
    expect({...moved.textAnnotations[0],x:before.textAnnotations[0].x,y:before.textAnnotations[0].y}).toEqual(before.textAnnotations[0]);
    await page.getByRole('button',{name:op,exact:true}).click();
    expect(await exported()).toEqual(moved);
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    const undone=await exported();expect(undone).toEqual(before);
    await page.getByRole('button',{name:'Redo',exact:true}).click();
    const redone=await exported();expect(redone).toEqual(moved);
    await page.getByRole('button',{name:'Save',exact:true}).press('f');
    await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
    await testInfo.attach(`annotation-align-${width}-${op}`,{body:await page.screenshot(),contentType:'image/png'});
  });
}
