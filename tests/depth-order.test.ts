import { expect, it } from 'vitest';
import type { FurnitureItem } from '$lib/models/types';
import { DEPTH_ORDER, FURNITURE_DEPTH_LEVELS, FURNITURE_LEVEL_UNITS, depthOffset, furnitureDepthOffsets } from '$lib/utils/depthOrder';

const item = (x: number, y: number, rotation = 0): FurnitureItem =>
  ({ id: `${x},${y}`, catalogId: 'storage', position: { x, y }, rotation, scale: { x: 1, y: 1, z: 1 }, width: 40, depth: 40 } as FurnitureItem);
const units = (items: FurnitureItem[]) => furnitureDepthOffsets(items).map(offset => offset.polygonOffsetUnits);

it('gives overlapping or touching furniture different offsets and reuses them otherwise', () => {
  // a and b overlap, b and c touch, d stands apart, e overlaps a and b.
  const [a, b, c, d, e] = units([item(0, 0), item(30, 0), item(70, 0), item(300, 0), item(15, 10)]);
  expect(new Set([a, b, e]).size).toBe(3);
  expect(c).not.toBe(b);
  expect(d).toBe(DEPTH_ORDER.furniture);
  expect(Math.max(a, b, c, d, e)).toBe(DEPTH_ORDER.furniture);
});

it('draws the later of two overlapping pieces over the earlier one, as the plan does', () => {
  // The plan draws furniture in list order, later on top. b overlaps a, and c overlaps b only (two
  // rugs, say): c is on top in the plan, so it must win the plane it shares with b in 3D too.
  const [a, b, c] = units([item(0, 0), item(35, 0), item(70, 0)]);
  expect(b).toBeLessThan(a);
  expect(c).toBeLessThan(b);
  // Bring to Front moves a piece to the end of the list, and so in front in 3D.
  const [later, earlier] = units([item(35, 0), item(0, 0)]);
  expect(earlier).toBeLessThan(later);
});

it('breaks ties in the units alone and bounds them however many pieces stack', () => {
  // The factor scales with a face's depth slope: one that grew per level would pull a rug over the
  // bed standing on it, or a piece through the wall it stands behind, further at every level.
  const offsets = furnitureDepthOffsets(Array.from({ length: 10 }, () => item(0, 0)));
  for (const offset of offsets) expect(offset).toMatchObject({ polygonOffset: true, polygonOffsetFactor: DEPTH_ORDER.furniture });
  const levels = offsets.map(offset => (DEPTH_ORDER.furniture - offset.polygonOffsetUnits) / FURNITURE_LEVEL_UNITS);
  expect(levels).toEqual(levels.map((_, i) => Math.min(i, FURNITURE_DEPTH_LEVELS - 1)));
  expect(FURNITURE_DEPTH_LEVELS).toBeGreaterThan(1);
  // At most 12 units ahead of the first level: about 6 mm of depth at 20 m, 7 cm at 70 m.
  expect((FURNITURE_DEPTH_LEVELS - 1) * FURNITURE_LEVEL_UNITS).toBeLessThanOrEqual(12);
});

it('lets plan-only symbols take no level from the furniture they overlap', () => {
  const outlet = { ...item(0, 0), catalogId: 'sym_outlet' } as FurnitureItem;
  expect(furnitureDepthOffsets([outlet, item(0, 0)])).toEqual([depthOffset(DEPTH_ORDER.furniture), depthOffset(DEPTH_ORDER.furniture)]);
});
