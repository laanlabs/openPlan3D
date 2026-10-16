import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Issue #103: rooms scanned one at a time are stitched into one plan from the Build tab.
const fixturePath = resolve('tests/fixtures/handoff-roomplan.json');

async function addScanToPlan(page: Page) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import RoomPlan iOS LiDAR scan/ }).click();
  await (await chooser).setFiles(fixturePath);
  const dialog = page.getByRole('dialog', { name: 'Import RoomPlan', exact: true });
  await dialog.getByRole('radio', { name: /Add to this plan/ }).check();
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

async function exportJSON(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}

test('adding a RoomPlan scan twice stitches both beside the plan with unique ids, selects the new one and undoes one scan at a time', async ({ page }) => {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const onGround = (key: string) => fixture[key].filter((item: any) => (item.story ?? 0) === 0).length;
  const groundWalls = onGround('walls'), selectable = ['walls', 'doors', 'windows', 'objects'].reduce((n, key) => n + onGround(key), 0);
  const roomName: string = fixture.sections[0].displayName;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  const status = page.getByRole('application');
  await expect(status).toContainText('0 walls');

  await addScanToPlan(page);
  await expect(status).toContainText(`${groundWalls} walls`);
  await expect(page.getByRole('combobox', { name: 'Current floor', exact: true }).locator('option')).toHaveText(['Ground Floor', 'Loft', 'Future Floor']);
  // The scan arrives selected as one group, ready to be moved or rotated into place.
  await expect(status.getByText(`${selectable} selected`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Area Summary', exact: true }).click();
  const summary = page.getByRole('dialog', { name: 'Area Summary', exact: true });
  await expect(summary).toContainText(roomName);
  await page.keyboard.press('Escape');
  await expect(summary).toHaveCount(0);

  await addScanToPlan(page);
  await expect(status).toContainText(`${groundWalls * 2} walls`);
  await expect(status.getByText(`${selectable} selected`, { exact: true })).toBeVisible();
  const twice = await exportJSON(page), ground = twice.floors[0];
  expect(twice.floors).toHaveLength(3);
  expect(ground.walls).toHaveLength(groundWalls * 2);
  const all = ['walls', 'doors', 'windows', 'furniture', 'rooms'].flatMap(key => ground[key].map((item: any) => item.id));
  expect(new Set(all).size).toBe(all.length);
  const wallIds = ground.walls.map((wall: any) => wall.id);
  for (const opening of [...ground.doors, ...ground.windows]) expect(wallIds).toContain(opening.wallId);
  expect(ground.rooms.map((room: any) => room.name)).toEqual([roomName, roomName]);
  // The second scan landed beyond the first instead of on top of it.
  const xs = (walls: any[]) => walls.flatMap(wall => [wall.start.x, wall.end.x]);
  expect(Math.min(...xs(ground.walls.slice(groundWalls)))).toBeGreaterThan(Math.max(...xs(ground.walls.slice(0, groundWalls))));

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(status).toContainText(`${groundWalls} walls`);
  const once = await exportJSON(page);
  expect(once.floors[0].walls.map((wall: any) => wall.id)).toEqual(wallIds.slice(0, groundWalls));
  expect(once.floors[0].rooms.map((room: any) => room.name)).toEqual([roomName]);
  expect(errors).toEqual([]);
});
