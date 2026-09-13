import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const kind of ['mixed','entourage']) {
  test(`rotate the ${kind} selection rigidly with locks and undo`, async ({page}) => {
    test.setTimeout(90_000);
    await page.setViewportSize({width:kind==='mixed'?390:1440,height:900});
    await page.addInitScript(() => localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door'])));
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8'));
    const floor = plan.floors[0];
    floor.entourage = [{id:'e',defId:'person',position:{x:200,y:200},width:100,rotation:35,opacity:.7}];
    floor.stairs = [{id:'s',position:{x:100,y:200},width:80,depth:140,rotation:0,riserCount:14,direction:'up',stairType:'l-shaped'}];
    floor.columns = [{id:'c',position:{x:450,y:100},diameter:50,height:300,rotation:30,shape:'square',color:'#cc22cc'}];
    floor.furniture = [{id:'f',catalogId:'unknown',position:{x:300,y:200},width:100,depth:80,rotation:10,color:'#cc22cc'}];
    if (kind === 'entourage') for (const key of ['walls','doors','windows','rooms','furniture','stairs','columns']) floor[key]=[];
    floor.walls=[];floor.doors=[];floor.windows=[];floor.rooms=[];
    if(kind==='mixed') floor.entourage.push({id:'locked',defId:'person',position:{x:1000,y:1000},width:50,rotation:20,locked:true});
    floor.groups=[];
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
    await page.getByRole('button',{name:'Save',exact:true}).press('r');
    const rotated=await exported();
    const keys=['furniture','stairs','columns','entourage'];
    const originals=keys.flatMap(key=>original[key]), results=keys.flatMap(key=>rotated[key]);
    const movable=originals.filter((item:any)=>!item.locked);
    for (const item of originals) {
      const result=results.find((other:any)=>other.id===item.id);
      if(item.locked) expect(result).toEqual(item);
      else expect(result.rotation).toBe((item.rotation+15)%360);
    }
    if(kind==='entourage') expect(rotated.entourage[0].position).toEqual(original.entourage[0].position);
    else {
      const first=movable[0], movedFirst=results.find((item:any)=>item.id===first.id);
      for(const item of movable.slice(1)) {
        const result=results.find((other:any)=>other.id===item.id),dx=item.position.x-first.position.x,dy=item.position.y-first.position.y;
        const angle=Math.PI/12;
        expect(result.position.x-movedFirst.position.x).toBeCloseTo(dx*Math.cos(angle)-dy*Math.sin(angle));
        expect(result.position.y-movedFirst.position.y).toBeCloseTo(dx*Math.sin(angle)+dy*Math.cos(angle));
      }
    }
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    const undone=await exported();for(const key of keys) expect(undone[key]).toEqual(original[key]);
    await page.getByRole('button',{name:'Redo',exact:true}).click();
    const redone=await exported();for(const key of keys) expect(redone[key]).toEqual(rotated[key]);
  });
}
