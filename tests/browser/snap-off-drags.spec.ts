import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// With the top-bar Snap to Grid switch off nothing rounds to the snap step or jumps to a magnet: a
// straight wall's middle handle, a detected room and a multi-selection move by the pointer's own
// travel, and a new wall starts where it is clicked, not on a nearby wall end. The travel of
// (37, 13) cm is far from the 25 cm steps it would otherwise round to.
const travel = { x: 37, y: 13 };

async function openPlanWithSnappingOff(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door']));
    // Record where the two reference notes are painted, to turn plan centimetres into screen pixels.
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
      if ((text === 'Map A' || text === 'Map B') && this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') {
        const p = new DOMPoint(x, y).matrixTransform(this.getTransform()), b = this.canvas.getBoundingClientRect();
        if (text === 'Map B') (window as any).__mapFrame = ((window as any).__mapFrame ?? 0) + 1;
        ((window as any).__map ??= {})[text] = { x: b.x + p.x * b.width / this.canvas.width, y: b.y + p.y * b.height / this.canvas.height, width: b.width };
      }
      if (maxWidth === undefined) return fill.call(this, text, x, y);
      return fill.call(this, text, x, y, maxWidth);
    };
  });
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  const floor = plan.floors[0]; floor.doors = []; floor.windows = [];
  floor.textAnnotations = [
    { id: 'a', text: 'Map A', x: -500, y: -500, fontSize: 10, rotation: 0, color: '#555555' },
    { id: 'b', text: 'Map B', x: 500, y: -500, fontSize: 10, rotation: 0, color: '#555555' },
  ];
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'snap-off.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  await expect(page.getByRole('button', { name: plan.name, exact: true })).toBeVisible();
  const snapping = page.getByRole('button', { name: 'Snap to Grid', exact: true });
  await snapping.click();
  await expect(snapping).toHaveAttribute('aria-pressed', 'false');
  return floor;
}

/** Fit the plan, then map plan centimetres to screen pixels from where the reference notes are painted. */
async function fitAndMap(page: Page) {
  const frame = await page.evaluate(() => (window as any).__mapFrame ?? 0);
  await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__mapFrame ?? 0)).toBeGreaterThan(frame);
  // Panel changes can queue a resize after the first fit frame; use the settled transform.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect.poll(() => page.evaluate(() => {
    const m = (window as any).__map, b = document.querySelector('[aria-label="Floor plan editor canvas"]')!.getBoundingClientRect();
    return m?.['Map A']?.width === b.width && m?.['Map B']?.width === b.width;
  })).toBe(true);
  const { origin, zoom } = await page.evaluate(() => {
    const a = (window as any).__map['Map A'], b = (window as any).__map['Map B'];
    return { origin: { x: a.x, y: a.y }, zoom: (b.x - a.x) / 1000 };
  });
  return { zoom, at: (x: number, y: number) => ({ x: origin.x + (x + 500) * zoom, y: origin.y + (y + 500) * zoom }) };
}

async function exported(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
}

for (const kind of ['parallel', 'room', 'selection'] as const) {
  test(`with Snap to Grid off, a ${kind} drag moves by the pointer's travel instead of 25 cm steps`, async ({ page }) => {
    test.setTimeout(90_000);
    await openPlanWithSnappingOff(page);
    const save = page.getByRole('button', { name: 'Save', exact: true });
    // The parallel move drags Wall 1's middle handle; the room and the selection are dragged from
    // inside the room, clear of its label and of the status bar and mini-map in the lower corner.
    const from = kind === 'parallel' ? { x: 300.25, y: 0 } : { x: 100, y: 100 };
    if (kind === 'parallel') {
      await save.press('l');
      await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
      await save.press('l');
    } else if (kind === 'selection') {
      await save.press('ControlOrMeta+a');
    } else {
      // Select the room first so its panel has opened before the drag measures the canvas.
      const point = (await fitAndMap(page)).at(from.x, from.y);
      await page.mouse.click(point.x, point.y);
    }
    const { zoom, at } = await fitAndMap(page);
    const start = at(from.x, from.y), end = at(from.x + travel.x, from.y + travel.y);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 6 });
    await page.mouse.up();
    // Wall 1 starts at (0, 0) in the fixture, and each drag moves it rigidly.
    const wall = (await exported(page)).walls.find((item: { id: string }) => item.id === 'qa-wall-0');
    // Pointer events land on whole pixels, so allow two pixels of rounding.
    expect(Math.abs(wall.start.x - travel.x)).toBeLessThan(2 / zoom);
    expect(Math.abs(wall.start.y - travel.y)).toBeLessThan(2 / zoom);
  });
}

test('with Snap to Grid off, a new wall starts where it is clicked, not on a nearby wall end', async ({ page }) => {
  test.setTimeout(90_000);
  const floor = await openPlanWithSnappingOff(page);
  const { zoom, at } = await fitAndMap(page);
  // About 8 px from the wall ends at (0, 0): inside the magnet's 15 px reach.
  const offset = 6 / zoom, target = { x: offset, y: offset };
  await page.getByRole('button', { name: 'Save', exact: true }).press('w');
  const first = at(target.x, target.y), second = at(200, 150);
  await page.mouse.click(first.x, first.y);
  await page.mouse.click(second.x, second.y);
  await page.keyboard.press('Escape');
  const added = (await exported(page)).walls.find((item: { id: string }) => !floor.walls.some((wall: { id: string }) => wall.id === item.id));
  expect(added).toBeTruthy();
  expect(Math.abs(added.start.x - target.x)).toBeLessThan(2 / zoom);
  expect(Math.abs(added.start.y - target.y)).toBeLessThan(2 / zoom);
});
