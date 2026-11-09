import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { benchmarkProject } from '../fixtures/render-benchmark';

// Issue #130: while all floors are stacked, the other floors can be drawn solid like the active one.
test('stacked floors offer translucent or solid other floors and keep the choice', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  const project = benchmarkProject('medium'); // two floors, 300 cm apart
  await (await chooser).setFiles({ name: 'two-floors.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('canvas[data-plan3d-canvas="true"]')).toBeVisible({ timeout: 60_000 });
  const hint = page.getByRole('button', { name: 'Got it', exact: true });
  await expect(hint).toBeHidden({ timeout: 15_000 });

  const viewer = page.getByRole('region', { name: '3D floor plan viewer' });
  const otherFloors = viewer.getByRole('group', { name: 'Other floors', exact: true });
  const translucent = otherFloors.getByRole('button', { name: 'Translucent', exact: true });
  const solid = otherFloors.getByRole('button', { name: 'Solid', exact: true });
  await expect(otherFloors).toHaveCount(0); // only offered while floors are stacked

  await viewer.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
  await expect(otherFloors).toBeVisible();
  await expect(translucent).toHaveAttribute('aria-pressed', 'true');
  await expect(solid).toHaveAttribute('aria-pressed', 'false');
  const translucentScene = await exportScene(page);
  const translucentPixels = await settledPixels(page);

  await solid.click();
  await expect(solid).toHaveAttribute('aria-pressed', 'true');
  await expect(translucent).toHaveAttribute('aria-pressed', 'false');
  // The view re-renders with the upper floor opaque, from the same viewpoint.
  await expect.poll(() => settledPixels(page)).not.toBe(translucentPixels);
  // The neutral render-scene export holds the same stacked geometry in either style.
  expect((await exportScene(page)).meshes).toEqual(translucentScene.meshes);

  // The choice survives switching floors and turning stacking off and on again.
  await page.getByRole('combobox', { name: 'Current floor', exact: true }).selectOption(project.floors[1].id);
  await expect(viewer.getByText('Level 2 · 300 cm elevation', { exact: true })).toBeVisible();
  await expect(solid).toHaveAttribute('aria-pressed', 'true');
  await viewer.getByRole('button', { name: 'Active Floor Only', exact: true }).click();
  await expect(otherFloors).toHaveCount(0);
  await viewer.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
  await expect(solid).toHaveAttribute('aria-pressed', 'true');

  await translucent.click();
  await expect(translucent).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

async function exportScene(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Blender Scene', exact: true }).click();
  const scene = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(scene.scope).toBe('stacked-floors');
  return scene;
}

/** A cheap digest of the 3D canvas once it has stopped changing between frames. */
async function settledPixels(page: Page): Promise<string> {
  const canvas = page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').last();
  const digest = () => canvas.evaluate((node: HTMLCanvasElement) => {
    const probe = document.createElement('canvas'); probe.width = 160; probe.height = 100;
    const ctx = probe.getContext('2d')!; ctx.drawImage(node, 0, 0, probe.width, probe.height);
    const { data } = ctx.getImageData(0, 0, probe.width, probe.height);
    let hash = 0;
    for (let i = 0; i < data.length; i++) hash = (hash * 31 + data[i]) | 0;
    return String(hash);
  });
  let previous = await digest();
  for (let attempt = 0; attempt < 20; attempt++) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const next = await digest();
    if (next === previous) return next;
    previous = next;
  }
  return previous;
}
