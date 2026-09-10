import type { Floor, CustomEntourageDef, Point } from '$lib/models/types';
import { multiSelectionBounds } from './multiSelectionBounds';

export function selectionRotation(floor: Floor, ids: ReadonlySet<string>, degrees: number, customDefs?: CustomEntourageDef[]) {
  const updates = new Map<string, {position: Point; rotation: number}>();
  if (!Number.isFinite(degrees) || degrees % 360 === 0) return updates;
  const items = [...floor.furniture,...floor.stairs ?? [],...floor.columns ?? [],...floor.entourage ?? []]
    .filter(item => ids.has(item.id) && !('locked' in item && item.locked));
  if (!items.length) return updates;
  const movableIds = new Set(items.map(item => item.id));
  const bounds = multiSelectionBounds({...floor,walls:[],doors:[],windows:[]},movableIds,customDefs);
  const pivot = bounds ? {x:(bounds.minX+bounds.maxX)/2,y:(bounds.minY+bounds.maxY)/2} : items[0].position;
  const angle = degrees * Math.PI/180, c = Math.cos(angle), s = Math.sin(angle);
  for (const item of items) {
    const dx = item.position.x-pivot.x, dy = item.position.y-pivot.y;
    updates.set(item.id,{position:{x:pivot.x+dx*c-dy*s,y:pivot.y+dx*s+dy*c},rotation:((item.rotation+degrees)%360+360)%360});
  }
  return updates;
}
