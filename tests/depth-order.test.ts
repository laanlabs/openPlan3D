import { expect, it } from 'vitest';
import type { FurnitureItem } from '$lib/models/types';
import { DEPTH_ORDER, furnitureDepthOffsets } from '$lib/utils/depthOrder';

const item = (x: number, y: number, rotation = 0): FurnitureItem =>
  ({ id: `${x},${y}`, catalogId: 'storage', position: { x, y }, rotation, scale: { x: 1, y: 1, z: 1 }, width: 40, depth: 40 } as FurnitureItem);

it('gives overlapping or touching furniture different offsets and reuses them otherwise', () => {
  // a and b overlap, b and c touch, d stands apart, e overlaps a and b.
  const [a, b, c, d, e] = furnitureDepthOffsets([item(0, 0), item(30, 0), item(70, 0), item(300, 0), item(15, 10)]);
  expect(new Set([a, b, e]).size).toBe(3);
  expect(c).not.toBe(b);
  expect(d).toBe(DEPTH_ORDER.furniture);
  expect(Math.max(a, b, c, d, e)).toBe(DEPTH_ORDER.furniture);
});

it('lets plan-only symbols take no level from the furniture they overlap', () => {
  const outlet = { ...item(0, 0), catalogId: 'sym_outlet' } as FurnitureItem;
  expect(furnitureDepthOffsets([outlet, item(0, 0)])).toEqual([DEPTH_ORDER.furniture, DEPTH_ORDER.furniture]);
});
