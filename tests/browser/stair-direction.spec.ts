import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const kind of ['straight','l-shaped','u-shaped','spiral']) {
  test(`${kind} direction updates arrows and survives undo redo`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addInitScript(() => {
      const paths = new WeakMap<CanvasRenderingContext2D, number[][]>();
      const begin = CanvasRenderingContext2D.prototype.beginPath;
      CanvasRenderingContext2D.prototype.beginPath = function() { paths.set(this,[]); return begin.call(this); };
      const move = CanvasRenderingContext2D.prototype.moveTo, line = CanvasRenderingContext2D.prototype.lineTo;
      CanvasRenderingContext2D.prototype.moveTo = function(x,y) { paths.get(this)?.push([x,y]); return move.call(this,x,y); };
      CanvasRenderingContext2D.prototype.lineTo = function(x,y) { paths.get(this)?.push([x,y]); return line.call(this,x,y); };
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function(x,y,w,h) {
        if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') (window as any).__arrowheads = [];
        return clear.call(this,x,y,w,h);
      };
      const fill = CanvasRenderingContext2D.prototype.fill;
      CanvasRenderingContext2D.prototype.fill = function(...args: any[]) {
        const p = paths.get(this);
        if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas' && this.fillStyle === '#3b82f6' && Math.abs(this.getTransform().b) > .001 && p?.length === 3) ((window as any).__arrowheads ??= []).push(p);
        return (fill as any).apply(this,args);
      };
    });
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8'));
    const floor = plan.floors[0];
    for (const key of ['walls','doors','windows','rooms','furniture']) floor[key] = [];
    const stair = { id: 's', position: { x: 100,y: 100 }, width: 200,depth: 300,rotation: 15,riserCount: 14,direction: 'up',stairType: kind };
    floor.stairs = [stair];
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export',exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON',exact: true }).click();
    await (await chooser).setFiles({ name: 'stair.json',mimeType: 'application/json',buffer: Buffer.from(JSON.stringify(plan)) });
    await expect(page.getByRole('button', { name: plan.name,exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save',exact: true }).press('l');
    await page.getByRole('button', { name: '🪜 Stair 1 (up)',exact: true }).click();
    const heads = () => page.evaluate(() => (window as any).__arrowheads);
    await expect.poll(async () => (await heads())?.length).toBe(kind === 'u-shaped' ? 2 : 1);
    const up = await heads();
    await page.getByRole('button', { name: 'Down ↓',exact: true }).click();
    await expect.poll(heads).not.toEqual(up);
    await page.getByRole('button', { name: 'Undo',exact: true }).click();
    await expect.poll(heads).toEqual(up);
    await page.getByRole('button', { name: 'Redo',exact: true }).click();
    await expect.poll(heads).not.toEqual(up);
    const tip = page.getByRole('button', { name: 'Got it',exact: true });
    if (await tip.isVisible()) await tip.click();
    await page.getByRole('button', { name: 'Save',exact: true }).press('l');
    await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter');
    await testInfo.attach(`stair-down-${kind}`, { body: await page.screenshot(),contentType: 'image/png' });
    await page.getByRole('button', { name: 'Export',exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON',exact: true }).click();
    const saved = JSON.parse(await readFile((await (await pending).path())!,'utf8')).floors[0];
    expect(saved.stairs).toEqual([{ ...stair,direction: 'down' }]);
  });
}
