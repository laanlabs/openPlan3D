import { readFileSync } from 'node:fs';
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
  // At 1 or 2 units apart, a rug over another of the same height still lost part of the overlap
  // in Firefox and Safari at low views (see FURNITURE_LEVEL_UNITS).
  expect(FURNITURE_LEVEL_UNITS).toBeGreaterThanOrEqual(4);
});

it('lets plan-only symbols take no level from the furniture they overlap', () => {
  const outlet = { ...item(0, 0), catalogId: 'sym_outlet' } as FurnitureItem;
  expect(furnitureDepthOffsets([outlet, item(0, 0)])).toEqual([depthOffset(DEPTH_ORDER.furniture), depthOffset(DEPTH_ORDER.furniture)]);
});

// Unlisted surfaces, exterior wall faces and wall ends among them, draw with no offset.
const EXTERIOR_WALL = 0;

it('keeps the order that settles the planes surfaces share in the viewer', () => {
  const { furniture, roomFloor, openingFrame, interiorWall, slab, basePlane, ground } = DEPTH_ORDER;
  // Furniture ahead of frames and room floors.
  expect(furniture).toBeLessThan(Math.min(roomFloor, openingFrame));
  // Frames and room floors ahead of both wall faces (jambs in the reveals, floors at the wall foot).
  expect(Math.max(roomFloor, openingFrame)).toBeLessThan(Math.min(EXTERIOR_WALL, interiorWall));
  // Room floors (1 cm up) ahead of the slab (top at 0) and the site floor plane (0.5 cm): with the
  // plane ahead, as before #122, it covered every room floor from a distance.
  expect(roomFloor).toBeLessThan(Math.min(slab, basePlane));
  // Everything ahead of the ground (1 cm down).
  expect(Math.max(EXTERIOR_WALL, interiorWall, slab, basePlane)).toBeLessThan(ground);
});

it('is where the viewer takes every polygon offset from', () => {
  const viewer = readFileSync(new URL('../src/lib/components/viewer3d/ThreeViewer.svelte', import.meta.url), 'utf8');
  expect(viewer).not.toMatch(/polygonOffset/);
  const applied = new Set([...viewer.matchAll(/depthOffset\(DEPTH_ORDER\.(\w+)\)/g)].map(match => match[1]));
  expect([...applied].sort()).toEqual(Object.keys(DEPTH_ORDER).filter(key => key !== 'furniture').sort());
  expect(viewer).toMatch(/const floorMat = new THREE\.MeshStandardMaterial\(\{[^}]*\.\.\.depthOffset\(DEPTH_ORDER\.basePlane\) \}\)/);
  expect(viewer).toContain('Object.assign(groundMat, depthOffset(DEPTH_ORDER.ground));');
  expect(viewer).toContain('Object.assign(material, depthOffset(DEPTH_ORDER.roomFloor));');
  expect(viewer).toContain('const furnitureOffsets = furnitureDepthOffsets(floor.furniture);');
});
