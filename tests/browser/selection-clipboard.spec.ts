import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const kind of ['mixed','entourage']) {
  test(`paste the saved ${kind} selection after deletion and repeat with undo`, async ({page}) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door'])));
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8'));
    const floor = plan.floors[0];
    floor.entourage = [{id:'e',defId:'person',position:{x:200,y:200},width:100,rotation:35,opacity:.7}];
    floor.stairs = [{id:'s',position:{x:100,y:200},width:80,depth:140,rotation:0,riserCount:14,direction:'up',stairType:'l-shaped'}];
    floor.columns = [{id:'c',position:{x:450,y:100},diameter:50,height:300,rotation:30,shape:'square',color:'#cc22cc'}];
    floor.furniture = [{id:'f',catalogId:'unknown',position:{x:300,y:200},width:100,depth:80,rotation:10,color:'#cc22cc'}];
    if (kind === 'entourage') for (const key of ['walls','doors','windows','rooms','furniture','stairs','columns']) floor[key]=[];
    floor.groups = kind === 'mixed' ? [{id:'group',elementIds:['f','e']}] : [];
    await page.goto('/editor');
    await page.getByRole('button',{name:'Export',exact:true}).click();
    const chooser=page.waitForEvent('filechooser');
    await page.getByRole('button',{name:'Import JSON',exact:true}).click();
    await (await chooser).setFiles({name:'copy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    async function exported() {
      await page.getByRole('button',{name:'Export',exact:true}).click(); const pending=page.waitForEvent('download');
      await page.getByRole('button',{name:'Download JSON',exact:true}).click();
      return JSON.parse(await readFile((await (await pending).path())!,'utf8')).floors[0];
    }
    const original = await exported();
    await page.getByRole('button',{name:'Save',exact:true}).press('ControlOrMeta+a');
    await page.getByTitle('Zoom to Fit (F)',{exact:true}).first().press('Enter');
    const keys = ['walls','doors','windows','furniture','stairs','columns','entourage','groups'];
    await page.getByRole('button',{name:'Save',exact:true}).press('ControlOrMeta+c');
    await page.getByRole('button',{name:'Delete',exact:true}).and(page.getByTitle('Delete',{exact:true})).click();
    const deleted = await exported(); for (const key of keys) expect(deleted[key]).toHaveLength(0);
    await page.getByRole('button',{name:'Save',exact:true}).press('ControlOrMeta+v');
    const pasted = await exported();
    for (const key of keys) expect(pasted[key]).toHaveLength(original[key].length);
    for (const key of ['furniture','stairs','columns','entourage']) {
      for (let i=0;i<original[key].length;i++) {
        expect(pasted[key][i]).toEqual({...original[key][i],id:pasted[key][i].id,position:{x:original[key][i].position.x+30,y:original[key][i].position.y+30}});
        expect(pasted[key][i].id).not.toBe(original[key][i].id);
      }
    }
    for (const key of ['doors','windows']) for (const item of pasted[key]) {
      expect(pasted.walls.some((wall:any)=>wall.id===item.wallId)).toBe(true);
    }
    await page.getByRole('button',{name:'Save',exact:true}).press('ControlOrMeta+v');
    const twice = await exported();
    for (const key of keys) expect(twice[key]).toHaveLength(original[key].length*2);
    const e = twice.entourage[1];
    expect(e.position).toEqual({x:original.entourage[0].position.x+60,y:original.entourage[0].position.y+60});
    expect(e.id).not.toBe(twice.entourage[0].id);
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    const undone = await exported(); for (const key of keys) expect(undone[key]).toEqual(pasted[key]);
    await page.getByRole('button',{name:'Redo',exact:true}).click();
    const redone = await exported(); for (const key of keys) expect(redone[key]).toEqual(twice[key]);
  });
}
