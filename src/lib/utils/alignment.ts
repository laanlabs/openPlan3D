import { get } from 'svelte/store';
import { activeFloor, currentProject, beginUndoGroup, endUndoGroup } from '$lib/stores/project';
import { wallPlanBounds } from './wallPlanGeometry';
import { furniturePlanBounds } from './furniturePlanBounds';
import { stairPlanBounds } from './stairPlanGeometry';
import { columnPlanBounds } from './columnPlanGeometry';
import { entouragePlanBounds } from './entouragePlanBounds';
import { planContentBounds } from './planContentBounds';
import { projectSettings } from '$lib/stores/settings';
import { entourageAspect } from './canvasRenderer';
import type { Floor, CustomEntourageDef, Point } from '$lib/models/types';

export type AlignmentOp = 'align-left' | 'align-right' | 'align-top' | 'align-bottom'
  | 'align-center-h' | 'align-center-v' | 'distribute-h' | 'distribute-v';

export function alignmentItems(floor: Floor, ids: ReadonlySet<string>) {
  return [...floor.walls, ...floor.furniture, ...floor.stairs ?? [], ...floor.columns ?? [], ...floor.entourage ?? [], ...floor.textAnnotations ?? [], ...floor.measurements ?? [], ...floor.annotations ?? []].filter(item => ids.has(item.id));
}

/** Position updates based on rendered extents; locked items act as fixed anchors. */
export function planAlignment(floor: Floor, ids: ReadonlySet<string>, op: AlignmentOp, customDefs?: CustomEntourageDef[], context?: CanvasRenderingContext2D, units: 'metric' | 'imperial' = 'metric'): Map<string, Point> {
  const annotationRects = context ? alignmentItems(floor, ids).flatMap(item => {
    if ('position' in item || 'start' in item) return [];
    const bounds = planContentBounds({ ...floor, walls: [], doors: [], windows: [], furniture: [],
      stairs: [], columns: [], entourage: [], backgroundImage: undefined,
      textAnnotations: (floor.textAnnotations ?? []).filter(n => n.id === item.id),
      measurements: (floor.measurements ?? []).filter(n => n.id === item.id),
      annotations: (floor.annotations ?? []).filter(n => n.id === item.id),
    }, { context, units, zoom: 1, entourageAspect: () => 1 });
    const position = 'x1' in item ? { x:(item.x1+item.x2)/2, y:(item.y1+item.y2)/2 } : { x:item.x, y:item.y };
    return bounds ? [{ item: { id:item.id, position }, bounds }] : [];
  }) : [];
  const rects = [
    ...annotationRects,
    ...floor.walls.map(wall => ({item:{id:wall.id,position:wall.start},bounds:wallPlanBounds(wall)})),
    ...floor.furniture.map(item => ({item,bounds:furniturePlanBounds(item)})),
    ...(floor.stairs ?? []).map(item => ({item,bounds:stairPlanBounds(item)})),
    ...(floor.columns ?? []).map(item => ({item,bounds:columnPlanBounds(item)})),
    ...(floor.entourage ?? []).map(item => ({item,bounds:entouragePlanBounds(item,entourageAspect(item.defId,customDefs))})),
  ].filter(r => ids.has(r.item.id)).map(r => ({...r, locked:'locked' in r.item && !!r.item.locked}));
  const updates = new Map<string, Point>();
  const distributing = op.startsWith('distribute');
  if (rects.length < (distributing ? 3 : 2)) return updates;
  const horizontal = ['align-left','align-right','align-center-h','distribute-h'].includes(op);
  const minKey = horizontal ? 'minX' : 'minY', maxKey = horizontal ? 'maxX' : 'maxY';
  const center = (r: typeof rects[number]) => (r.bounds[minKey]+r.bounds[maxKey])/2;
  function shift(r: typeof rects[number], delta: number) {
    if (r.locked || Math.abs(delta) < 1e-8) return;
    updates.set(r.item.id,{x:r.item.position.x+(horizontal?delta:0),y:r.item.position.y+(horizontal?0:delta)});
  }
  if (distributing) {
    const sorted = [...rects].sort((a,b) => center(a)-center(b));
    const anchors = sorted.map((r,i) => i===0 || i===sorted.length-1 || r.locked ? i : -1).filter(i => i>=0);
    for (let j=1;j<anchors.length;j++) {
      const start = anchors[j-1], end = anchors[j], a = center(sorted[start]), b = center(sorted[end]);
      for (let i=start+1;i<end;i++) shift(sorted[i],a+(b-a)*(i-start)/(end-start)-center(sorted[i]));
    }
  } else {
    const min = Math.min(...rects.map(r=>r.bounds[minKey])), max = Math.max(...rects.map(r=>r.bounds[maxKey]));
    const leading = op==='align-left' || op==='align-top', trailing = op==='align-right' || op==='align-bottom';
    for (const r of rects) shift(r, leading ? min-r.bounds[minKey] : trailing ? max-r.bounds[maxKey] : (min+max)/2-center(r));
  }
  return updates;
}

export function alignElements(ids: Set<string>, op: AlignmentOp, context?: CanvasRenderingContext2D) {
  const p = get(currentProject), floor = get(activeFloor);
  if (!p || !floor) return;
  // Measure at one pixel per world unit so alignment does not change with zoom.
  const measurementContext = context ?? (typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') ?? undefined : undefined);
  const updates = planAlignment(floor,ids,op,p.customEntourage,measurementContext,get(projectSettings).units);
  if (!updates.size) return;
  beginUndoGroup();
  for (const item of alignmentItems(floor,ids)) {
    const pos = updates.get(item.id);
    if (!pos) continue;
    if ('position' in item) item.position = pos;
    else if ('start' in item) {
      const dx=pos.x-item.start.x, dy=pos.y-item.start.y;
      item.start={...pos}; item.end={x:item.end.x+dx,y:item.end.y+dy};
      if (item.curvePoint) item.curvePoint={x:item.curvePoint.x+dx,y:item.curvePoint.y+dy};
    } else if ('x1' in item) {
      const dx=pos.x-(item.x1+item.x2)/2, dy=pos.y-(item.y1+item.y2)/2;
      item.x1+=dx; item.x2+=dx; item.y1+=dy; item.y2+=dy;
    } else { item.x=pos.x; item.y=pos.y; }
  }
  p.updatedAt = new Date();
  currentProject.set({...p});
  endUndoGroup(op.startsWith('distribute') ? 'Distributed selection' : 'Aligned selection');
}
