import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

// Double-clicking a magenta corner column of the framing fixture centres it: once the glide
// settles, the column covers the middle of the view.
test('double-click glides the clicked point to the centre of the 3D view', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door'])));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/top-down-framing.openplan.json'));
  await expect(page.getByRole('button', { name: 'QA Top-Down Framing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const canvas = page.getByRole('region', { name: '3D floor plan viewer', exact: true }).locator('canvas').last();
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Top-Down View', exact: true }).click();

  // Magenta pixels in the top-left quadrant (one corner column), and whether the centre is magenta.
  const inspect = () => canvas.evaluate((node: HTMLCanvasElement) => {
    const probe = document.createElement('canvas'); probe.width = node.width; probe.height = node.height;
    const ctx = probe.getContext('2d')!; ctx.drawImage(node, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, probe.width, probe.height);
    const magenta = (x: number, y: number) => {
      const i = (y * width + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
      return r > 140 && b > 110 && r > g * 1.6 && b > g * 1.6;
    };
    let count = 0, sumX = 0, sumY = 0;
    for (let y = 0; y < height / 2; y++) for (let x = 0; x < width / 2; x++) if (magenta(x, y)) { count++; sumX += x; sumY += y; }
    const cx = Math.round(width / 2), cy = Math.round(height / 2);
    let centre = 0;
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) if (magenta(x, y)) centre++;
    return { count, x: sumX / count / width, y: sumY / count / height, centre };
  });
  await expect.poll(async () => (await inspect()).count).toBeGreaterThan(20);
  const before = await inspect();
  expect(before.centre).toBe(0);

  const bounds = (await canvas.boundingBox())!;
  await canvas.dblclick({ position: { x: before.x * bounds.width, y: before.y * bounds.height } });
  // Most of the 5×5 centre probe; the column's top is not much larger than the probe.
  await expect.poll(async () => (await inspect()).centre, { timeout: 5_000 }).toBeGreaterThan(12);
  expect(errors).toEqual([]);
});
