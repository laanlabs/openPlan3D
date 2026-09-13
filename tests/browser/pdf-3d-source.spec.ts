import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { benchmarkProject } from '../fixtures/render-benchmark';

test('PDF captures only the main 3D canvas and skips unrelated canvases', async ({ page }, testInfo) => {
 test.slow(); // Lazy 3D startup plus multiple PDF exports on software renderers.
 await page.goto('/editor');
 await page.getByRole('button',{name:'Export',exact:true}).click();
 const chooser=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 const project=benchmarkProject('small');project.floors[0].furniture=[];
 await (await chooser).setFiles({name:'pdf-source.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForLoadState('networkidle');
 async function download() {
  await page.getByRole('button',{name:'Export',exact:true}).click();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export as PDF',exact:true}).click();
  return readFile((await (await pending).path())!);
 }
 await page.evaluate(()=>{
  for(let i=0;i<2;i++) {
   const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;
   canvas.style.display='none';canvas.dataset.pdfDecoy='true';
   canvas.getContext = (()=>{throw new Error('PDF probed unrelated canvas');}) as typeof canvas.getContext;
   canvas.toDataURL=()=>{throw new Error('PDF captured unrelated canvas');};
   document.body.append(canvas);
  }
 });
 expect(await page.locator('canvas[data-plan3d-canvas="true"]').count()).toBe(0);
 const flat=await download();
 expect(flat.toString('latin1')).not.toContain('(3D Perspective View)');
 await page.getByRole('button',{name:'3D',exact:true}).click();
 const main=page.locator('canvas[data-plan3d-canvas="true"]');await expect(main).toBeVisible({timeout:60_000});
 await page.waitForLoadState('networkidle');
 await main.evaluate(canvas=>{
  const c=canvas as HTMLCanvasElement, original=c.toDataURL.bind(c);
  c.dataset.pdfCaptures='0';
  c.toDataURL=(...args)=>{c.dataset.pdfCaptures=String(Number(c.dataset.pdfCaptures)+1);return original(...args);};
 });
 const scene=await download();
 expect(scene.toString('latin1')).toContain('(3D Perspective View)');
 await expect(main).toHaveAttribute('data-pdf-captures','1');
 expect((scene.toString('latin1').match(/\/Type \/Page\b/g)??[]).length).toBe((flat.toString('latin1').match(/\/Type \/Page\b/g)??[]).length+1);
 await main.evaluate(canvas=>{
  (canvas as HTMLCanvasElement).toDataURL=()=> 'data:image/png;base64,'+'A'.repeat(200);
 });
 const recovered=await download();
 expect(recovered.toString('latin1')).not.toContain('(3D Perspective View)');
 expect(recovered.toString('latin1')).toContain('(Room Schedule)');
 expect((recovered.toString('latin1').match(/\/Type \/Page\b/g)??[]).length).toBe((flat.toString('latin1').match(/\/Type \/Page\b/g)??[]).length);
 await expect(page.getByRole('alert')).toContainText('PDF exported without the 3D view');
 await page.getByRole('button',{name:'Dismiss export notice'}).click();
 await page.evaluate(()=>{
  HTMLCanvasElement.prototype.toDataURL=()=>{throw new Error('Forced plan-image failure');};
 });
 let failedDownloads=0;page.on('download',()=>failedDownloads++);
 await page.getByRole('button',{name:'Export',exact:true}).click();
 await page.getByRole('button',{name:'Export as PDF',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText("Couldn't export PDF");
 await page.getByRole('button',{name:'Dismiss export notice'}).click();
 await page.getByRole('button',{name:'Save',exact:true}).press('ControlOrMeta+k');
 await page.getByRole('combobox',{name:'Search commands',exact:true}).fill('Export PDF');
 await page.keyboard.press('Enter');
 await expect(page.getByRole('alert')).toContainText("Couldn't export PDF");
 expect(failedDownloads).toBe(0);
 await testInfo.attach('main-view-pdf.pdf',{body:scene,contentType:'application/pdf'});
});
