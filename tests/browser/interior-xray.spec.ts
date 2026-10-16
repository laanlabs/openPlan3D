import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { observeGPU, gpu } from './gpu';

test.use({ viewport: { width: 1440, height: 900 } });

// The fixture is symmetric about the plan centre, so a click at the centre of the
// framed view places the interior camera inside the room, looking east (+X) at the
// east wall. A magenta column stands behind that wall; a green one is inside, in view.
async function capture(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '📸 Capture 1920×1080', exact: true }).click();
  const bytes = await readFile((await (await pending).path())!);
  return page.evaluate(async (base64: string) => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let magenta = 0, green = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 60 && b > 60 && r > g * 2 && b > g * 2) magenta++;
      if (g > 60 && g > r * 2 && g > b * 2) green++;
    }
    return { magenta, green };
  }, bytes.toString('base64'));
}

test('x-ray walls fade only the walls in interior captures and leave the main view unchanged', async ({ page }, testInfo) => {
  test.slow();
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door'])));
  await observeGPU(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/interior-xray.openplan.json'));
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const viewer = page.getByRole('region', { name: '3D floor plan viewer', exact: true });
  const main = viewer.locator('canvas[data-plan3d-canvas="true"]');
  await expect(main).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle');
  const draws = async () => {
    const live = (await gpu(page)).filter((entry: any) => entry.connected && !entry.lost);
    return { main: live.find((entry: any) => entry.width !== 384)?.draws ?? 0, preview: live.find((entry: any) => entry.width === 384)?.draws ?? 0 };
  };
  // Software WebGL may queue a final frame after the first quiet sample.
  const settled = () => expect(async () => {
    const before = await draws();
    await page.waitForTimeout(350);
    expect(await draws()).toEqual(before);
  }).toPass({ timeout: 40_000, intervals: [100, 250] });
  await expect.poll(async () => (await draws()).main, { timeout: 60_000 }).toBeGreaterThan(0);
  await settled();
  await viewer.getByRole('button', { name: 'Place Interior Camera', exact: true }).click();
  const bounds = (await main.boundingBox())!;
  await main.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
  await expect(viewer.getByLabel('Interior camera preview', { exact: true })).toBeVisible();
  await expect.poll(async () => (await draws()).preview, { timeout: 60_000 }).toBeGreaterThan(0);
  await settled();
  // Pixels of the main view that moved by more than a rounding step since the first call.
  const changedPixels = () => main.evaluate((node: HTMLCanvasElement) => {
    const probe = document.createElement('canvas'); probe.width = node.width; probe.height = node.height;
    const ctx = probe.getContext('2d')!; ctx.drawImage(node, 0, 0);
    const pixels = ctx.getImageData(0, 0, probe.width, probe.height).data;
    const store = window as any;
    if (!store.__xrayBaseline) { store.__xrayBaseline = pixels; return 0; }
    const baseline: Uint8ClampedArray = store.__xrayBaseline;
    if (baseline.length !== pixels.length) return pixels.length;
    let changed = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (Math.max(Math.abs(pixels[i] - baseline[i]), Math.abs(pixels[i + 1] - baseline[i + 1]), Math.abs(pixels[i + 2] - baseline[i + 2])) > 8) changed++;
    }
    return changed;
  });
  expect(await changedPixels()).toBe(0); // records the baseline
  const solid = await capture(page);
  const results: any = { solid };
  try {
    expect(solid.magenta).toBeLessThan(20); // the east wall hides the column behind it
    expect(solid.green).toBeGreaterThan(1000);
    const xray = viewer.getByRole('checkbox', { name: 'X-ray walls (see through)', exact: true });
    for (const checked of [true, false]) {
      const before = (await draws()).preview;
      await xray.click(); await expect(xray).toBeChecked({ checked });
      await expect.poll(async () => (await draws()).preview).toBeGreaterThan(before);
      await settled();
      // Each preview render fades and restores the walls, then the main view redraws.
      // Shared trim, window glass and stair materials must come back exactly.
      results[checked ? 'mainAfterXray' : 'mainAfterSolid'] = await changedPixels();
      expect(results[checked ? 'mainAfterXray' : 'mainAfterSolid']).toBeLessThan(50);
      if (checked) {
        const seeThrough = results.seeThrough = await capture(page);
        expect(seeThrough.magenta).toBeGreaterThan(1000); // the wall in front is faint
        expect(seeThrough.green).toBeGreaterThan(solid.green * 0.8); // room contents keep their look
      }
    }
    expect(errors).toEqual([]);
  } finally {
    await testInfo.attach('interior-xray-pixels', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
  }
});
