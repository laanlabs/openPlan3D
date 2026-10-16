import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { observeGPU, gpu } from './gpu';

// In the empty starting plan the interior camera looks level across the base floor:
// a capture's top rows are sky and its bottom rows are the hardwood floor texture.
test('interior captures keep the authored sRGB colours of the sky and floor textures', async ({ page }, testInfo) => {
  test.slow();
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door'])));
  await observeGPU(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const viewer = page.getByRole('region', { name: '3D floor plan viewer', exact: true });
  const main = viewer.locator('canvas[data-plan3d-canvas="true"]');
  await expect(main).toBeVisible({ timeout: 60_000 });
  await viewer.getByRole('button', { name: 'Place Interior Camera', exact: true }).click();
  const bounds = (await main.boundingBox())!;
  await main.click({ position: { x: bounds.width * .45, y: bounds.height * .5 } });
  await expect(viewer.getByLabel('Interior camera preview', { exact: true })).toBeVisible();
  await expect.poll(async () => (await gpu(page)).filter((item: any) => !item.lost && item.width === 384 && item.draws > 0).length, { timeout: 60_000 }).toBe(1);
  const pending = page.waitForEvent('download');
  await viewer.getByRole('button', { name: '📸 Capture 1920×1080', exact: true }).click();
  const bytes = await readFile((await (await pending).path())!);
  const bands = await page.evaluate(async (base64: string) => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    const mean = (top: number, bottom: number) => {
      const y = Math.round(top * canvas.height), rows = Math.round((bottom - top) * canvas.height);
      const { data } = ctx.getImageData(0, y, canvas.width, rows), sum = [0, 0, 0];
      for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
      return sum.map(value => Math.round(value / (data.length / 4)));
    };
    return { size: [canvas.width, canvas.height], sky: mean(0, .15), floor: mean(.85, 1) };
  }, bytes.toString('base64'));
  await testInfo.attach('interior-colour-bands', { body: JSON.stringify(bands), contentType: 'application/json' });
  expect(bands.size).toEqual([1920, 1080]);
  // The authored gradient is a clear blue up there (about #8ccfeb); read as linear and
  // tone-mapped, it used to reach the screen as pale grey-blue (about #cedbdf).
  expect(bands.sky[2] - bands.sky[0]).toBeGreaterThan(60);
  // The hardwood planks (#c4a882 base) keep their warm tone (about #9d8a67 here) instead
  // of the washed-out beige of the undecoded texture (about #b4ae9e).
  expect(bands.floor[0] - bands.floor[2]).toBeGreaterThan(35);
  expect(errors).toEqual([]);
});

// The orbit view of the empty starting plan looks down at the base floor; its top rows (the
// first 2.4% or so) are sky just below the horizon, beyond where the far plane cuts off the ground.
test('a time-of-day preset repaints the sky in the main view and redraws an open interior preview', async ({ page }, testInfo) => {
  test.slow();
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door'])));
  await observeGPU(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const viewer = page.getByRole('region', { name: '3D floor plan viewer', exact: true });
  const main = viewer.locator('canvas[data-plan3d-canvas="true"]');
  await expect(main).toHaveAttribute('data-rendered', 'true', { timeout: 60_000 });
  const skyBand = () => main.evaluate((node: HTMLCanvasElement) => {
    const probe = document.createElement('canvas'); probe.width = node.width; probe.height = node.height;
    const ctx = probe.getContext('2d')!; ctx.drawImage(node, 0, 0);
    const { data } = ctx.getImageData(0, 0, probe.width, Math.max(1, Math.round(probe.height * .01))), sum = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
    return sum.map(value => Math.round(value / (data.length / 4)));
  });
  const day = await skyBand();
  // The daytime gradient is pale blue there (about #badeef), unlike the warm grey ground.
  expect(day[2]).toBeGreaterThan(200);
  expect(day[2] - day[0]).toBeGreaterThan(30);

  await viewer.getByRole('button', { name: 'Place Interior Camera', exact: true }).click();
  const bounds = (await main.boundingBox())!;
  await main.click({ position: { x: bounds.width * .45, y: bounds.height * .5 } });
  await expect(viewer.getByLabel('Interior camera preview', { exact: true })).toBeVisible();
  const previewDraws = async () => (await gpu(page)).find((item: any) => !item.lost && item.width === 384)?.draws ?? 0;
  await expect.poll(previewDraws, { timeout: 60_000 }).toBeGreaterThan(0);
  const previewBefore = await previewDraws();

  await viewer.getByRole('button', { name: 'Lighting Controls', exact: true }).click();
  await viewer.getByRole('button', { name: /night/i }).click();
  // The night preset's horizon is a deep navy (#141432 to #1a1a3e, about #181838 there).
  // The view used to keep the daytime sky it had converted when it opened.
  await expect.poll(async () => Math.max(...await skyBand()), { timeout: 15_000 }).toBeLessThan(100);
  // The open preview draws again; tests/viewer-textures.test.ts shows its renderer then uses the new sky.
  await expect.poll(previewDraws).toBeGreaterThan(previewBefore);
  await testInfo.attach('sky-bands', { body: JSON.stringify({ day, night: await skyBand() }), contentType: 'application/json' });
  expect(errors).toEqual([]);
});
