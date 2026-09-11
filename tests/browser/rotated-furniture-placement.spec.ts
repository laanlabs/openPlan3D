import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const rotation of [0, 30]) test(`furniture placement at ${rotation} degrees uses one Undo and restores its final angle`, async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hasSeenWelcome', 'true'));
  await page.goto('/editor');
  async function exported() {
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors;
  }
  const before = await exported();
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await page.getByRole('button', { name: /^Sofa(?: Sofa)?(?: 200×90cm)?$/ }).first().click();
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  await canvas.focus();
  for (let step = 0; step < rotation / 15; step++) await canvas.press('r');
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * .5, y: box.height * .5 } });
  await canvas.press('Escape');
  const placed = await exported();
  expect(placed[0].furniture).toHaveLength(before[0].furniture.length + 1);
  expect(placed[0].furniture.at(-1)).toMatchObject({ catalogId: 'sofa', rotation });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await exported()).toEqual(before);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await exported()).toEqual(placed);
});
