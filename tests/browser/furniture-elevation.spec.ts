import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { savedProjects } from './storage';

// Issue #131: a wall-mounted TV can be raised above the floor from Properties.
async function exportedFurniture(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0].furniture;
}
async function selectTelevision(page: Page) {
  await page.getByRole('button', { name: 'Save', exact: true }).press('l');
  await page.getByRole('button', { name: '📺 Television', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Television Properties/ })).toBeVisible();
}

test('furniture height above floor edits with Undo/Redo, saves and survives reload', async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  await canvas.focus(); await canvas.press('/');
  const palette = page.getByRole('dialog', { name: 'Command Palette', exact: true });
  await palette.getByRole('combobox').fill('television');
  await expect(palette.locator('#command-result-f-television')).toBeVisible();
  await palette.getByRole('combobox').press('Enter');
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * .55, y: box.height * .6 } });
  await canvas.press('Escape');
  const placed = await exportedFurniture(page);
  expect(placed.at(-1)).toMatchObject({ catalogId: 'television' });
  expect(placed.at(-1)).not.toHaveProperty('elevation');

  await selectTelevision(page);
  const elevation = page.getByRole('spinbutton', { name: 'Height above floor (cm)', exact: true });
  await expect(elevation).toHaveValue('0');
  await elevation.fill('120.5'); await elevation.press('Tab');
  expect((await exportedFurniture(page)).at(-1).elevation).toBe(120.5);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(elevation).toHaveValue('0');
  expect((await exportedFurniture(page)).at(-1)).not.toHaveProperty('elevation');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(elevation).toHaveValue('120.5');

  // Invalid drafts never reach the plan; blur restores the saved value.
  await elevation.fill('-5'); await elevation.press('Tab');
  await expect(elevation).toHaveValue('120.5');

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(async () => Object.values(await savedProjects(page))
    .some(project => project.floors[0].furniture.some((item: any) => item.catalogId === 'television' && item.elevation === 120.5))).toBe(true);
  await page.reload();
  await selectTelevision(page);
  await expect(page.getByRole('spinbutton', { name: 'Height above floor (cm)', exact: true })).toHaveValue('120.5');
  expect((await exportedFurniture(page)).at(-1).elevation).toBe(120.5);

  // The raised item renders in 3D without errors.
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible({ timeout: 60_000 });
  expect(errors).toEqual([]);
});
