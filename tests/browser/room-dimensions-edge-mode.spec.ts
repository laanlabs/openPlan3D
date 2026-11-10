import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Issue #121: Settings > Dimensions > Measure walls > Edge to edge shortened the
// wall dimension lines, but a room's Internal Dimensions kept its centreline size.
test('a room\'s internal dimensions follow Measure walls', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door']));
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas' && String(text).includes(' × ')) (window as any).__roomSize = String(text);
      return maxWidth === undefined ? fill.call(this, text, x, y) : fill.call(this, text, x, y, maxWidth);
    };
  });
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8')), floor = plan.floors[0];
  for (const key of ['doors', 'windows', 'rooms', 'furniture', 'stairs', 'columns', 'entourage', 'guides', 'textAnnotations', 'measurements', 'annotations']) floor[key] = [];
  const corners = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 300 }, { x: 0, y: 300 }];
  floor.walls = corners.map((start, i) => ({ id: `w${i}`, start, end: corners[(i + 1) % 4], thickness: 15, height: 250, color: '#eeeeee' }));

  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'room.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  await expect(page.getByRole('button', { name: plan.name, exact: true })).toBeVisible();

  const roomSize = () => page.evaluate(() => (window as any).__roomSize);
  await page.getByTitle('Settings', { exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Dimensions', exact: true }).click();
  await dialog.getByLabel('Internal Dimensions').check();
  await expect.poll(roomSize).toBe('4 m × 3 m');
  // 15 cm walls: half of each comes off both sides.
  await dialog.getByRole('button', { name: 'Edge to edge', exact: true }).click();
  await expect.poll(roomSize).toBe('3.85 m × 2.85 m');
  await dialog.getByRole('button', { name: 'Centerline', exact: true }).click();
  await expect.poll(roomSize).toBe('4 m × 3 m');
});
