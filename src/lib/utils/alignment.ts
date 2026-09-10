import { get } from 'svelte/store';
import { activeFloor, currentProject, beginUndoGroup, endUndoGroup } from '$lib/stores/project';
import { furniturePlanBounds } from './furniturePlanBounds';
import { stairPlanBounds } from './stairPlanGeometry';
import { columnPlanBounds } from './columnPlanGeometry';
import { entouragePlanBounds } from './entouragePlanBounds';
import { entourageAspect } from './canvasRenderer';
import type { Floor, CustomEntourageDef, Point } from '$lib/models/types';

export type AlignmentOp = 'align-left' | 'align-right' | 'align-top' | 'align-bottom'
  | 'align-center-h' | 'align-center-v' | 'distribute-h' | 'distribute-v';

export function alignmentItems(floor: Floor, ids: ReadonlySet<string>) {
  return [...floor.furniture, ...floor.stairs ?? [], ...floor.columns ?? [], ...floor.entourage ?? []].filter(item => ids.has(item.id));
}

/** Position updates based on rendered extents; locked items act as fixed anchors. */
export function planAlignment(floor: Floor, ids: ReadonlySet<string>, op: AlignmentOp, customDefs?: CustomEntourageDef[]): Map<string, Point> {
  const rects = [
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

export function alignElements(ids: Set<string>, op: AlignmentOp) {
  const p = get(currentProject), floor = get(activeFloor);
  if (!p || !floor) return;
  const updates = planAlignment(floor,ids,op,p.customEntourage);
  if (!updates.size) return;
  beginUndoGroup();
  for (const item of alignmentItems(floor,ids)) {
    const pos = updates.get(item.id);
    if (pos) item.position = pos;
  }
  p.updatedAt = new Date();
  currentProject.set({...p});
  endUndoGroup(op.startsWith('distribute') ? 'Distributed selection' : 'Aligned selection');
}
