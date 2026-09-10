import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function exportFloor(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
}

for (const width of [1440, 390]) {
  test(`initial framing selects a distant note on a wall-free floor at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const fill = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
        if (text === 'QA note' && this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') {
          const p = new DOMPoint(x, y).matrixTransform(this.getTransform()), b = this.canvas.getBoundingClientRect();
          (window as any).__notePoint = { x: b.x + p.x * b.width / this.canvas.width, y: b.y + p.y * b.height / this.canvas.height };
        }
        if (maxWidth === undefined) return fill.call(this, text, x, y);
        return fill.call(this, text, x, y, maxWidth);
      };
    });
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
    const floor = plan.floors[0];
    floor.walls = []; floor.doors = []; floor.windows = []; floor.rooms = [];
    floor.textAnnotations = [{ id: 'note', x: 4000.125, y: -3000.125, text: 'QA note', fontSize: 40, rotation: 20, color: '#123456' }];
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'drafts.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
    await expect.poll(() => page.evaluate(() => !!(window as any).__notePoint)).toBe(true);
    await expect.poll(() => page.evaluate(() => {
      const p = (window as any).__notePoint;
      return p && p.x > 20 && p.x < window.innerWidth - 20 && p.y > 80 && p.y < 850;
    })).toBe(true);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const point = await page.evaluate(() => (window as any).__notePoint);
    expect(point.x).toBeGreaterThan(20); expect(point.x).toBeLessThan(width - 20);
    expect(point.y).toBeGreaterThan(80); expect(point.y).toBeLessThan(850);
    await page.mouse.click(point.x, point.y);
    await expect(page.getByRole('spinbutton', { name: 'X', exact: true })).toHaveValue('4000.125');
    expect((await exportFloor(page)).textAnnotations).toEqual(floor.textAnnotations);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    const beforeEdit = await page.evaluate(() => (window as any).__notePoint.x);
    const xInput = page.getByRole('spinbutton', { name: 'X', exact: true });
    await xInput.fill('4100.125'); await xInput.press('Tab');
    await expect.poll(() => page.evaluate(() => (window as any).__notePoint.x)).toBeGreaterThan(beforeEdit + 20);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await exportFloor(page)).textAnnotations).toEqual(floor.textAnnotations);
  });
}
