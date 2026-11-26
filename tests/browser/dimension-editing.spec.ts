import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Issue #157: a placed measurement or dimension could be selected, but nothing on screen could
// change or remove it, and a right-click on it opened the menu of the room underneath.

type Spot = { x: number; y: number };

async function openPlan(page: Page, width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door']));
    // Record where the plan canvas draws each label, in page coordinates.
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') {
        const box = this.canvas.getBoundingClientRect();
        // A measurement's label sits 6px above its line; the other labels sit on their own spot.
        const point = new DOMPoint(x, y + (this.font.startsWith('bold 12px') ? 6 : 0)).matrixTransform(this.getTransform());
        ((window as any).__labels ??= {})[text] = { x: box.x + point.x * box.width / this.canvas.width, y: box.y + point.y * box.height / this.canvas.height };
      }
      return maxWidth === undefined ? fill.call(this, text, x, y) : fill.call(this, text, x, y, maxWidth);
    };
  });
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8')), floor = plan.floors[0];
  // The fixture's room spans 0…600 × 0…400 cm; everything below lies inside it.
  floor.measurements = [{ id: 'measure', x1: 150, y1: 150, x2: 350, y2: 150 }];
  floor.annotations = [{ id: 'dimension', x1: 150, y1: 250, x2: 350, y2: 250, offset: 40, label: 'Span' }];
  floor.textAnnotations = [{ id: 'note', x: 450, y: 330, text: 'Pantry', fontSize: 16, rotation: 0, color: '#123456' }];
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'dimensions.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  await expect(page.getByRole('button', { name: plan.name, exact: true })).toBeVisible();
  // The plan draws once where it was imported and is fitted to the canvas a frame later. Wait for
  // the fitted view, which puts the middle of the room in the middle of the canvas.
  await expect.poll(() => page.evaluate(() => {
    const labels = (window as any).__labels ?? {}, measure = labels['2 m'], span = labels['Span'];
    if (!measure || !span || !labels['Pantry']) return false;
    const box = document.querySelector('canvas[aria-label="Floor plan editor canvas"]')!.getBoundingClientRect();
    const scale = (span.y - measure.y) / 140, middle = { x: measure.x + 50 * scale, y: measure.y + 50 * scale };
    return Math.abs(middle.x - (box.x + box.width / 2)) < 20 && Math.abs(middle.y - (box.y + box.height / 2)) < 20;
  })).toBe(true);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

  const label = (text: string) => page.evaluate(name => (window as any).__labels[name] as Spot, text);
  const measure = await label('2 m'), span = await label('Span');
  // The measurement's line is at y = 150 cm and the dimension's line at 250 + 40 cm.
  const scale = (span.y - measure.y) / 140;
  const at = (x: number, y: number): Spot => ({ x: measure.x + (x - 250) * scale, y: measure.y + (y - 150) * scale });

  async function exported() {
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  async function drag(from: Spot, to: Spot) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
  }
  const click = (spot: Spot, options?: Parameters<Page['mouse']['click']>[2]) => page.mouse.click(spot.x, spot.y, options);
  return { floor, at, exported, drag, click };
}

const near = (line: Record<string, number>, expected: Record<string, number>) => {
  for (const [key, value] of Object.entries(expected)) expect(Math.abs(line[key] - value), `${key} = ${line[key]}`).toBeLessThanOrEqual(2);
};

