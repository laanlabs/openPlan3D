import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const kind of ['wall', 'floor']) {
  test(`${kind} photo texture recovers from an aborted request and wakes the canvas`, async ({ page }) => {
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
      await grid.press('Enter');
      await expect.poll(() => attempts).toBe(2);
      const canvas = page.locator('canvas[aria-label="Floor plan editor canvas"]');
      const before = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
      release();
      // No pointer movement or further UI action supplies the redraw.
      await expect.poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL())).not.toBe(before);
      expect(attempts).toBe(2);
    } finally { release(); }
  });
}
