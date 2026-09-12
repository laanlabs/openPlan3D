import { expect, test } from '@playwright/test';

test.setTimeout(180_000);
test('model preview can rotate and zoom using keyboard-operated controls', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await page.getByRole('region', { name: 'My 3D models', exact: true }).locator('input[type=file]').setInputFiles('tests/fixtures/local-model-textured-box.glb');
  const dialog = page.getByRole('dialog', { name: 'Import GLB model', exact: true });
  const preview = dialog.getByRole('img', { name: '3D model preview', exact: true });
  await expect(preview).toBeVisible();
  const initial = await preview.screenshot();
  await testInfo.attach('custom-model-keyboard-controls', { body: await dialog.screenshot(), contentType: 'image/png' });
  for (const name of ['Rotate left', 'Rotate right', 'Rotate up', 'Rotate down', 'Zoom in', 'Zoom out']) {
    const control = dialog.getByRole('button', { name, exact: true });
    await control.focus();
    await expect(control).toBeFocused();
    await page.keyboard.press('Enter');
    expect(await preview.screenshot()).not.toEqual(initial);
    const reset = dialog.getByRole('button', { name: 'Reset preview view', exact: true });
    await reset.focus();
    await page.keyboard.press('Space');
    expect(await preview.screenshot()).toEqual(initial);
  }
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});
