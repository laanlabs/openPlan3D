import type { Floor, Point, Wall } from '$lib/models/types';
import { wallPathProfile } from './wallProfiles';

/** Where a copy kept on the same wall lands: a tenth of the wall further along
 * per step, with its centre held half its width from either end so the whole
 * opening stays on the wall; an opening wider than its wall is centred on it.
 * Widths are measured along the viewer's faceted path: a curved wall clamps by
 * its arc, not its chord. */
export function shiftedOpeningPosition(wall: Wall, opening: { position: number; width: number }, step = 1): number {
  const position = Math.max(0, Math.min(1, opening.position + .1 * step));
  const path = wallPathProfile(wall), center = path.distanceAt(position);
  const half = Math.min(path.length, opening.width > 0 ? opening.width : 0) / 2;
  if (!(path.length > 0) || !Number.isFinite(center) || (center >= half && center <= path.length - half)) return position;
  // Invert distanceAt: saved positions are curve parameters spread evenly over the spans.
  const target = Math.max(half, Math.min(path.length - half, center));
  const index = path.spans.findIndex(span => span.length > 0 && target <= span.to), span = path.spans[index];
  return (index + (target - span.from) / span.length) / path.spans.length;
}

/** Copy selected plan objects and openings carried by copied walls. Mutates floor only. */
export function duplicatePlanSelection(floor: Floor, selected: ReadonlySet<string>, uid: () => string): string[] {
  return pastePlanSelection(floor, floor, selected, uid);
}

/** Paste saved geometry into a destination floor without consulting live source objects. */
export function pastePlanSelection(source: Floor, floor: Floor, selected: ReadonlySet<string>, uid: () => string, step = 1): string[] {
  const mapping = new Map<string, string>();
  const offset = (p: Point): Point => ({ x: p.x + 30 * step, y: p.y + 30 * step });
  for (const wall of [...source.walls]) {
    if (!selected.has(wall.id)) continue;
    const copy = structuredClone(wall);
    copy.id = uid(); mapping.set(wall.id, copy.id);
    copy.start = offset(copy.start); copy.end = offset(copy.end);
    if (copy.curvePoint) copy.curvePoint = offset(copy.curvePoint);
    floor.walls.push(copy);
  }
  for (const key of ['doors', 'windows'] as const) {
    const items = floor[key];
    for (const item of [...source[key]]) {
      if (!selected.has(item.id) && !mapping.has(item.wallId)) continue;
      if (!mapping.has(item.wallId) && !floor.walls.some(wall => wall.id === item.wallId)) continue;
      const copy = structuredClone(item);
      copy.id = uid(); mapping.set(item.id, copy.id);
      if (mapping.has(item.wallId)) copy.wallId = mapping.get(item.wallId)!;
      else copy.position = shiftedOpeningPosition(floor.walls.find(wall => wall.id === item.wallId)!, copy, step);
      // The collection determines the opening type; preserve all original fields.
      (items as typeof copy[]).push(copy);
    }
  }
  for (const key of ['furniture', 'stairs', 'columns', 'entourage'] as const) {
    for (const item of [...source[key] ?? []]) {
      if (!selected.has(item.id)) continue;
      const copy = structuredClone(item);
      copy.id = uid(); mapping.set(item.id, copy.id);
      copy.position = offset(copy.position);
      const items = floor[key] ?? (floor[key] = []);
      (items as typeof copy[]).push(copy);
    }
  }
  for (const key of ['textAnnotations','measurements','annotations'] as const) {
    for (const item of [...source[key] ?? []]) {
      if (!selected.has(item.id)) continue;
      const copy = structuredClone(item);
      copy.id = uid(); mapping.set(item.id,copy.id);
      if ('x' in copy) { copy.x += 30*step; copy.y += 30*step; }
      else { copy.x1 += 30*step; copy.y1 += 30*step; copy.x2 += 30*step; copy.y2 += 30*step; }
      const items = floor[key] ?? (floor[key] = []);
      (items as typeof copy[]).push(copy);
    }
  }
  for (const group of [...source.groups ?? []]) {
    if (group.elementIds.length < 2 || !group.elementIds.every(id => mapping.has(id))) continue;
    (floor.groups ??= []).push({ ...structuredClone(group), id: uid(), elementIds: group.elementIds.map(id => mapping.get(id)!) });
  }
  return [...mapping.values()];
}
