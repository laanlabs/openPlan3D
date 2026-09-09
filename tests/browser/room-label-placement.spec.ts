import { test, expect } from '@playwright/test';
import { benchmarkProject } from '../fixtures/render-benchmark';

test('saved room label offsets render, reset, drag and undo at the same anchor', async ({ page }) => {
 await page.addInitScript(() => {
  const fill = CanvasRenderingContext2D.prototype.fillText, clear = CanvasRenderingContext2D.prototype.clearRect;
  (window as any).__roomLabels = [];
  CanvasRenderingContext2D.prototype.clearRect = function(...args) {
   if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') (window as any).__roomLabels = [];
   return clear.apply(this, args);
  };
  CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
   if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas' && (text.startsWith('Room ') || text.startsWith('Renamed office'))) {
    const p = new DOMPoint(x, y).matrixTransform(this.getTransform()), bounds = this.canvas.getBoundingClientRect();
    (window as any).__roomLabels.push({ text: text.replace(/ \(.*$/, ''), x: bounds.x + p.x * bounds.width / this.canvas.width, y: bounds.y + p.y * bounds.height / this.canvas.height });
   }
   if (maxWidth === undefined) return fill.call(this, text, x, y);
   return fill.call(this, text, x, y, maxWidth);
  };
 });

 await page.goto('/editor');
 await page.getByRole('button', { name: 'Export', exact: true }).click();
 const chooser = page.waitForEvent('filechooser');
 await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
 const project = benchmarkProject('small');
 project.floors[0].furniture = [];
 project.floors[0].rooms[0].labelOffset = { x: 100, y: 50 };
 await (await chooser).setFiles({ name: 'labels.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
 await page.waitForLoadState('networkidle');
 await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter');
 await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
 const labels = () => page.evaluate(() => Object.fromEntries((window as any).__roomLabels.map((p: any) => [p.text, p])));
 await expect.poll(async () => Object.keys(await labels()).length).toBe(4);
 let p = await labels();
 const zoom = (p['Room 2,2'].x - p['Room 1,2'].x) / 450;
 expect(p['Room 1,1'].x - p['Room 1,2'].x).toBeCloseTo(100 * zoom, 1);
 expect(p['Room 1,1'].y - p['Room 2,1'].y).toBeCloseTo(50 * zoom, 1);
 await page.mouse.click(p['Room 1,1'].x, p['Room 1,1'].y, { button: 'right' });
 await page.getByRole('menuitem', { name: 'Reset Label Position' }).click();
 await expect.poll(async () => { const l = await labels(); return Math.abs(l['Room 1,1'].x - l['Room 1,2'].x); }).toBeLessThan(1);
 p = await labels(); const start = p['Room 1,1'];
 await page.mouse.move(start.x, start.y); await page.mouse.down();
 await page.mouse.move(start.x + 60, start.y + 40, { steps: 5 }); await page.mouse.up();
 await expect.poll(async () => (await labels())['Room 1,1'].x - start.x).toBeCloseTo(60, 0);
 await expect.poll(async () => (await labels())['Room 1,1'].y - start.y).toBeCloseTo(40, 0);
 p = await labels(); await page.mouse.dblclick(p['Room 1,1'].x, p['Room 1,1'].y);
 const editor = page.getByRole('textbox', { name: 'Room name', exact: true });
 await expect(editor).toHaveValue('Room 1,1');
 const box = (await editor.boundingBox())!;
 expect(box.x + box.width / 2).toBeCloseTo(p['Room 1,1'].x, 0);
 expect(box.y + box.height / 2).toBeCloseTo(p['Room 1,1'].y, 0);
 await editor.press('Escape');
 await page.getByRole('button', { name: 'Undo', exact: true }).click();
 await expect.poll(async () => { const l = await labels(); return Math.abs(l['Room 1,1'].x - l['Room 1,2'].x); }).toBeLessThan(1);
});
