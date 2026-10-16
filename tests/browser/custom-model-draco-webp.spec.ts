import { expect, test } from '@playwright/test';

test.setTimeout(180_000);
test('imports a Draco + WebP GLB using the locally bundled decoder', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door'])));
  const errors: string[] = [];
  const external: string[] = [];
  const decoderRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const url = new URL(request.url());
    if (/^https?:/.test(request.url()) && url.origin !== 'http://127.0.0.1:4188') external.push(request.url());
    if (url.pathname.startsWith('/draco/')) decoderRequests.push(url.pathname);
  });

  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  const panel = page.getByRole('region', { name: 'My 3D models', exact: true });
  await panel.locator('input[type=file]').setInputFiles('tests/fixtures/local-model-draco-webp-box.glb');
  const dialog = page.getByRole('dialog', { name: 'Import GLB model', exact: true });
  // Lazy loader/component loading, the bundled Draco decoder and texture decode.
  await expect(dialog.locator('canvas')).toBeVisible({ timeout: 90_000 });
  await expect(dialog.getByText('Width 100.0 × depth 75.0 × height 50.0 cm')).toBeVisible();
  await dialog.getByLabel('Model name', { exact: true }).fill('Draco WebP box');
  await dialog.getByRole('button', { name: 'Add to project', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(panel.getByText('Draco WebP box', { exact: true })).toBeVisible();

  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  expect(decoderRequests.some(path => path.endsWith('draco_wasm_wrapper.js') || path.endsWith('draco_decoder.wasm'))).toBe(true);
});
