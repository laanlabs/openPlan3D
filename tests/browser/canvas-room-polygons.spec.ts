import { test, expect } from '@playwright/test';
import { benchmarkProject } from '../fixtures/render-benchmark';

test('room hit polygons and names stay synchronized across floor switches', async ({ page }) => {
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
 const project = benchmarkProject('medium');
 await (await chooser).setFiles({ name: 'rooms.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
 await page.waitForLoadState('networkidle');
 await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter');
 await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
 async function edit(name: string, replacement: string) {
  const label = () => page.evaluate(name => (window as any).__roomLabels.find((p: any) => p.text === name), name);
  await expect.poll(label).toBeTruthy();
  const p = await label(); await page.mouse.dblclick(p.x, p.y);
  const editor = page.getByRole('textbox', { name: 'Room name', exact: true });
  await expect(editor).toHaveValue(name);
  await editor.fill(replacement); await editor.press('Enter');
 }
 await edit('Room 1,1', 'Renamed office');
 await expect.poll(() => page.evaluate(() => (window as any).__roomLabels.some((p: any) => p.text.startsWith('Renamed office')))).toBe(true);
 await page.getByRole('combobox', { name: 'Current floor' }).selectOption({ label: 'Level 2' });
 await expect.poll(() => page.evaluate(() => (window as any).__roomLabels.some((p: any) => p.text.startsWith('Renamed office')))).toBe(false);
 await edit('Room 1,1', 'Upper office');
 await page.getByRole('combobox', { name: 'Current floor' }).selectOption({ label: 'Level 1' });
 await expect.poll(() => page.evaluate(() => (window as any).__roomLabels.some((p: any) => p.text.startsWith('Renamed office')))).toBe(true);
});
