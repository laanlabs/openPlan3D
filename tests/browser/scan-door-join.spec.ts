import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Issue #103: two scans added to one plan are snapped together at the door they share.
const fixturePath = resolve('tests/fixtures/handoff-roomplan.json');
type Point = { x: number; y: number };

async function addScanToPlan(page: Page) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import RoomPlan iOS LiDAR scan/ }).click();
  await (await chooser).setFiles(fixturePath);
  const dialog = page.getByRole('dialog', { name: 'Import RoomPlan', exact: true });
  await dialog.getByRole('radio', { name: /Add to this plan/ }).check();
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

async function exportJSON(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}

/** Screen anchors of the two "QA Kitchen" room labels, left to right, once two consecutive frames agree. */
async function roomLabels(page: Page): Promise<Point[]> {
  const read = async () => {
    await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
    const labels: Point[] = await page.evaluate(() => (window as any).__roomLabels);
    return [...labels].sort((a, b) => a.x - b.x);
  };
  let previous = await read();
  for (let attempt = 0; attempt < 20; attempt++) {
    const current = await read();
    if (current.length === 2 && JSON.stringify(current) === JSON.stringify(previous)) return current;
    previous = current;
  }
  throw new Error(`room labels did not settle: ${JSON.stringify(previous)}`);
}

const wallOf = (floor: any, item: { wallId: string }) => floor.walls.find((w: any) => w.id === item.wallId);
const length = (w: any) => Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
const direction = (w: any): Point => ({ x: (w.end.x - w.start.x) / length(w), y: (w.end.y - w.start.y) / length(w) });
const doorCentre = (floor: any, door: any): Point => {
  const w = wallOf(floor, door);
  return { x: w.start.x + (w.end.x - w.start.x) * door.position, y: w.start.y + (w.end.y - w.start.y) * door.position };
};
const centroid = (floor: any, room: any): Point => {
  const ends = floor.walls.filter((w: any) => room.walls.includes(w.id)).flatMap((w: any) => [w.start, w.end]);
  return { x: ends.reduce((s: number, p: Point) => s + p.x, 0) / ends.length, y: ends.reduce((s: number, p: Point) => s + p.y, 0) / ends.length };
};

