import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { savedProjects } from './storage';

test.setTimeout(360_000);
test('imports, previews, places and retains a local custom model through undo and reload', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door'])));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const bytes = await readFile('tests/fixtures/local-model-textured-box.glb');
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  const panel = page.getByRole('region', { name: 'My 3D models', exact: true });
  const input = panel.locator('input[type=file]');
  await input.setInputFiles('tests/fixtures/local-model-textured-box.glb');
  const dialog = page.getByRole('dialog', { name: 'Import GLB model', exact: true });
  await expect(dialog.locator('canvas')).toBeVisible();
  await expect(dialog.getByText('Width 100.0 × depth 75.0 × height 50.0 cm')).toBeVisible();
  await testInfo.attach('custom-model-preview', { body: await dialog.screenshot(), contentType: 'image/png' });
  await dialog.getByLabel('Model name', { exact: true }).fill('My textured box');
  await dialog.getByLabel('Attribution (optional)', { exact: true }).fill('Fixture author');
  await dialog.getByRole('button', { name: 'Add to project', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(panel.getByText('My textured box', { exact: true })).toBeVisible();
  async function exported() {
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  }
  const imported = await exported(), model = imported.customModels[0];
  expect(model).toMatchObject({ name: 'My textured box', attribution: 'Fixture author', width: 100, depth: 75, height: 50,
    sha256: createHash('sha256').update(bytes).digest('hex'), byteLength: bytes.length });
  expect(imported.projectPackage.assets[`assets/${model.assetName}`]).toBe(bytes.toString('base64'));
  await panel.getByRole('button', { name: 'Place at view center', exact: true }).click();
  const placed = await exported();
  const floor = placed.floors.find((floor: any) => floor.id === placed.activeFloorId);
  expect(floor.furniture.at(-1)).toMatchObject({ customModelId: model.id, width: 100, depth: 75, height: 50 });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  const undone = await exported();
  expect(undone.floors).toEqual(imported.floors);
  expect(undone.customModels).toEqual(imported.customModels);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect((await exported()).floors).toEqual(placed.floors);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(async () => (await savedProjects(page))[placed.id]?.customModels).toEqual(placed.customModels);
  await page.reload();
  const retained = await exported();
  expect(retained.customModels).toEqual(placed.customModels);
  expect(retained.projectPackage.assets[`assets/${model.assetName}`]).toBe(bytes.toString('base64'));
  expect(retained.floors).toEqual(placed.floors);
  expect(errors).toEqual([]);
});
