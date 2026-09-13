import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const placement of [0, 30, 'wall'] as const) test(`furniture placement at ${placement} uses one Undo and restores its final angle`, async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hasSeenWelcome', 'true'));
  await page.goto('/editor');
  if (placement === 'wall') {
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
    const floor = plan.floors[0];
    floor.walls = [{ ...floor.walls[0], start: { x: 0, y: -300 }, end: { x: 0, y: 300 }, thickness: 20 }];
    floor.doors = []; floor.windows = []; floor.rooms = []; floor.furniture = [];
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'wall-placement.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  }
  let projectId = '';
  async function exported() {
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
    const project = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
    projectId = project.id;
    return project.floors;
  }
  const before = await exported();
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await page.getByRole('button', { name: /^Sofa(?: Sofa)?(?: 200×90cm)?$/ }).first().click();
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  if (placement === 'wall') await page.getByRole('button', { name: 'Zoom to 100%', exact: true }).click();
  await canvas.focus();
  const rotation = placement === 'wall' ? 30 : placement;
  for (let step = 0; step < rotation / 15; step++) await canvas.press('r');
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * .5 + (placement === 'wall' ? 60 : 0), y: box.height * .5 } });
  await canvas.press('Escape');
  const placed = await exported();
  expect(placed[0].furniture).toHaveLength(before[0].furniture.length + 1);
  expect(placed[0].furniture.at(-1)).toMatchObject({ catalogId: 'sofa', rotation: placement === 'wall' ? 270 : rotation });
  if (placement === 'wall') expect(placed[0].furniture.at(-1).position.x).toBe(55); // 10cm wall half-thickness + 45cm sofa half-depth
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await exported()).toEqual(before);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await exported()).toEqual(placed);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
  await page.goto(`/editor?id=${projectId}`);
  expect(await exported()).toEqual(placed);
});
