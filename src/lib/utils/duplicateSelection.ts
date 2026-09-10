import type { Floor, Point } from '$lib/models/types';

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
      else copy.position = Math.min(1, copy.position + .1 * step);
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
