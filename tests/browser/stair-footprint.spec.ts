import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const width of [1440, 390]) for (const kind of ['l-shaped', 'u-shaped']) {
  test(`${kind} outer region is framed and selectable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function(x,y,w,h) {
        if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') (window as any).__stairRects = [];
        return clear.call(this,x,y,w,h);
      };
      const fill = CanvasRenderingContext2D.prototype.fillRect;
      CanvasRenderingContext2D.prototype.fillRect = function(x,y,w,h) {
        if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas' && /^#e5e7eb80$|^rgba\(229,\s*231,\s*235,/.test(String(this.fillStyle))) {
          const t = this.getTransform(), box = this.canvas.getBoundingClientRect();
          const pts = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([a,b]) => new DOMPoint(a,b).matrixTransform(t));
          const points = pts.map(p => ({ x: box.x+p.x*box.width/this.canvas.width, y: box.y+p.y*box.height/this.canvas.height }));
          ((window as any).__stairRects ??= []).push(points);
        }
        return fill.call(this,x,y,w,h);
      };
    });
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8'));
    const floor = plan.floors[0];
    for (const key of ['walls','doors','windows','rooms','furniture']) floor[key] = [];
    floor.stairs = [{ id: 's', position: { x: 9000, y: -8000 }, width: 100, depth: 900, rotation: 30, stairType: kind, riserCount: 14, direction: 'up' }];
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'stairs.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
    await expect.poll(() => page.evaluate(() => {
      const rects = (window as any).__stairRects, b = document.querySelector('[aria-label="Floor plan editor canvas"]')!.getBoundingClientRect();
      return { count: rects?.length, inside: rects?.flat().every((p: any) => p.x > b.left+24 && p.x < b.right-24 && p.y > b.top+24 && p.y < b.bottom-24) };
    })).toEqual({ count: 3, inside: true });
    const tip = page.getByRole('button', { name: 'Got it', exact: true });
    if (await tip.isVisible()) await tip.click();
    const target = await page.evaluate(() => {
      const r = (window as any).__stairRects[2];
      return { x: (r[0].x+r[2].x)/2, y: (r[0].y+r[2].y)/2 };
    });
    await page.mouse.click(target.x,target.y);
    await expect(page.getByRole('spinbutton', { name: 'Width (cm)', exact: true })).toHaveValue('100');
    await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter');
    await testInfo.attach(`stair-footprint-${kind}-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
  });
}
