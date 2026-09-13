import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('furniture context actions preserve size and undo stacking order', async ({ page }) => {
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/furniture-fidelity.openplan.json'));
  async function exported() {
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const before = await exported();
  await page.getByRole('button', { name: 'Toggle Layers Panel', exact: true }).click();
  await page.getByRole('button', { name: '💺 Armchair', exact: true }).first().click();
  async function action(name: RegExp) {
    const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
    await canvas.focus(); await canvas.press('Shift+F10');
    await page.getByRole('menuitem', { name }).click();
    await expect(canvas).toBeFocused();
  }
  await action(/Flip Horizontal/);
  const flipped = await exported();
  expect(flipped).toEqual({ ...before, furniture: before.furniture.map((item: any, index: number) => index ? item : { ...item, scale: { ...item.scale, x: -item.scale.x } }) });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await exported()).toEqual(before);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await exported()).toEqual(flipped);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await action(/Bring to Front/);
  const front = { ...before, furniture: [...before.furniture.slice(1), before.furniture[0]] };
  expect(await exported()).toEqual(front);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await exported()).toEqual(before);
  // Already at the back: a no-op must retain the redo of Bring to Front.
  await action(/Send to Back/);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await exported()).toEqual(front);
  await action(/Send to Back/);
  expect(await exported()).toEqual(before);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await exported()).toEqual(front);
});
