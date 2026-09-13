import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { benchmarkProject } from '../fixtures/render-benchmark';

test('3D PNG waits for the main viewer and restores 2D after success or failure',async({page},testInfo)=>{
 test.setTimeout(90000); // Two viewer mounts plus the bounded encoding wait.
 await page.goto('/editor');
 await page.getByRole('button',{name:'Export',exact:true}).click();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 const project=benchmarkProject('small');project.floors[0].furniture=[];
 await(await chooser).setFiles({name:'png-source.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{
  const decoy=document.createElement('canvas');decoy.width=123;decoy.height=123;
  decoy.toBlob=()=>{throw new Error('Wrong canvas');};document.body.prepend(decoy);decoy.style.display='none';
  const original=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(...args){
   document.body.dataset.pngSource=this.dataset.plan3dCanvas;
   document.body.dataset.pngReady=this.dataset.rendered;
   const [callback,...rest]=args;
   return original.call(this,blob=>{document.body.dataset.pngBlob=String(blob?.size);callback(blob);},...rest);
  };
 });
 const main=page.locator('canvas[data-plan3d-canvas="true"]');await expect(main).toHaveCount(0);
 await page.getByRole('button',{name:'Export',exact:true}).click();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export 3D as PNG',exact:true}).click();
 const downloaded=await Promise.race([pending, page.getByRole('alert').waitFor().then(async()=>{
  throw new Error('Capture failure: '+JSON.stringify(await page.locator('body').evaluate(body=>({...body.dataset}))));
 })]);
 const png=await readFile((await downloaded.path())!);
 expect(png.readUInt32BE(16)).toBeGreaterThan(200);expect(png.readUInt32BE(20)).toBeGreaterThan(200);
 await expect(page.locator('body')).toHaveAttribute('data-png-source','true');
 await expect(page.locator('body')).toHaveAttribute('data-png-ready','true');
 await expect(main).toHaveCount(0);
 await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=callback=>callback(null);});
 let downloads=0;page.on('download',()=>downloads++);
 await page.getByRole('button',{name:'Export',exact:true}).click();
 await page.getByRole('button',{name:'Export 3D as PNG',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText("Couldn't export 3D PNG");
 await expect(main).toHaveCount(0);expect(downloads).toBe(0);
 await testInfo.attach('main-3d.png',{body:png,contentType:'image/png'});
});
