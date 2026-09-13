import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const [key,label] of [['guides','horizontal guide 1'],['measurements','Measurement 1'],['annotations','Annotation 1'],['textAnnotations','Note 1 (Off-screen note)']]) {
  test(`${key} selection clears on Escape and deletes only its target`,async({page})=>{
    test.setTimeout(90_000);await page.setViewportSize({width:390,height:900});
    await page.addInitScript(()=>localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door'])));
    const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
    floor.textAnnotations=[{id:'note',x:9000,y:-8000,text:'Off-screen\n note',fontSize:16,rotation:25,color:'#123456'}];
    floor.guides=[{id:'g',orientation:'horizontal',position:100}];
    floor.measurements=[{id:'m',x1:100,y1:200,x2:300,y2:200}];
    floor.annotations=[{id:'a',x1:100,y1:300,x2:300,y2:300,offset:40,label:'Dimension'}];
    await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
    const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'selection.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    const save=page.getByRole('button',{name:'Save',exact:true});
    async function exported(){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();return JSON.parse(await readFile((await(await pending).path())!,'utf8')).floors[0];}
    const before=await exported();
    async function select(){await save.press('l');await page.getByRole('button',{name:new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))}).click();await save.press('l');}
    await save.press('ControlOrMeta+a');await select();await save.press('Escape');await save.press('Delete');
    const escaped=await exported();expect(escaped).toEqual(before);
    await select();
    if(key==='textAnnotations') {
      await page.getByRole('button',{name:'Fit selection',exact:true}).click();
      await expect.poll(async()=>parseFloat(await page.getByRole('button',{name:'Zoom to 100%',exact:true}).innerText())).toBeGreaterThan(50);
    }
    await save.press('Delete');const deleted=await exported();expect(deleted[key]).toEqual([]);
    for(const other of ['walls','doors','windows','guides','measurements','annotations','textAnnotations'].filter(other=>other!==key))expect(deleted[other]).toEqual(before[other]);
    await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(before);
  });
}
