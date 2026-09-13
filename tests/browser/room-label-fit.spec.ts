import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) {
  test(`fit includes the ink of an offset room label at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const fill = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
        if (text.startsWith('Kitchen & Dining (') && this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') {
          const m = this.measureText(text), t = this.getTransform(), b = this.canvas.getBoundingClientRect();
          const a = new DOMPoint(x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent).matrixTransform(t);
          const z = new DOMPoint(x + m.actualBoundingBoxRight, y + m.actualBoundingBoxDescent).matrixTransform(t);
          (window as any).__labelInk = { left: b.x + a.x * b.width / this.canvas.width, right: b.x + z.x * b.width / this.canvas.width,
            top: b.y + a.y * b.height / this.canvas.height, bottom: b.y + z.y * b.height / this.canvas.height };
        }
        if (maxWidth === undefined) return fill.call(this, text, x, y);
        return fill.call(this, text, x, y, maxWidth);
      };
    });
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
    if (width < 768) plan.floors[0].rooms[0].name = 'Kitchen & Dining (family gathering)';
    plan.floors[0].rooms[0].labelOffset = { x: 4000, y: -2000 };
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'room-label.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
    const ink = () => page.evaluate(() => (window as any).__labelInk);
    await expect.poll(async () => {
      const p = await ink(), canvas = await page.getByLabel('Floor plan editor canvas', { exact: true }).boundingBox();
      return p && canvas && p.left > canvas.x + 24 && p.right < canvas.x + canvas.width - 20 && p.top > canvas.y + 24 && p.bottom < canvas.y + canvas.height - 20;
    }).toBe(true);
    await testInfo.attach(`room-label-fit-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    await page.getByTitle('Layer Visibility', { exact: true }).press('Enter');
    await page.getByRole('checkbox', { name: 'Room Labels', exact: true }).uncheck();
    await page.getByTitle('Layer Visibility', { exact: true }).press('Enter');
    await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter');
    const hiddenZoom = await page.getByRole('button', { name: 'Zoom to 100%', exact: true }).textContent();
    await page.getByTitle('Layer Visibility', { exact: true }).press('Enter');
    await page.getByRole('checkbox', { name: 'Room Labels', exact: true }).check();
    await page.getByTitle('Layer Visibility', { exact: true }).press('Enter');
    await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter');
    await expect(page.getByRole('button', { name: 'Zoom to 100%', exact: true })).not.toHaveText(hiddenZoom!);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
    const saved = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
    expect(saved.floors[0].rooms[0].labelOffset).toEqual({ x: 4000, y: -2000 });
  });
}
