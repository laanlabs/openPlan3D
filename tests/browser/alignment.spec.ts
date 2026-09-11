import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const locale of ['en', 'pt']) for (const width of [1440,390]) for (const op of ['Align Left','Distribute Horizontally']) {
  test(`${locale}: ${op} respects geometry and locks at ${width}px`, async ({page}) => {
    test.setTimeout(90_000); await page.setViewportSize({width,height:900});
    await page.addInitScript(locale => localStorage.setItem('o3d_locale', locale), locale);
    await page.addInitScript(() => localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door'])));
    const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
    for (const key of ['walls','doors','windows','rooms','stairs','columns']) floor[key]=[];
    floor.furniture=[{id:'f',catalogId:'sofa',position:{x:600,y:200},width:100,depth:40,rotation:90,scale:{x:2,y:1,z:1}}];
    floor.entourage=[{id:'a',defId:'person',position:{x:0,y:0},width:100,rotation:0,locked:true},
      {id:'b',defId:'person',position:{x:100,y:100},width:100,rotation:0},
      {id:'c',defId:'person',position:{x:400,y:150},width:100,rotation:90}];
    await page.goto('/editor'); await page.getByRole('button',{name: /^(?:Export|Exportar)$/,exact:true}).click();
    const chooser=page.waitForEvent('filechooser'); await page.getByRole('button',{name: /^(?:Import\ JSON|Importar\ JSON)$/,exact:true}).click();
    await (await chooser).setFiles({name:'align.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    async function exported() {
      await page.getByRole('button',{name: /^(?:Export|Exportar)$/,exact:true}).click();const pending=page.waitForEvent('download');
      await page.getByRole('button',{name: /^(?:Download\ JSON|Baixar\ JSON)$/,exact:true}).click();
      return JSON.parse(await readFile((await (await pending).path())!,'utf8')).floors[0];
    }
    const before=await exported();
    await page.getByRole('button',{name:'Save',exact:true}).press('ControlOrMeta+a');
    await page.getByRole('button',{name:locale === 'pt' ? (op === 'Align Left' ? 'Alinhar à Esquerda' : 'Distribuir Horizontalmente') : op,exact:true}).click();
    const moved=await exported();
    expect(moved.entourage[0]).toEqual(before.entourage[0]);
    expect(moved.entourage[1].position).toEqual({x:op==='Align Left'?0:200,y:100});
    expect(moved.entourage[2].position.x).toBeCloseTo(op==='Align Left'?-20:400);
    expect(moved.entourage[2].position.y).toBe(150);
    expect(moved.furniture[0].position.x).toBeCloseTo(op==='Align Left'?-29.75:600);
    expect(moved.furniture[0].position.y).toBe(200);
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    const undone=await exported();expect(undone.entourage).toEqual(before.entourage);expect(undone.furniture).toEqual(before.furniture);
    await page.getByRole('button',{name:'Redo',exact:true}).click();
    const redone=await exported();expect(redone.entourage).toEqual(moved.entourage);expect(redone.furniture).toEqual(moved.furniture);
  });
}
