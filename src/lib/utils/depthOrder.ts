import type { FurnitureItem } from '$lib/models/types';
import { furniturePlanBounds } from './furniturePlanBounds';
import { getCatalogItem } from './furnitureCatalog';

/** Polygon offset per kind of surface in the 3D viewer; surfaces not listed (exterior wall faces,
 * wall ends) use 0. Where surfaces of different objects lie in one plane, the lower value is drawn.
 * Geometry keeps the viewer's own surfaces apart where it can; this order settles what users place
 * against each other.
 *
 * The factor part of an offset scales with a face's depth slope, so a higher value also pushes a
 * surface back by centimetres at glancing views, behind nearby parallel faces it stands in front
 * of. Columns therefore stay at 0: ahead of wall tops and interior faces (a column as tall as the
 * wall it stands in keeps its top), level with exterior faces (a column inside a thicker wall cannot
 * show through it). Square columns stand COLUMN_SKIN proud of their plan outline, so one exactly as
 * thick as its wall does not share the planes of its faces. */
export const DEPTH_ORDER = {
  furniture: -2,
  roomFloor: -1,
  openingFrame: -1,
  column: 0,
  interiorWall: 1,
  slab: 1,
  basePlane: 1,
  ground: 3,
} as const;

export interface DepthOffset { polygonOffset: true; polygonOffsetFactor: number; polygonOffsetUnits: number }

export function depthOffset(factor: number, units = factor): DepthOffset {
  return { polygonOffset: true, polygonOffsetFactor: factor, polygonOffsetUnits: units };
}

/** Tie-break levels furniture can take; deeper stacks of overlapping pieces share the last one. */
export const FURNITURE_DEPTH_LEVELS = 4;

/** Polygon offset units between two furniture levels. One unit is the smallest depth step a GPU
 * resolves, but depth interpolation between two pieces' triangles differs by more at low views: in
 * Firefox and Safari a rug laid over another of the same height lost up to 60% of their overlap
 * at one unit apart, and under 10% at four. Four units are about 2 mm of depth at 20 m. */
export const FURNITURE_LEVEL_UNITS = 4;

/** Offset per item. Every item keeps the factor at DEPTH_ORDER.furniture, so no piece is pulled
 * further through a wall or over a neighbour at glancing views than another; ties are broken in
 * the units only, which do not grow with a face's depth slope. Where footprints overlap or touch,
 * the item later in the list, which the plan draws on top, is drawn over the earlier ones: it
 * takes one level more than the deepest of them, up to FURNITURE_DEPTH_LEVELS - 1. Plan-only
 * symbols have no 3D model and take no level from their neighbours. */
export function furnitureDepthOffsets(items: FurnitureItem[]): DepthOffset[] {
  const bounds = items.map(item => getCatalogItem(item.catalogId)?.symbol && !item.customModelId ? null : furniturePlanBounds(item));
  const levels: number[] = [];
  for (const [i, a] of bounds.entries()) {
    let level = 0;
    for (const [j, b] of bounds.slice(0, i).entries()) {
      if (a && b && a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY) level = Math.max(level, levels[j] + 1);
    }
    levels.push(Math.min(level, FURNITURE_DEPTH_LEVELS - 1));
  }
  return levels.map(level => depthOffset(DEPTH_ORDER.furniture, DEPTH_ORDER.furniture - level * FURNITURE_LEVEL_UNITS));
}
