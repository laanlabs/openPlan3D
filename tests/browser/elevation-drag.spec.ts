import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const action of ['Escape', 'Undo']) {
test(action === 'Escape' ? 'leaving elevation during a window drag retains an undoable edit' : 'Undo during an elevation window drag restores geometry and retains Redo', async ({ page }) => {
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  plan.floors[0].windows[0].wallId = plan.floors[0].walls[0].id;
  plan.floors[0].doors = [];
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'elevation.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
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
  const scale = Math.min((box.width - 136) / 600.5, (box.height - 100) / 250);
  const x = box.x + 72 + (box.width - 136) / 2;
  const floorY = box.y + 36 + (box.height - 100 + 250 * scale) / 2;
  const y = floorY - (90 + 120.5 / 2) * scale;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 40 * scale, y - 20 * scale, { steps: 5 });
  if (action === 'Undo') {
    await page.keyboard.press('ControlOrMeta+z');
    await page.mouse.up();
    expect(await exported()).toEqual(original);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
  }
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(canvas).toHaveCount(0);
  const moved = await exported();
  expect(moved.windows[0].position).toBeCloseTo(.5 + 40 / 600.5, 2);
  // Browsers quantize pointer coordinates to device pixels before cm rounding.
  expect(Math.abs(moved.windows[0].sillHeight - 110)).toBeLessThanOrEqual(Math.ceil(1 / scale));
  expect({ ...moved.windows[0], position: .5, sillHeight: 90 }).toEqual(original.windows[0]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await exported()).toEqual(original);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await exported()).toEqual(moved);
});
}
