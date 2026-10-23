import type { FurnitureItem } from '$lib/models/types';
import { furniturePlanBounds } from './furniturePlanBounds';
import { getCatalogItem } from './furnitureCatalog';

/** Polygon offset per kind of surface in the 3D viewer; surfaces not listed use 0. Where surfaces
 * of different objects lie in one plane, the lower value is drawn. Geometry keeps the viewer's own
 * surfaces apart where it can; this order settles what users place against each other. */
export const DEPTH_ORDER = {
  furniture: -2,
  roomFloor: -1,
  openingFrame: -1,
  interiorWall: 1,
  slab: 1,
  basePlane: 1,
  column: 2,
  ground: 3,
} as const;

export function depthOffset(offset: number) {
  return { polygonOffset: true, polygonOffsetFactor: offset, polygonOffsetUnits: offset };
}

/** Offset per item. Items whose footprints overlap or touch get different offsets, so one of
 * them is always drawn over the other; the first item in the list gets DEPTH_ORDER.furniture.
 * Plan-only symbols have no 3D model and take no level from their neighbours. */
export function furnitureDepthOffsets(items: FurnitureItem[]): number[] {
  const bounds = items.map(item => getCatalogItem(item.catalogId)?.symbol && !item.customModelId ? null : furniturePlanBounds(item));
  const levels: number[] = [];
  for (const [i, a] of bounds.entries()) {
    const taken = new Set(a ? bounds.slice(0, i).flatMap((b, j) =>
      b && a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY ? [levels[j]] : []) : []);
    let level = 0;
    while (taken.has(level)) level++;
    levels.push(level);
  }
  return levels.map(level => DEPTH_ORDER.furniture - level);
}
