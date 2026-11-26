import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// A smaller item dropped where a larger one stands rests on its top; seating stays on the floor.
async function exportedFurniture(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0].furniture as { catalogId: string; elevation?: number }[];
}
async function place(page: Page, canvas: Locator, query: string, id: string, at: { x: number; y: number }) {
  await canvas.focus(); await canvas.press('/');
  const palette = page.getByRole('dialog', { name: 'Command Palette', exact: true });
  await palette.getByRole('combobox').fill(query);
  await expect(palette.locator(`#command-result-f-${id}`)).toBeVisible();
  await palette.locator(`#command-result-f-${id}`).click();
  await canvas.click({ position: at });
  await canvas.press('Escape');
}
const elevationOf = (furniture: { catalogId: string; elevation?: number }[], id: string) => furniture.find(item => item.catalogId === id)?.elevation;

test('a smaller item rests on a larger one when placed or dragged onto it, with Undo', async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  const box = (await canvas.boundingBox())!;
  const table = { x: box.width * .55, y: box.height * .6 };
  const aside = { x: box.width * .25, y: box.height * .3 };

  await place(page, canvas, 'dining table', 'dining_table', table);
  await place(page, canvas, 'table lamp', 'table_lamp', table);
  expect(elevationOf(await exportedFurniture(page), 'table_lamp')).toBe(75);
  await place(page, canvas, 'dining chair', 'dining_chair', table);
  expect(elevationOf(await exportedFurniture(page), 'dining_chair')).toBeUndefined();
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); // the chair
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); // the lamp and its lift, together
  expect((await exportedFurniture(page)).map(item => item.catalogId)).toEqual(['dining_table']);

  // Dragged onto the table, then off it again.
  await place(page, canvas, 'table lamp', 'table_lamp', aside);
  expect(elevationOf(await exportedFurniture(page), 'table_lamp')).toBeUndefined();
  const drag = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
    await page.mouse.move(box.x + from.x, box.y + from.y); await page.mouse.down();
    await page.mouse.move(box.x + (from.x + to.x) / 2, box.y + (from.y + to.y) / 2, { steps: 5 });
    await page.mouse.move(box.x + to.x, box.y + to.y, { steps: 5 }); await page.mouse.up();
  };
  await drag(aside, table);
  expect(elevationOf(await exportedFurniture(page), 'table_lamp')).toBe(75);
  // The raised lamp is drawn and picked above the table, so it can be dragged off again.
  await drag(table, aside);
  expect(elevationOf(await exportedFurniture(page), 'table_lamp')).toBeUndefined();
  expect(errors).toEqual([]);
});
