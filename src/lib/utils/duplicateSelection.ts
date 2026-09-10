import type { Floor, Point } from '$lib/models/types';

/** Copy selected plan objects and openings carried by copied walls. Mutates floor only. */
export function duplicatePlanSelection(floor: Floor, selected: ReadonlySet<string>, uid: () => string): string[] {
  const mapping = new Map<string, string>();
  const offset = (p: Point): Point => ({ x: p.x + 30, y: p.y + 30 });
  for (const wall of [...floor.walls]) {
    if (!selected.has(wall.id)) continue;
    const copy = structuredClone(wall);
    copy.id = uid(); mapping.set(wall.id, copy.id);
    copy.start = offset(copy.start); copy.end = offset(copy.end);
    if (copy.curvePoint) copy.curvePoint = offset(copy.curvePoint);
    floor.walls.push(copy);
  }
  for (const items of [floor.doors, floor.windows]) {
    for (const item of [...items]) {
      if (!selected.has(item.id) && !mapping.has(item.wallId)) continue;
      const copy = structuredClone(item);
      copy.id = uid(); mapping.set(item.id, copy.id);
      if (mapping.has(item.wallId)) copy.wallId = mapping.get(item.wallId)!;
      else copy.position = Math.min(1, copy.position + .1);
      // The collection determines the opening type; preserve all original fields.
      (items as typeof copy[]).push(copy);
    }
  }
  for (const items of [floor.furniture, floor.stairs ?? [], floor.columns ?? [], floor.entourage ?? []]) {
    for (const item of [...items]) {
      if (!selected.has(item.id)) continue;
      const copy = structuredClone(item);
      copy.id = uid(); mapping.set(item.id, copy.id);
      copy.position = offset(copy.position);
      (items as typeof copy[]).push(copy);
    }
  }
  for (const group of [...floor.groups ?? []]) {
    if (group.elementIds.length < 2 || !group.elementIds.every(id => mapping.has(id))) continue;
    floor.groups!.push({ ...structuredClone(group), id: uid(), elementIds: group.elementIds.map(id => mapping.get(id)!) });
  }
  return [...mapping.values()];
}
