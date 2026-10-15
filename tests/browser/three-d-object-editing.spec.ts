import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function enter3DWithFixture(page: any, fixture: string) {
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(resolve(fixture));
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const viewer = page.getByRole('region', { name: '3D floor plan viewer' });
  const canvas = viewer.locator('canvas').last();
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  const gotIt = page.getByRole('button', { name: 'Got it', exact: true });
  if (await gotIt.count()) await gotIt.click().catch(() => {});
  await viewer.getByRole('button', { name: 'Top-Down View', exact: true }).click();
  await viewer.getByRole('button', { name: 'Edit Mode', exact: true }).click();
  await expect(viewer.getByRole('button', { name: 'Exit Edit Mode', exact: true })).toBeVisible();
  // Let the fitted camera settle before clicking a world position.
  await page.waitForTimeout(700);
  return { viewer, canvas };
}

async function exportedFloors(page: any) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors;
}

test('3D edit mode selects furniture, shows properties and edits them', async ({ page }) => {
  test.slow();
  const { canvas } = await enter3DWithFixture(page, 'tests/fixtures/three-d-selection.openplan.json');
  const bounds = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });

  await expect(page.getByText('Sofa Properties')).toBeVisible();
  const panel = page.locator('[data-plan-properties]');
  await expect(panel.getByText('Elevation (cm)')).toBeVisible();

  const cameraPose = () => canvas.evaluate((node: HTMLCanvasElement) => node.dataset.viewerCamera ?? '');
  const beforeEdit = await cameraPose();
  await page.getByTitle('Rotate 90° right').click();
  const floors = await exportedFloors(page);
  expect(floors[0].furniture[0].rotation).toBe(90);
  expect(floors[0].furniture[0].catalogId).toBe('sofa');
  // Editing a property must not reframe the camera.
  expect(await cameraPose()).toBe(beforeEdit);
});

test('3D edit mode selects walls and shows wall properties', async ({ page }) => {
  test.slow();
  const { canvas } = await enter3DWithFixture(page, 'tests/fixtures/three-d-wall-selection.openplan.json');
  const bounds = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });

  await expect(page.getByText('Wall Properties')).toBeVisible();
  const panel = page.locator('[data-plan-properties]');
  await expect(panel.getByText('Thickness (cm)')).toBeVisible();
});

test('3D gizmo translates a selected object with grid snap', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Pixel-guided gizmo drag runs in Chromium; the drag math is unit-tested.');
  test.slow();
  const { canvas } = await enter3DWithFixture(page, 'tests/fixtures/three-d-selection.openplan.json');
  let bounds = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
  await expect(page.getByText('Sofa Properties')).toBeVisible();
  // The properties panel takes layout space and resizes the canvas.
  await page.waitForTimeout(300);
  bounds = (await canvas.boundingBox())!;

  // Locate the red X arrow tip by its pixels (the sofa is purple, not red).
  const probe = await canvas.evaluate((node: HTMLCanvasElement) => {
    const copy = document.createElement('canvas');
    copy.width = node.width; copy.height = node.height;
    const ctx = copy.getContext('2d')!;
    ctx.drawImage(node, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, copy.width, copy.height);
    const cx = width / 2, cy = height / 2;
    let best: { x: number; y: number } | null = null, bestDistance = 0;
    for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 170 && g < 110 && b < 110) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > bestDistance) { bestDistance = d; best = { x, y }; }
      }
    }
    return { best, cx, cy, width, height };
  });
  expect(probe.best).not.toBeNull();
  const scaleX = bounds.width / probe.width, scaleY = bounds.height / probe.height;
  const tip = { x: probe.best!.x * scaleX, y: probe.best!.y * scaleY };
  const center = { x: probe.cx * scaleX, y: probe.cy * scaleY };
  const dx = tip.x - center.x, dy = tip.y - center.y;
  const len = Math.hypot(dx, dy) || 1;
  // Grab slightly inside the cone head so the raycast hits the arrow, not the tip point.
  const grab = { x: tip.x - (dx / len) * 6, y: tip.y - (dy / len) * 6 };
  const cameraPose = () => canvas.evaluate((node: HTMLCanvasElement) => node.dataset.viewerCamera ?? '');
  const before = await cameraPose();

  await page.mouse.move(bounds.x + grab.x, bounds.y + grab.y);
  await page.mouse.down();
  await page.mouse.move(bounds.x + grab.x + (dx / len) * 110, bounds.y + grab.y + (dy / len) * 110, { steps: 8 });
  await page.mouse.up();

  const floors = await exportedFloors(page);
  const pos = floors[0].furniture[0].position;
  expect(Math.abs(pos.x) + Math.abs(pos.y)).toBeGreaterThan(0);
  expect(pos.x % 25).toBeCloseTo(0, 6);
  expect(pos.y % 25).toBeCloseTo(0, 6);
  // Committing the move must not reframe the camera.
  expect(await cameraPose()).toBe(before);
});
