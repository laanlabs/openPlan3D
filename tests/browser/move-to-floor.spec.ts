import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// A selection moves to another floor from the selection toolbar, keeping its positions.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-3d', 'first-export'])));
});

async function exportJSON(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}

function ring(prefix: string, x0: number, y0: number, x1: number, y1: number) {
  const points = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  return points.map(([x, y], i) => ({ id: `${prefix}-${i}`, start: { x, y },
    end: { x: points[(i + 1) % 4][0], y: points[(i + 1) % 4][1] }, thickness: 15, height: 250, color: '#94a3b8' }));
}

function twoFloorPlan() {
  const empty = { doors: [], windows: [], furniture: [], stairs: [], columns: [], guides: [], measurements: [], annotations: [], textAnnotations: [], groups: [] };
  const walls = ring('w', 0, 0, 500, 400);
  const plan = { id: 'move', name: 'Move', activeFloorId: 'ground', createdAt: '2026-11-14T00:00:00.000Z', updatedAt: '2026-11-14T00:00:00.000Z',
    floors: [
      { id: 'ground', name: 'Ground Floor', level: 0, ...empty, walls,
        doors: [{ id: 'door', wallId: 'w-0', position: 0.5, width: 90, height: 210, type: 'single', swingDirection: 'left', flipSide: false }],
        rooms: [{ id: 'room', name: 'Upstairs Den', walls: walls.map(w => w.id), floorTexture: 'carpet-beige', area: 20 }] },
      { id: 'upper', name: 'Upstairs', level: 1, ...empty, walls: [], rooms: [] },
    ] };
  return { plan, walls };
}

async function openPlan(page: Page, plan: unknown) {
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'plan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
}

test('Select all, then Move to floor puts the walls, door and room on the other floor in place', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const { plan, walls } = twoFloorPlan();
  await openPlan(page, plan);
  const switcher = page.getByRole('combobox', { name: 'Current floor', exact: true });
  await expect(switcher).toHaveValue('ground');

  await page.locator('canvas').first().click({ position: { x: 20, y: 20 } });
  await page.keyboard.press('ControlOrMeta+a');
  const moveButton = page.getByRole('button', { name: 'Move to floor', exact: true });
  await moveButton.click();
  const menu = page.getByRole('menu', { name: 'Move to floor', exact: true });
  await expect(menu.getByRole('menuitem')).toHaveText(['Move to Upstairs']);
  await menu.getByRole('menuitem', { name: 'Move to Upstairs' }).click();

  await expect(switcher).toHaveValue('upper');
  await expect(page.getByRole('application')).toContainText('4 walls');
  const moved = await exportJSON(page);
  const [ground, upper] = moved.floors;
  expect([ground.walls.length, ground.doors.length, ground.rooms.length]).toEqual([0, 0, 0]);
  expect(upper.walls.map((w: any) => [w.id, w.start])).toEqual(walls.map(w => [w.id, w.start]));
  expect(upper.doors.map((d: any) => [d.id, d.wallId])).toEqual([['door', 'w-0']]);
  expect(upper.rooms.map((r: any) => r.name)).toEqual(['Upstairs Den']);

  // One Undo puts everything back downstairs.
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(switcher).toHaveValue('ground');
  await expect(page.getByRole('application')).toContainText('4 walls');
  expect(errors).toEqual([]);
});

