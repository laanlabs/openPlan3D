import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const width of [1440,390]) test(`multiline note properties preserve line breaks at ${width}px`,async({page},testInfo)=>{
  test.setTimeout(90_000);await page.setViewportSize({width,height:900});
  await page.addInitScript(()=>localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door'])));
  const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
  floor.textAnnotations=[{id:'note',x:100,y:100,text:'Original\n\nThird line',fontSize:16,rotation:25,color:'#123456'}];
  await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();
  await(await chooser).setFiles({name:'multiline.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
  await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
  const save=page.getByRole('button',{name:'Save',exact:true});
  async function exported(){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();return JSON.parse(await readFile((await(await pending).path())!,'utf8')).floors[0];}
  const before=await exported();
  await save.press('l');await page.getByRole('button',{name:/Note 1 \(Original Third line\)/}).click();await save.press('l');
  const field=page.locator('[data-plan-properties]').getByRole('textbox',{name:'Text',exact:true});
  await expect(field).toHaveValue('Original\n\nThird line');
  await expect(field).toHaveJSProperty('tagName','TEXTAREA');
  await field.fill('Edited first\n\nEdited third');
  const edited=await exported();expect(edited).toEqual({...before,textAnnotations:[{...before.textAnnotations[0],text:'Edited first\n\nEdited third'}]});
  await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(before);
  await page.getByRole('button',{name:'Redo',exact:true}).click();expect(await exported()).toEqual(edited);
  await field.focus();await field.press('ControlOrMeta+End');await field.press('Enter');await field.pressSequentially('r');
  await expect(field).toHaveValue('Edited first\n\nEdited third\nr');
  await field.press('Backspace');await field.pressSequentially('Final line');
  const final=await exported();expect(final).toEqual({...before,textAnnotations:[{...before.textAnnotations[0],text:'Edited first\n\nEdited third\nFinal line'}]});
  await save.click();await save.press('f');
  await testInfo.attach(`multiline-note-${width}`,{body:await page.screenshot(),contentType:'image/png'});
});