test('a measurement can be re-measured, moved and deleted', async ({ page }) => {
  test.setTimeout(120_000);
  const { floor, at, exported, drag, click } = await openPlan(page);
  const before = await exported();
  const toolbar = page.getByRole('toolbar', { name: 'Measurement', exact: true });
  const undo = page.getByRole('button', { name: 'Undo', exact: true });

  await expect(toolbar).toBeHidden();
  await click(at(250, 150));
  await expect(toolbar.getByRole('button', { name: 'Delete', exact: true })).toBeVisible();

  // Drag the right-hand end: the measurement now runs to the new point, as one Undo step.
  await drag(at(350, 150), at(450, 200));
  near((await exported()).measurements[0], { x1: 150, y1: 150, x2: 450, y2: 200 });
  await undo.click();
  expect((await exported()).measurements).toEqual(before.measurements);

  // Drag the line itself: both ends move together.
  await click(at(250, 150));
  await drag(at(250, 150), at(300, 200));
  near((await exported()).measurements[0], { x1: 200, y1: 200, x2: 400, y2: 200 });
  await undo.click();
  expect((await exported()).measurements).toEqual(before.measurements);

  // A right-click offers to delete the measurement, not the room it lies in.
  await click(at(250, 150), { button: 'right' });
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem')).toHaveText([/Delete$/]);
  await expect(page.getByRole('heading', { name: 'Room Properties' })).toBeHidden();
  await menu.getByRole('menuitem', { name: 'Delete' }).click();
  const deleted = await exported();
  expect(deleted.measurements).toEqual([]);
  expect(deleted.walls).toEqual(before.walls);
  expect(deleted.rooms).toEqual(before.rooms);
  await expect(toolbar).toBeHidden();
  await undo.click();
  expect((await exported()).measurements).toEqual(floor.measurements);

  // The keyboard menu of a selected measurement is the same one.
  await click(at(250, 150));
  await page.getByLabel('Floor plan editor canvas').press('Shift+F10');
  await expect(menu.getByRole('menuitem')).toHaveText([/Delete$/]);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);

  // The toolbar's Delete removes it too, with no keyboard.
  await toolbar.getByRole('button', { name: 'Delete', exact: true }).click();
  expect((await exported()).measurements).toEqual([]);
  await expect(toolbar).toBeHidden();

  // A text note's right-click menu is its own as well.
  await click(at(450, 330), { button: 'right' });
  await expect(menu.getByRole('menuitem')).toHaveText([/Properties$/, /Delete$/]);
  await menu.getByRole('menuitem', { name: 'Delete' }).click();
  const withoutNote = await exported();
  expect(withoutNote.textAnnotations).toEqual([]);
  expect(withoutNote.rooms).toEqual(before.rooms);
});

test('a dimension can be relabelled, moved off the wall, re-measured and deleted', async ({ page }) => {
  test.setTimeout(120_000);
  const { at, exported, drag, click } = await openPlan(page);
  const before = await exported();
  const toolbar = page.getByRole('toolbar', { name: 'Dimension', exact: true });
  const field = page.getByLabel('Dimension label (optional)');

  await click(at(250, 290));
  await toolbar.getByRole('button', { name: 'Edit Label', exact: true }).click();
  await expect(field).toHaveValue('Span');
  await field.fill('Clear span');
  await field.press('Enter');
  expect((await exported()).annotations[0]).toEqual({ ...before.annotations[0], label: 'Clear span' });

  // Double-click opens the same field; an emptied label shows the measured distance again.
  await page.mouse.dblclick(at(250, 290).x, at(250, 290).y);
  await expect(field).toHaveValue('Clear span');
  await field.fill('');
  await field.press('Enter');
  expect((await exported()).annotations[0].label).toBeUndefined();

  // Escape leaves the label alone.
  await page.mouse.dblclick(at(250, 290).x, at(250, 290).y);
  await field.fill('Discarded');
  await field.press('Escape');
  await expect(field).toBeHidden();
  expect((await exported()).annotations[0].label).toBeUndefined();

  // Drag the dimension line: only its distance from the measured points changes.
  await click(at(250, 290));
  await drag(at(250, 290), at(250, 320));
  const moved = (await exported()).annotations[0];
  near(moved, { x1: 150, y1: 250, x2: 350, y2: 250, offset: 70 });

  // Drag the end handle at a measured point.
  await drag(at(350, 250), at(450, 250));
  near((await exported()).annotations[0], { x1: 150, y1: 250, x2: 450, y2: 250, offset: 70 });

  await click(at(250, 320), { button: 'right' });
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem')).toHaveText([/Edit Label$/, /Delete$/]);
  await menu.getByRole('menuitem', { name: 'Delete' }).click();
  const deleted = await exported();
  expect(deleted.annotations).toEqual([]);
  expect(deleted.rooms).toEqual(before.rooms);
  expect(deleted.measurements).toEqual(before.measurements);
});

test('a measurement can be deleted on a phone-sized screen', async ({ page }) => {
  test.setTimeout(120_000);
  const { at, exported, click } = await openPlan(page, 390);
  await click(at(250, 150));
  await page.getByRole('toolbar', { name: 'Measurement', exact: true }).getByRole('button', { name: 'Delete', exact: true }).click();
  expect((await exported()).measurements).toEqual([]);
  await click(at(250, 290));
  await page.getByRole('toolbar', { name: 'Dimension', exact: true }).getByRole('button', { name: 'Delete', exact: true }).click();
  expect((await exported()).annotations).toEqual([]);
});
