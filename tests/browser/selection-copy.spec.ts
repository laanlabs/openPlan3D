import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const locale of ['en', 'pt']) for (const kind of ['mixed','entourage']) {
  test(`${locale} duplicate and delete the complete ${kind} selection with undo and redo`, async ({page}) => {
    test.setTimeout(90_000);
    await page.addInitScript(locale => localStorage.setItem('o3d_locale', locale), locale);
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
    await page.getByRole('button',{name:locale === 'pt' ? 'Exportar' : 'Export',exact:true}).click();
    const chooser=page.waitForEvent('filechooser');
    await page.getByRole('button',{name:locale === 'pt' ? 'Importar JSON' : 'Import JSON',exact:true}).click();
    await (await chooser).setFiles({name:'copy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    async function exported() {
      await page.getByRole('button',{name:locale === 'pt' ? 'Exportar' : 'Export',exact:true}).click(); const pending=page.waitForEvent('download');
      await page.getByRole('button',{name:locale === 'pt' ? 'Baixar JSON' : 'Download JSON',exact:true}).click();
      return JSON.parse(await readFile((await (await pending).path())!,'utf8')).floors[0];
    }
    const original = await exported();
    await page.getByRole('button',{name:locale === 'pt' ? 'Salvar' : 'Save',exact:true}).press('ControlOrMeta+a');
    await page.getByTitle(locale === 'pt' ? 'Ajustar à tela (F)' : 'Zoom to Fit (F)',{exact:true}).first().press('Enter');
    await page.getByRole('button',{name:locale === 'pt' ? 'Duplicar' : 'Duplicate',exact:true}).click();
    const copied = await exported();
    const keys = ['walls','doors','windows','furniture','stairs','columns','entourage','groups'];
    for (const key of keys) {
      expect(copied[key]).toHaveLength(original[key].length*2);
      expect(copied[key].slice(0,original[key].length)).toEqual(original[key]);
      expect(new Set(copied[key].map((item:any)=>item.id)).size).toBe(copied[key].length);
    }
    for (const key of ['doors','windows']) for (const item of copied[key].slice(original[key].length)) {
      expect(copied.walls.slice(original.walls.length).some((wall:any)=>wall.id===item.wallId)).toBe(true);
    }
    await page.getByRole('button',{name:locale === 'pt' ? 'Desfazer' : 'Undo',exact:true}).click();
    const undone = await exported(); for (const key of keys) expect(undone[key]).toEqual(original[key]);
    await page.getByRole('button',{name:locale === 'pt' ? 'Refazer' : 'Redo',exact:true}).click();
    const redone = await exported(); for (const key of keys) expect(redone[key]).toEqual(copied[key]);
    await page.getByRole('button',{name:locale === 'pt' ? 'Excluir' : 'Delete',exact:true}).and(page.getByTitle(locale === 'pt' ? 'Excluir' : 'Delete',{exact:true})).click();
    const deleted = await exported(); for (const key of keys) expect(deleted[key]).toEqual(original[key]);
    await page.getByRole('button',{name:locale === 'pt' ? 'Desfazer' : 'Undo',exact:true}).click();
    const restored = await exported(); for (const key of keys) expect(restored[key]).toEqual(copied[key]);
  });
}
