import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { benchmarkProject } from '../fixtures/render-benchmark';

for (const width of [1440, 390]) test(`deleting one room preserves its neighbors at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const plan = benchmarkProject('small');
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'neighbors.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  async function exported() {
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const before = await exported();
  const target = before.rooms.find((room: any) => room.name === 'Room 1,1');
  const neighbors = before.rooms.filter((room: any) => room.id !== target.id);
  const retained = new Set(neighbors.flatMap((room: any) => room.walls));
  const removed = new Set(target.walls.filter((id: string) => !retained.has(id)));
  expect(removed.size).toBe(2);
  await page.getByRole('button', { name: 'Save', exact: true }).press('l');
  await page.getByRole('button', { name: /Room 1,1/ }).click();
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  await canvas.focus(); await canvas.press('Shift+F10'); await page.keyboard.press('End');
  const action = page.getByRole('menuitem', { name: 'Delete Room' });
  await expect(action).toBeFocused(); await action.press('Enter');
  const after = await exported();
  expect(after).toEqual({
    ...before, rooms: neighbors,
    walls: before.walls.filter((wall: any) => !removed.has(wall.id)),
    doors: before.doors.filter((door: any) => !removed.has(door.wallId)),
    windows: before.windows.filter((win: any) => !removed.has(win.wallId)),
  });
  for (const room of neighbors) await expect(page.getByRole('button', { name: `Select room ${room.name}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await exported()).toEqual(before);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await exported()).toEqual(after);
});
