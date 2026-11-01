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
