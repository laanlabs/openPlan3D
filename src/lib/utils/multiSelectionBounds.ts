import { planContentBounds } from './planContentBounds';
import { openingPlanBounds } from './openingPlanBounds';
import { entouragePlanBounds } from './entouragePlanBounds';
import type { Floor, CustomEntourageDef } from '$lib/models/types';
import { wallPlanBounds } from './wallPlanGeometry';
import { furniturePlanBounds } from './furniturePlanBounds';
import { stairPlanBounds } from './stairPlanGeometry';
import { columnPlanBounds } from './columnPlanGeometry';
import { entourageAspect } from './canvasRenderer';

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
/** Extents for the element kinds supported by the existing group-selection UI. */
export function multiSelectionBounds(floor: Floor, ids: ReadonlySet<string>, customDefs?: CustomEntourageDef[], zoom = 1, context?: CanvasRenderingContext2D, units: 'metric' | 'imperial' = 'metric'): Bounds | null {
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
  for (const item of floor.entourage ?? []) if (ids.has(item.id)) add(entouragePlanBounds(item, entourageAspect(item.defId, customDefs)));
  for (const [kind, openings] of [['door',floor.doors ?? []],['window',floor.windows ?? []]] as const) {
    for (const item of openings) if (ids.has(item.id)) {
      const wall = floor.walls.find(w => w.id === item.wallId);
      if (wall) add(openingPlanBounds(wall,item,kind,zoom));
    }
  }
  if (context) {
    const annotationBounds = planContentBounds({ ...floor, walls: [], doors: [], windows: [],
      furniture: [], stairs: [], columns: [], entourage: [], backgroundImage: undefined,
      textAnnotations: floor.textAnnotations?.filter(item => ids.has(item.id)),
      measurements: floor.measurements?.filter(item => ids.has(item.id)),
      annotations: floor.annotations?.filter(item => ids.has(item.id)),
    }, { context, zoom, units, entourageAspect: () => 1 });
    if (annotationBounds) add(annotationBounds);
  }
  if (!bounds) return null;
  const b = bounds as Bounds, pad = 20;
  return { minX:b.minX-pad,minY:b.minY-pad,maxX:b.maxX+pad,maxY:b.maxY+pad };
}
