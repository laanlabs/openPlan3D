import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { SPIRAL_START_ANGLE, SPIRAL_SWEEP, stairPlanRegions } from '../../src/lib/utils/stairPlanGeometry';

// Issue #134: in 3D a stair climbs the way its plan's UP arrow points, and L, U and spiral stairs keep their plan shape.
test.describe.configure({ timeout: 180_000 });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-3d', 'first-export'])));
});

type StairType = 'straight' | 'l-shaped' | 'u-shaped' | 'spiral';
const stairs = (['straight', 'l-shaped', 'u-shaped', 'spiral'] as StairType[]).map((stairType, i) => ({
  id: stairType, position: { x: 300 + i * 500, y: 400 }, rotation: 0, width: 100, depth: 300, riserCount: 14, direction: 'up' as const, stairType,
}));
const plan = {
  id: 'stair-shapes', name: 'Stair shapes', activeFloorId: 'ground', createdAt: '2026-11-09T00:00:00.000Z', updatedAt: '2026-11-09T00:00:00.000Z',
  floors: [{ id: 'ground', name: 'Ground Floor', level: 0, elevation: 0, walls: [], rooms: [], doors: [], windows: [], furniture: [], stairs,
    columns: [], guides: [], measurements: [], annotations: [], textAnnotations: [], groups: [] }],
};

async function exportedScene(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Blender Scene', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}

type Part = { x: number; z: number; low: number; high: number; vertices: number[][] };
/** Each stair's meshes in its own plan-local cm (rotation 0, so local y is world z), lowest first. */
function stairParts(scene: any, stair: (typeof stairs)[number]): Part[] {
  return scene.meshes
    .map((mesh: any) => mesh.vertices.map(([x, y, z]: number[]) => [x * 100 - stair.position.x, y * 100, z * 100 - stair.position.y]))
    .filter((vertices: number[][]) => vertices.every(([x]) => Math.abs(x) < 240))
    .map((vertices: number[][]) => {
      const mean = (k: number) => vertices.reduce((sum, v) => sum + v[k], 0) / vertices.length;
      const ys = vertices.map(v => v[1]);
      return { x: mean(0), z: mean(2), low: Math.min(...ys), high: Math.max(...ys), vertices };
    })
    .sort((a: Part, b: Part) => a.high - b.high);
}

test('3D stairs climb the way the plan arrow points and keep the plan shape', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'stairs.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas[data-plan3d-canvas="true"]')).toBeVisible({ timeout: 60_000 });
  const scene = await exportedScene(page);

  for (const stair of stairs) {
    const parts = stairParts(scene, stair);
    expect(parts.length, stair.stairType).toBeGreaterThan(stair.riserCount);
    const [first, last] = [parts[0], parts.at(-1)!];
    expect(last.high, stair.stairType).toBeCloseTo(260, 3);

    if (stair.stairType === 'spiral') {
      // Treads above the post's foot sweep from the plan's start angle in the plan's direction.
      const r = Math.min(stair.width, stair.depth) / 2;
      const treads = parts.filter(p => Math.hypot(p.x, p.z) > r * 0.3);
      expect(treads).toHaveLength(stair.riserCount);
      treads.forEach((tread, i) => {
        const expected = SPIRAL_START_ANGLE + ((i + 0.5) / stair.riserCount) * SPIRAL_SWEEP;
        const delta = Math.atan2(tread.z, tread.x) - expected;
        expect(Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))), `spiral tread ${i}`).toBeLessThan(0.1);
      });
      continue;
    }

    // Every vertex lies on the plan's footprint (risers and treads are at most 3 cm thick).
    const regions = stairPlanRegions(stair as any);
    for (const part of parts) for (const [x, , z] of part.vertices)
      expect(regions.some(r => x >= r.x - 1.5 && x <= r.x + r.width + 1.5 && z >= r.y - 1.5 && z <= r.y + r.height + 1.5),
        `${stair.stairType} vertex ${x.toFixed(1)}, ${z.toFixed(1)}`).toBe(true);

    // The plan's UP arrow points towards -y on the first run: the foot is at +y.
    expect(first.z, `${stair.stairType} foot`).toBeGreaterThan(100);
    if (stair.stairType === 'straight') expect(last.z).toBeLessThan(-100);
    if (stair.stairType === 'l-shaped') expect(last.x).toBeGreaterThan(stair.width);
    if (stair.stairType === 'u-shaped') { expect(first.x).toBeLessThan(0); expect(last.x).toBeGreaterThan(0); expect(last.z).toBeGreaterThan(100); }
  }
  expect(errors).toEqual([]);
});
