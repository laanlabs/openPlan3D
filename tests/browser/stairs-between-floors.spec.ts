import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Issue #134: a stair reaches the neighbouring floor's elevation, a Down stair descends to
// the floor below, stacked views show the stairs of the other floors, and the active floor alone
// shows the stairs below its "Open to floor below" rooms.
test.describe.configure({ timeout: 180_000 });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-3d', 'first-export'])));
});

function ring(prefix: string, x0: number, y0: number, x1: number, y1: number) {
  const points = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  return points.map(([x, y], i) => ({ id: `${prefix}-${i}`, start: { x, y },
    end: { x: points[(i + 1) % 4][0], y: points[(i + 1) % 4][1] }, thickness: 20, height: 280, color: '#94a3b8' }));
}
const floor = (id: string, name: string, level: number, elevation: number) => ({ id, name, level, elevation,
  walls: [] as any[], rooms: [] as any[], doors: [], windows: [], furniture: [], stairs: [] as any[], columns: [],
  guides: [], measurements: [], annotations: [], textAnnotations: [], groups: [] });
const stair = (id: string, direction: 'up' | 'down') => ({ id, position: { x: 170, y: 210 }, rotation: 0,
  width: 100, depth: 300, riserCount: 14, direction, stairType: 'straight' });

function twoFloorPlan() {
  const ground = floor('ground', 'Ground Floor', 0, 0), first = floor('first', '1st Floor', 1, 320);
  ground.walls = ring('g', 0, 0, 600, 400);
  ground.rooms = [{ id: 'hall', name: 'Hall', walls: ground.walls.map(w => w.id), area: 24 }];
  ground.stairs = [stair('up-from-ground', 'up')];
  first.walls = [...ring('f', 0, 0, 600, 400), ...ring('well', 110, 50, 230, 370)];
  first.rooms = [{ id: 'landing', name: 'Landing', walls: first.walls.slice(0, 4).map(w => w.id), area: 20 },
    { id: 'well', name: 'Stairwell', walls: first.walls.slice(4).map(w => w.id), area: 3.8, floorOpening: true }];
  first.stairs = [stair('down-from-first', 'down')];
  return { id: 'stairs-between-floors', name: 'Stairs between floors', floors: [ground, first], activeFloorId: 'first',
    createdAt: '2026-11-09T00:00:00.000Z', updatedAt: '2026-11-09T00:00:00.000Z' };
}

async function exportedScene(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Blender Scene', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}

/** Stair meshes are the proxies inside the stair footprint (x 1.2–2.2 m, z 0.6–3.6 m, risers 2 cm thick). */
function stairMeshes(scene: any) {
  return scene.meshes.filter((mesh: any) => mesh.material === 'proxy' && mesh.vertices.every(([x, , z]: number[]) =>
    x > 1.19 && x < 2.21 && z > 0.58 && z < 3.62));
}
function span(meshes: any[]) {
  const ys = meshes.flatMap((mesh: any) => mesh.vertices.map((v: number[]) => v[1]));
  return [Math.min(...ys), Math.max(...ys)];
}

test('stairs span the floor-to-floor height and Down stairs descend, in active and stacked views', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const plan = twoFloorPlan();
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'stairs.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas[data-plan3d-canvas="true"]')).toBeVisible({ timeout: 60_000 });

  // Upper floor alone: its Down stair hangs from the floor surface to the floor below (320 cm), and the
  // stairwell's "Open to floor below" shows the ground floor's Up stair climbing into it, over the same span.
  const active = stairMeshes(await exportedScene(page));
  expect(active).toHaveLength(56); // two flights of 14 treads + 14 risers
  for (const flight of [active.slice(0, 28), active.slice(28)]) {
    const [low, high] = span(flight);
    expect(low).toBeCloseTo(-3.2, 5);
    expect(high).toBeCloseTo(0, 5);
  }
  await testInfo.attach('stairs-active-first-floor', { body: await page.screenshot(), contentType: 'image/png' });

  // Stacked: the ground floor's Up stair is drawn too, and both flights occupy the same 0–3.2 m.
  await page.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
  const stacked = stairMeshes(await exportedScene(page));
  expect(stacked).toHaveLength(56);
  for (const flight of [stacked.slice(0, 28), stacked.slice(28)]) {
    const [low, high] = span(flight);
    expect(low).toBeCloseTo(0, 5);
    expect(high).toBeCloseTo(3.2, 5);
  }
  await testInfo.attach('stairs-stacked-first-floor', { body: await page.screenshot(), contentType: 'image/png' });

  // Ground floor alone: its Up stair climbs to the 1st floor's 320 cm elevation, not a fixed 260 cm.
  await page.getByRole('button', { name: 'Active Floor Only', exact: true }).click();
  await page.getByRole('combobox').first().selectOption({ label: 'Ground Floor' });
  await expect.poll(async () => span(stairMeshes(await exportedScene(page)))[1]).toBeCloseTo(3.2, 5);
  const ground = stairMeshes(await exportedScene(page));
  expect(ground).toHaveLength(28);
  expect(span(ground)[0]).toBeCloseTo(0, 5);
  expect(errors).toEqual([]);
});
