import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.setTimeout(180_000);
async function exported(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
test('cancel and invalid imports preserve the project and restore focus', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door'])));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  const before = await exported(page);
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  const panel = page.getByRole('region', { name: 'My 3D models', exact: true });
  const opener = panel.getByRole('button', { name: 'Import GLB model', exact: true });
  async function choose() {
    const pending = page.waitForEvent('filechooser'); await opener.click();
    await (await pending).setFiles('tests/fixtures/local-model-textured-box.glb');
  }
  const dialog = page.getByRole('dialog', { name: 'Import GLB model', exact: true });
  await choose(); await expect(dialog.locator('canvas')).toBeVisible();
  await dialog.press('Escape'); await expect(dialog).toBeHidden(); await expect(opener).toBeFocused();
  expect(await exported(page)).toEqual(before);
  await panel.locator('input[type=file]').setInputFiles({ name: 'broken.glb', mimeType: 'model/gltf-binary', buffer: Buffer.alloc(20) });
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Add to project', exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await exported(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test('unused model removal restores source bytes and metadata through undo and redo', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door'])));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  const panel = page.getByRole('region', { name: 'My 3D models', exact: true });
  await panel.locator('input[type=file]').setInputFiles('tests/fixtures/local-model-textured-box.glb');
  const dialog = page.getByRole('dialog', { name: 'Import GLB model', exact: true });
  await expect(dialog.locator('canvas')).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Model name', exact: true }).fill('Removable box');
  await dialog.getByRole('button', { name: 'Add to project', exact: true }).click();
  await expect(dialog).toBeHidden();
  const admitted = await exported(page), definition = admitted.customModels[0];
  await panel.getByRole('button', { name: 'Remove model', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Remove model', exact: true });
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await exported(page)).toEqual(admitted);
  await panel.getByRole('button', { name: 'Remove model', exact: true }).click();
  await confirmation.getByRole('button', { name: 'Remove model', exact: true }).click();
  const removed = await exported(page);
  expect(removed.customModels).toBeUndefined();
  expect(removed.projectPackage.assets[`assets/${definition.assetName}`]).toBeUndefined();
  expect(removed.attachmentNames?.[definition.assetName]).toBeUndefined();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  const undone = await exported(page);
  expect(undone.customModels).toEqual(admitted.customModels);
  expect(undone.projectPackage).toEqual(admitted.projectPackage);
  expect(undone.attachmentNames).toEqual(admitted.attachmentNames);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  const redone = await exported(page);
  expect(redone.customModels).toBeUndefined();
  expect(redone.projectPackage).toEqual(removed.projectPackage);
  expect(errors).toEqual([]);
});
