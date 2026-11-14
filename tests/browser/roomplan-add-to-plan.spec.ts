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

test('a single-storey scan goes onto the floor picked in the dialog; a multi-storey scan goes onto matching floors', async ({ page }) => {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  // The ground storey alone, as an iPhone scan of one floor arrives.
  const single = { ...fixture, stories: undefined };
  for (const key of ['walls', 'doors', 'openings', 'windows', 'objects', 'sections']) {
    single[key] = (fixture[key] ?? []).filter((item: any) => (item.story ?? 0) === 0).map(({ story, ...item }: any) => item);
  }
  const plan = { id: 'two-floors', name: 'Two floors', activeFloorId: 'ground', createdAt: '2026-11-14T00:00:00.000Z', updatedAt: '2026-11-14T00:00:00.000Z',
    floors: ['ground', 'upper'].map((id, level) => ({ id, name: level ? 'Upstairs' : 'Basement', level, walls: [], rooms: [], doors: [], windows: [],
      furniture: [], stairs: [], columns: [], guides: [], measurements: [], annotations: [], textAnnotations: [], groups: [] })) };
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const planChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await planChooser).setFiles({ name: 'plan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  const floorSwitcher = page.getByRole('combobox', { name: 'Current floor', exact: true });
  await expect(floorSwitcher.locator('option')).toHaveText(['Basement', 'Upstairs']);

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import RoomPlan iOS LiDAR scan/ }).click();
  await (await chooser).setFiles({ name: 'upstairs.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(single)) });
  const dialog = page.getByRole('dialog', { name: 'Import RoomPlan', exact: true });
  const floorPicker = dialog.getByRole('combobox', { name: 'Floor', exact: true });
  await expect(floorPicker).toHaveCount(0); // only offered when adding to this plan
  await dialog.getByRole('radio', { name: /Add to this plan/ }).check();
  await expect(floorPicker.locator('option')).toHaveText(['Basement (current)', 'Upstairs']);
  await expect(floorPicker).toHaveValue('ground');
  await floorPicker.selectOption({ label: 'Upstairs' });
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  // The editor shows the floor the scan went onto, with the scan selected.
  await expect(floorSwitcher).toHaveValue('upper');
  const groundWalls = single.walls.length;
  await expect(page.getByRole('application')).toContainText(`${groundWalls} walls`);
  const exported = await exportJSON(page);
  expect(exported.floors.map((floor: any) => [floor.name, floor.walls.length])).toEqual([['Basement', 0], ['Upstairs', groundWalls]]);

  // A capture with several storeys keeps them on matching floors and says so instead of offering a floor.
  const again = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import RoomPlan iOS LiDAR scan/ }).click();
  await (await again).setFiles(fixturePath);
  await dialog.getByRole('radio', { name: /Add to this plan/ }).check();
  await expect(floorPicker).toHaveCount(0);
  await expect(dialog).toContainText('This scan has 3 floors. Each one goes onto the plan\'s floor at the same level.');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(errors).toEqual([]);
});
