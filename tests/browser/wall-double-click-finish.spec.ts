import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Double-clicking to finish a wall chain must not stack a second wall on a single segment (issue #129):
// the extra wall hid behind doorways and windows and blocked the view through them in 3D.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door'])));
});

async function exportedWalls(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  const walls = JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0].walls as { start: { x: number; y: number }; end: { x: number; y: number } }[];
  await page.keyboard.press('Escape');
  return walls;
}

async function canvasPoints(page: Page) {
  const box = (await page.getByLabel('Floor plan editor canvas').boundingBox())!;
  const at = (dx: number, dy: number) => ({ x: box.x + box.width / 2 + dx, y: box.y + box.height / 2 + dy });
  return at;
}

test('double-clicking to finish a single wall adds one wall, not a second one on top', async ({ page }) => {
  await page.goto('/editor');
  const before = (await exportedWalls(page)).length;
  const at = await canvasPoints(page);
  const a = at(-150, 0), b = at(150, 0);
  await page.getByRole('button', { name: 'Save', exact: true }).press('w');
  await page.mouse.click(a.x, a.y);
  await page.mouse.dblclick(b.x, b.y);
  const walls = await exportedWalls(page);
  expect(walls).toHaveLength(before + 1);
});

test('double-clicking to finish a chain of two walls still closes the loop', async ({ page }) => {
  await page.goto('/editor');
  const before = (await exportedWalls(page)).length;
  const at = await canvasPoints(page);
  const a = at(-150, -100), b = at(150, -100), c = at(0, 120);
  await page.getByRole('button', { name: 'Save', exact: true }).press('w');
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
  await page.mouse.dblclick(c.x, c.y);
  const walls = await exportedWalls(page);
  expect(walls).toHaveLength(before + 3);
});

// A person's double-click arrives as two presses some frames apart. The first wall on an empty
// floor used to trigger the initial zoom-to-fit between them, so the second press landed elsewhere
// and added a stub wall plus a closing wall on top of the first one.
async function humanDoubleClick(page: Page, point: { x: number; y: number }) {
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ clickCount: 1 });
  await page.mouse.up({ clickCount: 1 });
  await page.waitForTimeout(120);
  await page.mouse.down({ clickCount: 2 });
  await page.mouse.up({ clickCount: 2 });
}

test('a human-paced double-click finishes the first wall on an empty floor without extra walls', async ({ page }) => {
  await page.goto('/editor');
  const before = (await exportedWalls(page)).length;
  const at = await canvasPoints(page);
  const a = at(-150, 0), b = at(150, 0);
  await page.getByRole('button', { name: 'Save', exact: true }).press('w');
  await page.mouse.click(a.x, a.y);
  await page.waitForTimeout(150);
  await humanDoubleClick(page, b);
  expect(await exportedWalls(page)).toHaveLength(before + 1);
});

test('clicking back on the start after one segment does not lay a wall over it', async ({ page }) => {
  await page.goto('/editor');
  const before = (await exportedWalls(page)).length;
  const at = await canvasPoints(page);
  const a = at(-150, 0), b = at(150, 0);
  await page.getByRole('button', { name: 'Save', exact: true }).press('w');
  await page.mouse.click(a.x, a.y);
  await page.waitForTimeout(400);
  await page.mouse.click(b.x, b.y);
  await page.waitForTimeout(400);
  await page.mouse.click(a.x, a.y);
  expect(await exportedWalls(page)).toHaveLength(before + 1);
});

test('finishing a straight run does not add a closing wall along it', async ({ page }) => {
  await page.goto('/editor');
  const before = (await exportedWalls(page)).length;
  const at = await canvasPoints(page);
  const a = at(-200, 0), m = at(0, 0), c = at(200, 0);
  await page.getByRole('button', { name: 'Save', exact: true }).press('w');
  await page.mouse.click(a.x, a.y);
  await page.waitForTimeout(400);
  await page.mouse.click(m.x, m.y);
  await page.waitForTimeout(400);
  await humanDoubleClick(page, c);
  expect(await exportedWalls(page)).toHaveLength(before + 2);
});

test('a double-tap with a little finger movement finishes a single wall', async ({ page }) => {
  await page.goto('/editor');
  const before = (await exportedWalls(page)).length;
  await page.getByRole('button', { name: 'Save', exact: true }).press('w');
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  await canvas.evaluate(async node => {
    const bounds = node.getBoundingClientRect();
    const cx = bounds.width / 2, cy = bounds.height / 2;
    function touch(type: string, points: number[][], changed = points) {
      const list = (points: number[][]) => points.map(([x, y], identifier) => ({ identifier, target: node, clientX: bounds.x + x, clientY: bounds.y + y }));
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, { touches: { value: list(points) }, changedTouches: { value: list(changed) } });
      node.dispatchEvent(event);
    }
    const tap = (x: number, y: number) => { touch('touchstart', [[x, y]]); touch('touchend', [], [[x, y]]); };
    const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    tap(cx - 150, cy); await pause(400);
    tap(cx + 150, cy); await pause(80);
    tap(cx + 170, cy + 8); // second tap of the double-tap, 20 px off
  });
  expect(await exportedWalls(page)).toHaveLength(before + 1);
});
