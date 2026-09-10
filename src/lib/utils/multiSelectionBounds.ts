import type { Floor } from '$lib/models/types';
import { wallPlanBounds } from './wallPlanGeometry';
import { furniturePlanBounds } from './furniturePlanBounds';
import { stairPlanBounds } from './stairPlanGeometry';
import { columnPlanBounds } from './columnPlanGeometry';
import { wallPointAt } from './canvasRenderer';

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
/** Extents for the element kinds supported by the existing group-selection UI. */
export function multiSelectionBounds(floor: Floor, ids: ReadonlySet<string>): Bounds | null {
  if (ids.size < 2) return null;
  let bounds: Bounds | null = null;
  function add(b: Bounds) {
    if (!bounds) bounds = { ...b };
    else { bounds.minX = Math.min(bounds.minX,b.minX); bounds.minY = Math.min(bounds.minY,b.minY);
      bounds.maxX = Math.max(bounds.maxX,b.maxX); bounds.maxY = Math.max(bounds.maxY,b.maxY); }
  }
  for (const item of floor.walls) if (ids.has(item.id)) add(wallPlanBounds(item));
  for (const item of floor.furniture) if (ids.has(item.id)) add(furniturePlanBounds(item));
  for (const item of floor.stairs ?? []) if (ids.has(item.id)) add(stairPlanBounds(item));
  for (const item of floor.columns ?? []) if (ids.has(item.id)) add(columnPlanBounds(item));
  // Opening anchors retain their existing selection behavior, following curved walls.
  for (const item of [...floor.doors, ...floor.windows]) if (ids.has(item.id)) {
    const wall = floor.walls.find(w => w.id === item.wallId);
    if (wall) { const p = wallPointAt(wall,item.position); add({ minX:p.x,maxX:p.x,minY:p.y,maxY:p.y }); }
  }
  if (!bounds) return null;
  const b = bounds as Bounds, pad = 20;
  return { minX:b.minX-pad,minY:b.minY-pad,maxX:b.maxX+pad,maxY:b.maxY+pad };
}