test('joining a door of the second scan to one of the first snaps the scan onto the far side of that wall, one Undo away', async ({ page }) => {
  await page.addInitScript(() => {
    const fill = CanvasRenderingContext2D.prototype.fillText, clear = CanvasRenderingContext2D.prototype.clearRect;
    (window as any).__roomLabels = [];
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') (window as any).__roomLabels = [];
      return clear.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas' && text.startsWith('QA Kitchen')) {
        const p = new DOMPoint(x, y).matrixTransform(this.getTransform()), bounds = this.canvas.getBoundingClientRect();
        (window as any).__roomLabels.push({ x: bounds.x + p.x * bounds.width / this.canvas.width, y: bounds.y + p.y * bounds.height / this.canvas.height });
      }
      return maxWidth === undefined ? fill.call(this, text, x, y) : fill.call(this, text, x, y, maxWidth);
    };
  });
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const onGround = (key: string) => fixture[key].filter((item: any) => (item.story ?? 0) === 0).length;
  const groundWalls = onGround('walls'), selectable = ['walls', 'doors', 'windows', 'objects'].reduce((n, key) => n + onGround(key), 0);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  const status = page.getByRole('application');
  await expect(status).toContainText('0 walls');
  await addScanToPlan(page);
  await expect(status).toContainText(`${groundWalls} walls`);
  await addScanToPlan(page);
  await expect(status).toContainText(`${groundWalls * 2} walls`);
  await expect(status.getByText(`${selectable} selected`, { exact: true })).toBeVisible();

  const before = await exportJSON(page), floor = before.floors[0];
  const [first, second] = floor.rooms;
  const doorsOf = (room: any) => floor.doors.filter((d: any) => room.walls.includes(d.wallId));
  // The second scan sits to the right of the first: join its left-hand door to the first scan's right-hand door.
  const target = doorsOf(first).reduce((best: any, d: any) => doorCentre(floor, d).x > doorCentre(floor, best).x ? d : best);
  const moving = doorsOf(second).reduce((best: any, d: any) => doorCentre(floor, d).x < doorCentre(floor, best).x ? d : best);
  const sibling = doorsOf(second).find((d: any) => d !== moving);
  // Map plan centimetres to screen pixels from where the two room labels are drawn.
  await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter');
  const onScreen = async (p: Point) => {
    const [a, b] = await roomLabels(page), ca = centroid(floor, first), cb = centroid(floor, second);
    const zoom = (b.x - a.x) / (cb.x - ca.x);
    return { x: a.x + (p.x - ca.x) * zoom, y: a.y + (p.y - ca.y) * zoom };
  };

  const movingAt = await onScreen(doorCentre(floor, moving));
  await page.mouse.click(movingAt.x, movingAt.y, { button: 'right' });
  await page.getByRole('menuitem', { name: /Join to another door/ }).click();
  const hint = page.getByText('Click the door this one meets in the other room. Esc cancels.', { exact: true });
  await expect(hint).toBeVisible();
  // A door of the same room is refused and the mode goes on.
  const siblingAt = await onScreen(doorCentre(floor, sibling));
  await page.mouse.click(siblingAt.x, siblingAt.y);
  const refused = page.getByText('Pick a door that belongs to another room.', { exact: true });
  await expect(refused).toBeVisible();
  const targetAt = await onScreen(doorCentre(floor, target));
  await page.mouse.click(targetAt.x, targetAt.y);
  await expect(refused).toHaveCount(0);
  await expect(hint).toHaveCount(0);
  await expect(status.getByText(`${selectable} selected`, { exact: true })).toBeVisible();

  const after = await exportJSON(page), joined = after.floors[0];
  // The first scan, every opening's fraction and the room records are untouched.
  expect(joined.walls.slice(0, groundWalls)).toEqual(floor.walls.slice(0, groundWalls));
  expect(joined.doors).toEqual(floor.doors);
  expect(joined.windows).toEqual(floor.windows);
  expect(joined.rooms).toEqual(floor.rooms);
  expect(joined.furniture[0]).toEqual(floor.furniture[0]);
  // The second scan moved as one piece.
  for (const wall of floor.walls.slice(groundWalls)) {
    const moved = joined.walls.find((w: any) => w.id === wall.id);
    expect(length(moved)).toBeCloseTo(length(wall), 6);
    expect(moved.thickness).toBe(wall.thickness);
  }
  // Its door sits one wall thickness from the first scan's door, outside that room, with the walls running along each other.
  const targetWall = wallOf(joined, target), along = direction(targetWall), cT = doorCentre(joined, target), cM = doorCentre(joined, moving);
  const inside = centroid(joined, first);
  let outward = { x: -along.y, y: along.x };
  if ((inside.x - cT.x) * outward.x + (inside.y - cT.y) * outward.y > 0) outward = { x: -outward.x, y: -outward.y };
  const gap = (wallOf(floor, moving).thickness + targetWall.thickness) / 2;
  expect(cM.x - cT.x).toBeCloseTo(outward.x * gap, 6);
  expect(cM.y - cT.y).toBeCloseTo(outward.y * gap, 6);
  const movingAlong = direction(wallOf(joined, moving));
  expect(Math.abs(movingAlong.x * along.x + movingAlong.y * along.y)).toBeCloseTo(1, 6);
  const far = centroid(joined, second);
  expect((far.x - cT.x) * outward.x + (far.y - cT.y) * outward.y).toBeGreaterThan(gap);
  // The chair kept its place in its room.
  const chairBefore = floor.furniture[1], chairAfter = joined.furniture[1], cMBefore = doorCentre(floor, moving);
  expect(Math.hypot(chairAfter.position.x - cM.x, chairAfter.position.y - cM.y)).toBeCloseTo(Math.hypot(chairBefore.position.x - cMBefore.x, chairBefore.position.y - cMBefore.y), 6);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await exportJSON(page)).floors).toEqual(before.floors);
  expect(errors).toEqual([]);
});
