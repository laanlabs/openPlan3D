import { expect, test } from '@playwright/test';

test('clicking the project name sends typing to the rename field; Escape keeps the name, Enter renames', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  const name = page.getByTitle('Click to rename', { exact: true });
  await expect(name).toHaveText(/\S/);
  const original = (await name.textContent())!.trim();
  const field = page.getByRole('textbox', { name: 'Project name', exact: true });
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  const layers = page.getByRole('button', { name: 'Toggle Layers Panel', exact: true });
  const step = page.getByTitle('Switch snap step: 25 cm grid or 10 cm (S)', { exact: true });

  await name.click();
  await expect(field).toBeFocused();
  // M, l, h and s are also editor shortcuts (Measure, Layers, Pan, snap step); here they are text,
  // and the selected name is replaced rather than appended to.
  await page.keyboard.type('Maple house');
  await expect(field).toHaveValue('Maple house');
  await expect(canvas).toHaveCSS('cursor', 'default');
  await expect(layers).toHaveAttribute('aria-expanded', 'false');
  await expect(step).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Escape');
  await expect(field).toHaveCount(0);
  await expect(name).toHaveText(original);

  await name.click();
  await expect(field).toBeFocused();
  await page.keyboard.type('Maple house');
  await expect(field).toHaveValue('Maple house');
  await page.keyboard.press('Enter');
  await expect(field).toHaveCount(0);
  await expect(name).toHaveText('Maple house');
  await expect(canvas).toHaveCSS('cursor', 'default');
  expect(errors).toEqual([]);
});
