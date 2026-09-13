import type { Floor, CustomEntourageDef, Point } from '$lib/models/types';
import { multiSelectionBounds } from './multiSelectionBounds';
import { dimensionPlanGeometry } from './dimensionPlanGeometry';

type Endpoints = { x1: number; y1: number; x2: number; y2: number };
type RotationItem = { id: string; position: Point; rotation: number; endpoints?: Endpoints };
type RotationUpdate = Omit<RotationItem, 'id'>;

export function selectionRotation(floor: Floor, ids: ReadonlySet<string>, degrees: number, customDefs?: CustomEntourageDef[]) {
  const updates = new Map<string, RotationUpdate>();
  if (!Number.isFinite(degrees) || degrees % 360 === 0) return updates;
  const objects = [...floor.furniture,...floor.stairs ?? [],...floor.columns ?? [],...floor.entourage ?? []]
    .filter(item => ids.has(item.id) && !('locked' in item && item.locked));
  const notes = (floor.textAnnotations ?? []).filter(item => ids.has(item.id));
  const dimensions = [...floor.measurements ?? [],...floor.annotations ?? []].filter(item => ids.has(item.id));
  const items: RotationItem[] = [...objects,
    ...notes.map(item => ({ id:item.id,position:{x:item.x,y:item.y},rotation:item.rotation })),
    ...dimensions.map(item => ({ id:item.id,position:{x:(item.x1+item.x2)/2,y:(item.y1+item.y2)/2},
      rotation:Math.atan2(item.y2-item.y1,item.x2-item.x1)*180/Math.PI,
      endpoints:{x1:item.x1,y1:item.y1,x2:item.x2,y2:item.y2} }))];
  if (!items.length) return updates;
  const movableIds = new Set(items.map(item => item.id));
  let bounds = multiSelectionBounds({...floor,walls:[],doors:[],windows:[]},movableIds,customDefs);
  // Use editable geometry for a zoom-independent pivot; text captions do not move it.
  function include(point: Point) {
    const box = {minX:point.x-20,maxX:point.x+20,minY:point.y-20,maxY:point.y+20};
    if (!bounds) bounds=box;
    else { bounds.minX=Math.min(bounds.minX,box.minX);bounds.maxX=Math.max(bounds.maxX,box.maxX);
      bounds.minY=Math.min(bounds.minY,box.minY);bounds.maxY=Math.max(bounds.maxY,box.maxY); }
  }
  for (const note of notes) include({x:note.x,y:note.y});
  for (const item of dimensions) { include({x:item.x1,y:item.y1});include({x:item.x2,y:item.y2}); }
  for (const item of floor.annotations ?? []) if (movableIds.has(item.id)) {
    const geometry=dimensionPlanGeometry(item);
    if (geometry) { include(geometry.start);include(geometry.end); }
  }
  const pivot = items.length > 1 && bounds ? {x:(bounds.minX+bounds.maxX)/2,y:(bounds.minY+bounds.maxY)/2} : items[0].position;
  const angle = degrees * Math.PI/180, c = Math.cos(angle), s = Math.sin(angle);
  function rotate(point: Point): Point {
    const dx=point.x-pivot.x,dy=point.y-pivot.y;
    return {x:pivot.x+dx*c-dy*s,y:pivot.y+dx*s+dy*c};
  }
  for (const item of items) {
    const update: RotationUpdate = {position:rotate(item.position),rotation:((item.rotation+degrees)%360+360)%360};
    if (item.endpoints) {
      const a=rotate({x:item.endpoints.x1,y:item.endpoints.y1}),b=rotate({x:item.endpoints.x2,y:item.endpoints.y2});
      update.endpoints={x1:a.x,y1:a.y,x2:b.x,y2:b.y};
    }
    updates.set(item.id,update);
  }
  return updates;
}
