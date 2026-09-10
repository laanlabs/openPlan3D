import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) {
  test(`fit includes automatic dimension ink at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('o3d_settings', JSON.stringify({ showInternalDimensions: true, showExternalDimensions: true, dimensionLineColor: '#123abc' }));
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function(x, y, w, h) {
        if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') (window as any).__captionInk = {};
        return clear.call(this, x, y, w, h);
      };
      const fill = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
        const key = this.fillStyle === '#123abc' ? `wall-${text}-${x}` : this.fillStyle === '#b0b8c4' ? 'internal' : null;
        if (key && this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') {
          const m = this.measureText(text), t = this.getTransform(), b = this.canvas.getBoundingClientRect();
          const a = new DOMPoint(x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent).matrixTransform(t);
          const z = new DOMPoint(x + m.actualBoundingBoxRight, y + m.actualBoundingBoxDescent).matrixTransform(t);
          const ink = (window as any).__captionInk ??= {};
          ink[key] = { left: b.x + a.x * b.width / this.canvas.width, right: b.x + z.x * b.width / this.canvas.width,
            top: b.y + a.y * b.height / this.canvas.height, bottom: b.y + z.y * b.height / this.canvas.height };
        }
        if (maxWidth === undefined) return fill.call(this, text, x, y);
        return fill.call(this, text, x, y, maxWidth);
      };
    });
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
    const floor = plan.floors[0];
    floor.doors = []; floor.windows = []; floor.rooms = [];
    for (const wall of floor.walls) {
      wall.start.x += 1_000_000; wall.end.x += 1_000_000;
    }
    floor.walls.push({ ...floor.walls[0], id: 'distant-wall', start: { x: -1_000_000, y: 0 }, end: { x: -1_000_000, y: 100 }, curvePoint: { x: -1_000_050, y: 50 } });
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'captions.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
    await expect.poll(() => page.evaluate(() => {
      const ink = (window as any).__captionInk, canvas = document.querySelector('[aria-label="Floor plan editor canvas"]')!.getBoundingClientRect();
      return ink?.internal && Object.keys(ink).some(k => k.startsWith('wall-')) && Object.values(ink).every((p: any) => p.left > canvas.left + 24 && p.right < canvas.right - 24 && p.top > canvas.top + 24 && p.bottom < canvas.bottom - 24);
    })).toBe(true);
    await testInfo.attach(`automatic-dimension-fit-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    const zoomButton = page.getByRole('button', { name: 'Zoom to 100%', exact: true });
    const bothZoom = await zoomButton.textContent();
    await page.getByTitle('Layer Visibility', { exact: true }).press('Enter');
    await page.getByRole('checkbox', { name: 'Dimensions', exact: true }).uncheck();
    await page.getByTitle('Layer Visibility', { exact: true }).press('Enter');
    await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter');
    await expect(zoomButton).not.toHaveText(bothZoom!);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
    const saved = JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
    expect(saved.walls).toEqual(floor.walls);
  });
}
