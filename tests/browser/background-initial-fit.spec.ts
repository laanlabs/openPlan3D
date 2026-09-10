import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) {
  test(`initial framing waits for tracing-image dimensions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function(...args: any[]) {
        if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas' && args[0] instanceof HTMLImageElement && args[0].src.startsWith('data:image/png')) {
          const p = new DOMPoint(0, 0).matrixTransform(this.getTransform()), b = this.canvas.getBoundingClientRect();
          (window as any).__imageCenter = { x: b.x + p.x * b.width / this.canvas.width, y: b.y + p.y * b.height / this.canvas.height };
        }
        return (draw as any).apply(this, args);
      };
    });
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
    const floor = plan.floors[0];
    floor.walls = []; floor.doors = []; floor.windows = []; floor.rooms = [];
    floor.backgroundImage = { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8ioAAAAASUVORK5CYII=', position: { x: 4000, y: -3000 }, scale: 200, opacity: .5, rotation: 45, locked: true };
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'background.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
    await expect.poll(() => page.evaluate(() => {
      const p = (window as any).__imageCenter;
      const sheet = document.querySelector('[data-plan-properties]')!.getBoundingClientRect();
      return !!p && p.x > 20 && p.x < window.innerWidth - 20 && p.y > 80
        && p.y < (window.innerWidth < 768 ? sheet.top : 850);
    })).toBe(true);
  });
}
