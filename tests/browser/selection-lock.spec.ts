import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const width of [1440,390]) {
  test(`lock shortcut handles the whole selection in one undo at ${width}px`, async ({page}) => {
    test.setTimeout(90_000); await page.setViewportSize({width,height:900});
    await page.addInitScript(() => localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door'])));
    const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
    for (const key of ['walls','doors','windows','rooms','stairs','columns']) floor[key]=[];
    floor.furniture=[{id:'f',catalogId:'sofa',position:{x:600,y:200},width:100,depth:40,rotation:90,scale:{x:2,y:1,z:1}}];
    floor.entourage=[{id:'a',defId:'person',position:{x:0,y:0},width:100,rotation:0,locked:true},
      {id:'b',defId:'person',position:{x:100,y:100},width:100,rotation:0},
      {id:'c',defId:'person',position:{x:400,y:150},width:100,rotation:90}];
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
    const save=page.getByRole('button',{name:'Save',exact:true});
    await save.press('ControlOrMeta+l');
    const locked=await exported();
    expect(locked.furniture[0].locked).toBe(true);
    expect(locked.entourage.every((item:any)=>item.locked)).toBe(true);
    await save.press('r');
    const afterRotation=await exported();
    expect(afterRotation.furniture).toEqual(locked.furniture);
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    const undone=await exported();expect(undone.furniture).toEqual(before.furniture);expect(undone.entourage).toEqual(before.entourage);
    await page.getByRole('button',{name:'Redo',exact:true}).click();
    await save.press('ControlOrMeta+l');
    const unlocked=await exported();
    expect(unlocked.furniture[0].locked).toBe(false);
    expect(unlocked.entourage.every((item:any)=>item.locked===false)).toBe(true);
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    const relocked=await exported();expect(relocked.furniture).toEqual(locked.furniture);expect(relocked.entourage).toEqual(locked.entourage);
  });
}
