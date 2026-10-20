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
  await page.getByRole('button', { name: 'My Items', exact: true }).click();
  const panel = page.getByRole('region', { name: 'My 3D models', exact: true });
  const input = panel.locator('input[type=file]');
  await input.setInputFiles('tests/fixtures/local-model-textured-box.glb');
  const dialog = page.getByRole('dialog', { name: 'Import GLB model', exact: true });
  // Includes lazy loader/component loading and bounded texture preparation.
  await expect(dialog.locator('canvas')).toBeVisible({ timeout: 60_000 });
  await expect(dialog.getByText('Width 100.0 × depth 75.0 × height 50.0 cm')).toBeVisible();
  await testInfo.attach('custom-model-preview', { body: await dialog.screenshot(), contentType: 'image/png' });
  await dialog.getByLabel('Model name', { exact: true }).fill('My textured box');
  await dialog.getByLabel('Attribution (optional)', { exact: true }).fill('Fixture author');
  await dialog.getByRole('button', { name: 'Add to project', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(panel.getByRole('button', { name: /My textured box/ })).toBeVisible();
  await expect(panel.getByText('100×75cm', { exact: true })).toBeVisible();
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
  await panel.getByRole('button', { name: /My textured box/ }).click();
  const canvas = page.getByLabel(/^(?:Floor plan editor canvas|Área de edição da planta baixa)$/, { exact: true });
  await canvas.click({ position: { x: 300, y: 250 } });
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

test('imports and renders a custom model when Web Crypto is unavailable (insecure origin)', async ({ page }) => {
  // A plain-HTTP origin has no `crypto.subtle`; simulate it on the secure test origin.
  await page.addInitScript(() => {
    Object.defineProperty(Crypto.prototype, 'subtle', { configurable: true, get: () => undefined });
  });
  const warnings: string[] = [];
  page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await page.getByRole('button', { name: 'My Items', exact: true }).click();
  const panel = page.getByRole('region', { name: 'My 3D models', exact: true });
  await panel.locator('input[type=file]').setInputFiles('tests/fixtures/local-model-textured-box.glb');
  const dialog = page.getByRole('dialog', { name: 'Import GLB model', exact: true });
  await expect(dialog.locator('canvas')).toBeVisible({ timeout: 60_000 });
  await dialog.getByRole('button', { name: 'Add to project', exact: true }).click();
  await expect(dialog).toBeHidden();
  await panel.getByRole('button', { name: /local-model-textured-box/ }).click();
  await page.getByLabel(/^(?:Floor plan editor canvas|Área de edição da planta baixa)$/, { exact: true }).click({ position: { x: 300, y: 250 } });
  // Enter 3D so the retained model is loaded and verified at render time.
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(4_000);
  expect(warnings.filter(warning => warning.includes('Custom model unavailable'))).toEqual([]);
});
