import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

import { observeGPU, gpu } from './gpu';

async function placeCamera(page: Page) {
  await page.getByRole('button', { name: 'Place Interior Camera', exact: true }).click();
  const canvas = page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').last();
  const bounds = await canvas.boundingBox();
  await canvas.click({ position: { x: bounds!.width * 0.45, y: bounds!.height * 0.5 } });
  await expect(page.getByRole('button', { name: 'Close camera', exact: true })).toBeVisible();
}

for (const width of [1440, 390]) test(`camera previews release resources across reopen, reposition and capture at ${width}px`, async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 900 });
  await observeGPU(page);
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4188') external.push(request.url()); });
  const samples: any[] = [];
  try {
    await page.goto('/editor');
    await page.getByRole('button', { name: '3D', exact: true }).click();
    let closedResources: unknown;
    for (let cycle = 0; cycle < 3; cycle++) {
      await placeCamera(page);
      await expect.poll(async () => (await gpu(page)).filter((item: any) => !item.lost && item.width === 384 && item.height === 216 && item.connected && item.draws > 0).length).toBe(1);
      samples.push({ phase: `open-${cycle}`, contexts: await gpu(page) });
      await page.getByRole('button', { name: 'Close camera', exact: true }).click();
      await expect.poll(async () => (await gpu(page)).filter((item: any) => !item.lost).length).toBe(1);
      const closed = await gpu(page);
      samples.push({ phase: `close-${cycle}`, contexts: closed });
      if (cycle === 0) closedResources = closed[0].live;
      else expect(closed[0].live).toEqual(closedResources); // removed markers do not accumulate on the main renderer
    }
    await placeCamera(page);
    await page.getByRole('button', { name: 'Reposition', exact: true }).click();
    await expect.poll(async () => (await gpu(page)).filter((item: any) => !item.lost).length).toBe(1);
    const main = page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').last();
    const bounds = await main.boundingBox();
    await main.click({ position: { x: bounds!.width * 0.45, y: bounds!.height * 0.5 } });
    await expect.poll(async () => (await gpu(page)).filter((item: any) => !item.lost && item.width === 384 && item.draws > 0).length).toBe(1);
    for (let photo = 0; photo < 2; photo++) {
      const pending = page.waitForEvent('download');
      await page.getByRole('button', { name: '📸 Capture 1920×1080', exact: true }).click();
      const bytes = await readFile((await (await pending).path())!);
      expect(bytes.subarray(1, 4).toString()).toBe('PNG');
      expect(bytes.readUInt32BE(16)).toBe(1920); expect(bytes.readUInt32BE(20)).toBe(1080);
      await expect.poll(async () => (await gpu(page)).filter((item: any) => !item.lost).length).toBe(2);
      samples.push({ phase: `photo-${photo}`, contexts: await gpu(page) });
    }
    await page.getByRole('button', { name: '2D', exact: true }).click();
    await expect.poll(async () => (await gpu(page)).filter((item: any) => !item.lost).length).toBe(0);
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await placeCamera(page);
    await expect.poll(async () => (await gpu(page)).filter((item: any) => !item.lost && item.draws > 0).length).toBe(2);
    await page.getByRole('button', { name: '2D', exact: true }).click();
    await expect.poll(async () => (await gpu(page)).filter((item: any) => !item.lost).length).toBe(0);
    expect(errors).toEqual([]); expect(external).toEqual([]);
  } finally {
    samples.push({ phase: 'final', contexts: await gpu(page) });
    await testInfo.attach('webgl-resource-counts', { body: JSON.stringify(samples, null, 2), contentType: 'application/json' });
  }
});


test('textured scene rebuilds retain a bounded number of GPU resources', async ({ page }, testInfo) => {
  // Repeated textured frames under software rendering can exceed two minutes.
  test.setTimeout(240_000);
  await observeGPU(page);
  const samples: any[] = [];
  try {
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles(resolve('tests/fixtures/connected-dimensions.openplan.json'));
    await page.getByRole('button', { name: 'Save', exact: true }).press('l');
    await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await page.waitForLoadState('networkidle');
    // Software WebGL can spend more than 10 seconds compiling the first textured frame.
    // This checks resource retention after warmup, not initial-render performance.
    await expect.poll(async () => (await gpu(page))[0]?.draws ?? 0, { timeout: 30_000 }).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Edit Mode', exact: true }).click();
    const canvas = page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').last();
    const bounds = await canvas.boundingBox();
    await canvas.click({ position: { x: bounds!.width * 0.4, y: bounds!.height * 0.6 } });
    await expect(page.getByRole('spinbutton', { name: 'Thickness (cm)', exact: true })).toBeVisible();
    const cycle = async () => {
      for (const name of ['Show All Floors Stacked', 'Active Floor Only']) {
        const before = (await gpu(page))[0].draws;
        await page.getByRole('button', { name, exact: true }).click();
        await expect.poll(async () => (await gpu(page))[0].draws).toBeGreaterThan(before);
      }
      return (await gpu(page))[0].live;
    };
    await cycle(); // warm both presentation modes and lazily loaded textures
    const baseline = await cycle();
    samples.push({ phase: 'warmed', live: baseline });
    for (let index = 0; index < 4; index++) samples.push({ phase: `rebuild-${index}`, live: await cycle() });
    expect(samples.at(-1).live).toEqual(baseline);
  } finally {
    samples.push({ phase: 'final-contexts', contexts: await gpu(page) });
    await testInfo.attach('scene-resource-counts', { body: JSON.stringify(samples, null, 2), contentType: 'application/json' });
  }
});
