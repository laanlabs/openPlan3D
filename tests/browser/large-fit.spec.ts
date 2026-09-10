import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) {
  test(`large floor fits and zooms smoothly below ten percent at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const fill = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
        if ((text === 'Left' || text === 'Right') && this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') {
          const p = new DOMPoint(x, y).matrixTransform(this.getTransform()), b = this.canvas.getBoundingClientRect();
          const points = (window as any).__extentPoints ??= {};
          points[text] = { x: b.x + p.x * b.width / this.canvas.width, y: b.y + p.y * b.height / this.canvas.height };
        }
        if (maxWidth === undefined) return fill.call(this, text, x, y);
        return fill.call(this, text, x, y, maxWidth);
      };
    });
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
    const floor = plan.floors[0];
    floor.walls = []; floor.doors = []; floor.windows = []; floor.rooms = [];
    floor.textAnnotations = [-1, 1].map(sign => ({ id: `note-${sign}`, x: sign * 1_000_000, y: 0, text: sign < 0 ? 'Left' : 'Right', fontSize: 20, rotation: 0, color: '#123456' }));
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'large.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
    const span = () => page.evaluate(() => { const p = (window as any).__extentPoints; return p?.Right?.x - p?.Left?.x; });
    await expect.poll(async () => { const s = await span(); return s > 50 && s < width - 40; }).toBe(true);
    await expect(page.getByRole('button', { name: 'Zoom to 100%', exact: true })).not.toHaveText('0%');
    const edges = await page.evaluate(() => (window as any).__extentPoints);
    expect(edges.Left.x).toBeGreaterThan(36);
    expect(edges.Right.x).toBeLessThan(width - 36);
    const initial = await span();
    await testInfo.attach(`large-fit-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
    await expect.poll(async () => (await span()) / initial).toBeCloseTo(.8, 2);
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect.poll(async () => (await span()) / initial).toBeCloseTo(1, 2);
    const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
    const bounds = (await canvas.boundingBox())!;
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.wheel(0, 100);
    await expect.poll(async () => (await span()) / initial).toBeCloseTo(.9, 2);
    await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter');
    await expect.poll(async () => (await span()) / initial).toBeCloseTo(1, 2);
    if (width < 768) {
      await page.getByRole('button', { name: 'More actions', exact: true }).click();
      await page.getByRole('button', { name: 'Zoom Out', exact: true }).click();
      await expect.poll(async () => (await span()) / initial).toBeCloseTo(.8, 2);
      await page.getByRole('button', { name: 'Zoom In', exact: true }).click();
      await expect.poll(async () => (await span()) / initial).toBeCloseTo(1, 2);
      await page.getByRole('button', { name: 'More actions', exact: true }).click();
    }
    for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
    await expect.poll(async () => (await span()) / initial).toBeCloseTo(.25, 2);
  });
}
