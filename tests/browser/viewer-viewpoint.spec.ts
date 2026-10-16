import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { observeGPU, gpu } from './gpu';

// Rebuilding the scene for an edit must leave the orbit camera where the user put it. The four
// magenta corner columns of the framing fixture mark the view in rendered pixels: their bounds stay
// put through a 3D furniture placement, Undo and a unit change, and move for a new framing context.
test('3D edits, Undo and unit changes keep the orbit viewpoint; stacking re-frames', async ({ page }) => {
  test.setTimeout(120_000);
  await observeGPU(page);
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door'])));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/top-down-framing.openplan.json'));
  // Opening another project is a new framing context, so let the import finish before any view is set.
  await expect(page.getByRole('button', { name: 'QA Top-Down Framing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const canvas = page.getByRole('region', { name: '3D floor plan viewer', exact: true }).locator('canvas').last();
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle');
  const columns = () => canvas.evaluate((node: HTMLCanvasElement) => {
    const probe = document.createElement('canvas'); probe.width = node.width; probe.height = node.height;
    const ctx = probe.getContext('2d')!; ctx.drawImage(node, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, probe.width, probe.height);
    let count = 0, minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4, r = data[index], g = data[index + 1], b = data[index + 2];
      if (r > 140 && b > 110 && r > g * 1.6 && b > g * 1.6) {
        count++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
    return { count, minX, minY, maxX, maxY };
  });
  const settle = () => page.evaluate(() => new Promise<void>(resolve => { let remaining = 20; const frame = () => --remaining ? requestAnimationFrame(frame) : resolve(); requestAnimationFrame(frame); }));
  const buffers = async () => (await gpu(page)).find((entry: any) => entry.connected && !entry.lost)?.created.Buffer ?? 0;
  const edges = ['minX', 'minY', 'maxX', 'maxY'] as const;

  await page.getByRole('button', { name: 'Top-Down View', exact: true }).click();
  await expect.poll(async () => (await columns()).count).toBeGreaterThan(100);
  await settle();
  const view = await columns();
  // Each step must rebuild the scene (fresh geometry reaches the GPU) and leave the corners in place.
  const keepsView = async (step: () => Promise<unknown>) => {
    const before = await buffers();
    await step();
    await expect.poll(buffers).toBeGreaterThan(before);
    await page.waitForLoadState('networkidle'); await settle();
    const after = await columns();
    for (const edge of edges) expect(Math.abs(after[edge] - view[edge]), edge).toBeLessThanOrEqual(2);
  };

  // Placement mode stays on after a click, so a re-fit would also move where the next click lands.
  await page.getByRole('button', { name: 'Edit Mode', exact: true }).click();
  await page.getByRole('button', { name: 'Place Furniture', exact: true }).click();
  await page.getByRole('button', { name: /Armchair/ }).click();
  const bounds = (await canvas.boundingBox())!;
  const center = { x: bounds.width / 2, y: bounds.height / 2 };
  await canvas.hover({ position: center }); // the placement preview's resources load before the baseline
  await page.waitForLoadState('networkidle'); await settle();
  await keepsView(() => canvas.click({ position: center }));
  await page.getByRole('button', { name: 'Exit Furniture Placement', exact: true }).click();
  await page.getByRole('button', { name: 'Exit Edit Mode', exact: true }).click();
  await keepsView(() => page.getByRole('button', { name: 'Undo', exact: true }).click());
  await keepsView(async () => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Dimensions', exact: true }).click();
    await page.getByRole('button', { name: 'ft, inch', exact: true }).click();
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  });

  // A new framing context is still fitted, in the default perspective.
  await page.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
  await settle();
  const stacked = await columns();
  expect(stacked.count).toBeGreaterThan(0);
  expect(Math.max(...edges.map(edge => Math.abs(stacked[edge] - view[edge])))).toBeGreaterThan(20);
  expect(errors).toEqual([]);
});
