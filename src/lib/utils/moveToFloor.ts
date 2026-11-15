import type { Floor } from '$lib/models/types';

const OBJECT_LISTS = ['furniture', 'stairs', 'columns', 'entourage', 'textAnnotations', 'measurements', 'annotations'] as const;

/**
 * Move selected content from `source` to `target`, keeping every position, so a scan or
 * part of a plan placed on the wrong floor can be put on the right one. Mutates both floors.
 *
 * - Walls carry their doors and windows. A door or window selected without its wall stays.
 * - Objects, stairs, columns, entourage and notes move when selected.
 * - A saved room moves when all of its walls move; otherwise it stays, as if those walls
 *   had been deleted.
 * - A group moves when all of its members move; otherwise the moved members leave it, and
 *   a group left with fewer than two members is dropped.
 * - Ids already used on `target` are re-issued, with references updated.
 *
 * Returns the moved elements' ids as they are on `target`, rooms and groups excluded.
 */
export function movePlanSelection(source: Floor, target: Floor, selected: ReadonlySet<string>, uid: () => string): string[] {
  type Identified = { id: string };
  /** The floor's list under `key`, typed loosely: every list holds items with an id. */
  const list = (floor: Floor, key: (typeof OBJECT_LISTS)[number]) => floor[key] as Identified[] | undefined;
  const taken = new Set<string>(([
    ...target.walls, ...target.doors, ...target.windows, ...target.rooms, ...target.groups ?? [],
    ...OBJECT_LISTS.flatMap(key => list(target, key) ?? []),
  ] as Identified[]).map(item => item.id));
  const mapping = new Map<string, string>();
  const claim = (id: string) => {
    const next = taken.has(id) ? uid() : id;
    taken.add(next);
    mapping.set(id, next);
    return next;
  };
  const moved: string[] = [];

  const walls = source.walls.filter(wall => selected.has(wall.id));
  const wallIds = new Set(walls.map(wall => wall.id));
  source.walls = source.walls.filter(wall => !wallIds.has(wall.id));
  for (const wall of walls) {
    wall.id = claim(wall.id);
    target.walls.push(wall);
    moved.push(wall.id);
  }

  for (const key of ['doors', 'windows'] as const) {
    const going = source[key].filter(item => wallIds.has(item.wallId));
    (source[key] as typeof going) = source[key].filter(item => !wallIds.has(item.wallId));
    for (const item of going) {
      item.id = claim(item.id);
      item.wallId = mapping.get(item.wallId)!;
      (target[key] as typeof going).push(item);
      moved.push(item.id);
    }
  }

  const lists = source as unknown as Record<string, Identified[] | undefined>;
  const targetLists = target as unknown as Record<string, Identified[] | undefined>;
  for (const key of OBJECT_LISTS) {
    const items = lists[key];
    if (!items?.length) continue;
    const going = items.filter(item => selected.has(item.id));
    if (!going.length) continue;
    lists[key] = items.filter(item => !selected.has(item.id));
    const into = targetLists[key] ?? (targetLists[key] = []);
    for (const item of going) {
      item.id = claim(item.id);
      into.push(item);
      moved.push(item.id);
    }
  }

  const rooms = source.rooms.filter(room => room.walls.length > 0 && room.walls.every(id => wallIds.has(id)));
  source.rooms = source.rooms.filter(room => !rooms.includes(room));
  for (const room of rooms) {
    room.id = claim(room.id);
    room.walls = room.walls.map(id => mapping.get(id)!);
    target.rooms.push(room);
  }

  const groups = source.groups ?? [];
  const keptGroups = [];
  for (const group of groups) {
    if (group.elementIds.length && group.elementIds.every(id => mapping.has(id))) {
      group.id = claim(group.id);
      group.elementIds = group.elementIds.map(id => mapping.get(id)!);
      (target.groups ??= []).push(group);
    } else {
      group.elementIds = group.elementIds.filter(id => !mapping.has(id));
      if (group.elementIds.length >= 2) keptGroups.push(group);
    }
  }
  if (source.groups) source.groups = keptGroups;

  return moved;
}
