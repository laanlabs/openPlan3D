import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const [profile, startHeight, endHeight] of [
  ['flat', 250.25, 250.25], ['rising', 240.25, 260.25], ['falling', 260.25, 240.25]
] as const) {
  test(`elevation window stays below a fractional ${profile} wall top`, async ({ page }) => {
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
    const floor = plan.floors[0], wall = floor.walls[0], window = floor.windows[0];
    Object.assign(wall, { startHeight, endHeight });
    window.wallId = wall.id;
    floor.doors = [];
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'clearance.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
    async function exported() {
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      const pending = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
      return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
    }
    const original = await exported();
    await page.getByRole('button', { name: 'Save', exact: true }).press('l');
    await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
    await page.getByRole('button', { name: 'Elevation', exact: true }).first().click();
    const canvas = page.getByLabel('Wall elevation editor canvas', { exact: true });
    await expect(canvas).toBeVisible();
    const box = (await canvas.boundingBox())!;
    const height = Math.max(startHeight, endHeight);
    const scale = Math.min((box.width - 136) / 600.5, (box.height - 100) / height);
    const x = box.x + 72 + (box.width - 136) / 2;
    const floorY = box.y + 36 + (box.height - 100 + height * scale) / 2;
    const y = floorY - (window.sillHeight + window.height / 2) * scale;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x, y - 100 * scale, { steps: 5 }); await page.mouse.up();
    const moved = await exported();
    const opening = moved.windows[0];
    const half = opening.width / 2 / 600.5;
    const top = Math.min(...[-half, half].map(offset => startHeight + (endHeight - startHeight) * (opening.position + offset)));
    expect(opening.sillHeight).toBeGreaterThan(window.sillHeight);
    expect(opening.sillHeight + opening.height).toBeLessThanOrEqual(top + 1e-9);
    expect(opening.sillHeight + opening.height).toBeCloseTo(top, 8);
    expect({ ...opening, sillHeight: window.sillHeight }).toEqual(original.windows[0]);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect(await exported()).toEqual(original);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    expect(await exported()).toEqual(moved);
  });
}
