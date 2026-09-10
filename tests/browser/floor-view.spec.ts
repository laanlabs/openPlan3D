import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) {
  test(`floor switching frames new floors and restores camera at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const fill = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
        if (text.startsWith('QA floor ') && this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') {
          const p = new DOMPoint(x, y).matrixTransform(this.getTransform()), b = this.canvas.getBoundingClientRect();
          (window as any).__floorPoint = { text, x: b.x + p.x * b.width / this.canvas.width, y: b.y + p.y * b.height / this.canvas.height };
        }
        if (maxWidth === undefined) return fill.call(this, text, x, y);
        return fill.call(this, text, x, y, maxWidth);
      };
    });
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
    const base = plan.floors[0];
    base.walls = []; base.doors = []; base.windows = []; base.rooms = [];
    plan.floors = [0, 1].map(index => ({ ...structuredClone(base), id: `floor-${index}`, name: `Level ${index + 1}`, level: index,
      textAnnotations: [{ id: `note-${index}`, x: index ? -8000 : 4000, y: index ? 7000 : -3000, text: `QA floor ${index + 1}`, fontSize: 30, rotation: 0, color: '#123456' }],
    }));
    plan.activeFloorId = 'floor-0';
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'floors.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
    const point = () => page.evaluate(() => (window as any).__floorPoint);
    async function expectFramed(text: string) {
      await expect.poll(async () => { const p = await point(); return p?.text === text && p.x > 20 && p.x < width - 20 && p.y > 80 && p.y < 850; }).toBe(true);
    }
    async function selectFloor(index: number) {
      if (width < 1280) {
        await page.getByRole('button', { name: 'More actions', exact: true }).click();
        await page.getByRole('button', { name: `Level ${index + 1}`, exact: true }).click();
      } else await page.getByRole('combobox', { name: 'Current floor', exact: true }).selectOption(`floor-${index}`);
    }
    await expectFramed('QA floor 1');
    const initial = await point();
    await page.mouse.move(width / 2, 300); await page.mouse.down({ button: 'middle' });
    await page.mouse.move(width / 2 + 70, 330); await page.mouse.up({ button: 'middle' });
    await expect.poll(async () => (await point()).x - initial.x).toBeCloseTo(70, 0);
    const panned = await point();
    await selectFloor(1); await expectFramed('QA floor 2');
    await selectFloor(0);
    await expect.poll(async () => (await point()).text).toBe('QA floor 1');
    await expect.poll(async () => (await point()).x).toBeCloseTo(panned.x, 1);
    expect((await point()).y).toBeCloseTo(panned.y, 1);
    await selectFloor(1); await expectFramed('QA floor 2');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
    const saved = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
    expect(saved.floors).toEqual(plan.floors);
  });
}
