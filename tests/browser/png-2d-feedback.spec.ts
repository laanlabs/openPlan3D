import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { benchmarkProject } from '../fixtures/render-benchmark';

test('2D PNG uses the plan renderer in 3D mode and reports failures from both entry points',async({page},testInfo)=>{
 test.setTimeout(90000);
 await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 const project=benchmarkProject('small');project.floors[0].furniture=[];
 await(await chooser).setFiles({name:'png-plan.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForLoadState('networkidle');
 await page.getByRole('button',{name:'3D',exact:true}).click();
 await expect(page.locator('canvas[data-plan3d-canvas="true"]')).toBeVisible();
 await page.evaluate(()=>{
  const original=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(...args){
   if(this.dataset.plan3dCanvas)throw new Error('2D export captured 3D');
   return original.apply(this,args);
  };
 });
 await page.getByRole('button',{name:'Export',exact:true}).click();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export 2D as PNG',exact:true}).click();
 const png=await readFile((await(await pending).path())!);
 expect(png.subarray(1,4).toString()).toBe('PNG');expect(png.readUInt32BE(16)).toBeGreaterThan(1000);
 await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=callback=>callback(null);});
 let downloads=0;page.on('download',()=>downloads++);
 await page.getByRole('button',{name:'Export',exact:true}).click();
 await page.getByRole('button',{name:'Export 2D as PNG',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText("Couldn't export 2D PNG");
 await page.getByRole('button',{name:'Dismiss export notice'}).click();
 await page.getByRole('button',{name:'Save',exact:true}).press('ControlOrMeta+k');
 await page.getByRole('combobox',{name:'Search commands',exact:true}).fill('Export PNG');await page.keyboard.press('Enter');
 await expect(page.getByRole('alert')).toContainText("Couldn't export 2D PNG");expect(downloads).toBe(0);
 await testInfo.attach('full-plan.png',{body:png,contentType:'image/png'});
});
