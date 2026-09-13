import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) {
  test(`fit includes measurement and dimension caption ink at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const fill = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
        const key = text === 'Boundary dimension caption' ? 'dimension' : this.fillStyle === '#ef4444' && this.font === 'bold 12px sans-serif' ? 'measurement' : null;
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
    floor.walls = []; floor.doors = []; floor.windows = []; floor.rooms = [];
    floor.measurements = [{ id: 'measurement', x1: -1_000_000, y1: -50, x2: -1_000_000, y2: 50 }];
    floor.annotations = [{ id: 'dimension', x1: 1_000_000, y1: -50, x2: 1_000_000, y2: 50, offset: 0, label: 'Boundary dimension caption' }];
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'captions.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
    await expect.poll(() => page.evaluate(() => {
      const ink = (window as any).__captionInk, canvas = document.querySelector('[aria-label="Floor plan editor canvas"]')!.getBoundingClientRect();
      return ink?.dimension && ink?.measurement && Object.values(ink).every((p: any) => p.left > canvas.left + 24 && p.right < canvas.right - 24 && p.top > canvas.top + 24 && p.bottom < canvas.bottom - 24);
    })).toBe(true);
    await testInfo.attach(`caption-fit-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    const zoomButton = page.getByRole('button', { name: 'Zoom to 100%', exact: true });
    const bothZoom = await zoomButton.textContent();
    await page.getByTitle('Layer Visibility', { exact: true }).press('Enter');
    await page.getByRole('checkbox', { name: 'Measurements', exact: true }).uncheck();
    await page.getByTitle('Layer Visibility', { exact: true }).press('Enter');
    await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter');
    await expect(zoomButton).not.toHaveText(bothZoom!);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
    const saved = JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
    expect(saved.measurements).toEqual(floor.measurements); expect(saved.annotations).toEqual(floor.annotations);
  });
}
