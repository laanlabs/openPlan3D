import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Floors can be renamed, and a floor can be added under the lowest one (a basement).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-3d', 'first-export'])));
});

async function exportJSON(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}

test('renames the current floor inline and adds a basement below it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  const switcher = page.getByRole('combobox', { name: 'Current floor', exact: true });
  await expect(switcher.locator('option')).toHaveText(['Ground Floor']);

  // Escape cancels; Enter commits.
  await page.getByRole('button', { name: 'Rename floor', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Floor name', exact: true });
  await field.fill('Nope');
  await field.press('Escape');
  await expect(switcher.locator('option')).toHaveText(['Ground Floor']);
  await page.getByRole('button', { name: 'Rename floor', exact: true }).click();
  await field.fill('  Main level ');
  await field.press('Enter');
  await expect(switcher.locator('option')).toHaveText(['Main level']);

  // A floor below goes under the lowest floor and becomes the current one.
  await page.getByRole('button', { name: 'Add Floor', exact: true }).click();
  await page.getByRole('button', { name: 'Add Floor Below: Empty floor', exact: true }).click();
  await expect(switcher.locator('option')).toHaveText(['Basement', 'Main level']);
  await expect(switcher.locator('option:checked')).toHaveText('Basement');
  await page.getByRole('button', { name: 'Add Floor', exact: true }).click();
  await page.getByRole('button', { name: 'Exterior walls — current footprint', exact: true }).click();
  await expect(switcher.locator('option')).toHaveText(['Basement', 'Main level', 'Floor 1']);

  const plan = await exportJSON(page);
  expect(plan.floors.map((f: any) => [f.name, f.level])).toEqual([['Main level', 0], ['Basement', -1], ['Floor 1', 1]]);

  // One Undo removes the last floor; the rename stays until its own step is undone.
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(switcher.locator('option')).toHaveText(['Main level']);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(switcher.locator('option')).toHaveText(['Ground Floor']);
  expect(errors).toEqual([]);
});

test('the phone overflow menu renames the floor and adds one below', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/editor');
  const more = page.getByRole('button', { name: 'More actions', exact: true });
  await more.click();
  await page.getByRole('button', { name: 'Rename floor', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Floor name', exact: true });
  await field.fill('Upstairs');
  await field.press('Enter');
  await more.click();
  await expect(page.getByRole('button', { name: /^Upstairs/ })).toBeVisible();
  await page.getByRole('button', { name: /^\+ Add Floor Below \(empty\)$/ }).click();
  await more.click();
  await expect(page.locator('[data-popup="menu"]').getByRole('button', { name: /^(Basement|Upstairs)/ })).toHaveText(['Basement ✓', 'Upstairs']);
});
