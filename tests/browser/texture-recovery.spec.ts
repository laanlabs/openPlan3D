import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { observeGPU, gpu } from './gpu';

for (const view of ['2D', '3D']) for (const kind of ['wall', 'floor']) {
  test(`${kind} photo texture recovers from an aborted request and wakes the ${view} canvas`, async ({ page }) => {
    if (view === '3D') { test.slow(); await observeGPU(page); }
    await page.addInitScript(() => {
      localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door']));
      const now = Date.now.bind(Date);
      (window as any).__textureClockOffset = 0;
      Date.now = () => now() + (window as any).__textureClockOffset;
    });
    const file = kind === 'wall' ? 'brick' : 'floor-light-oak';
    const bytes = await readFile(`static/textures/${file}.webp`);
    let attempts = 0, release!: () => void;
    const ready = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**/${file}*.webp`, async route => {
      attempts++;
      if (attempts === 1) { await route.abort('failed'); return; }
      await ready;
      await route.fulfill({ status: 200, contentType: 'image/webp', body: bytes });
    });
    try {
      const project = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
      project.floors[0].rooms[0].floorTexture = kind === 'floor' ? 'light-oak' : 'none';
      if (kind === 'wall') for (const wall of project.floors[0].walls) wall.texture = 'red-brick';
      await page.goto('/editor');
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
      await (await chooser).setFiles({ name: 'texture-recovery.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
      await expect(page.getByRole('button', { name: project.name, exact: true })).toBeVisible();
      await expect.poll(() => attempts).toBe(1);
      await page.waitForLoadState('networkidle');
      const grid = page.getByTitle('Toggle Grid (G)', { exact: true });
      await grid.press('Enter'); await grid.press('Enter');
      expect(attempts).toBe(1);
      await page.evaluate(() => { (window as any).__textureClockOffset = 31_000; });
      if (view === '3D') await page.getByRole('button', { name: '3D', exact: true }).click();
      else await grid.press('Enter');
      await expect.poll(() => attempts).toBe(2);
      const canvas = view === '3D'
        ? page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').last()
        : page.locator('canvas[aria-label="Floor plan editor canvas"]');
      if (view === '3D') {
        // Software WebGL startup has its own budget; the idle/recovery checks
        // below still require the renderer to settle and wake without input.
        await expect.poll(async () => (await gpu(page)).find((entry: any) => entry.connected && !entry.lost)?.draws ?? 0,
          { timeout: 60_000 }).toBeGreaterThan(0);
        if (kind === 'floor') await page.getByRole('button', { name: 'Top-Down View', exact: true }).click();
        await expect(async () => {
          const active = (await gpu(page)).find((entry: any) => entry.connected && !entry.lost);
          expect(active?.draws).toBeGreaterThan(0);
          await page.waitForTimeout(300);
          expect((await gpu(page)).find((entry: any) => entry.connected && !entry.lost)?.draws).toBe(active.draws);
        }).toPass({ timeout: 15_000 });
      }
      const pixels = async () => createHash('sha256').update(await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL())).digest('hex');
      const before = await pixels();
      release();
      // No pointer movement or further UI action supplies the redraw.
      await expect.poll(pixels).not.toBe(before);
      expect(attempts).toBe(2);
    } finally { release(); }
  });
}
