/**
 * Stitch RoomPlan scans into an existing plan.
 *
 * Rooms scanned one at a time each arrive in their own coordinate frame, so a
 * scan is set down beside what the floor already holds, any identifiers the
 * project is already using are re-issued, and the user drags the new walls
 * into place. Everything here is pure; the project store commits a merge as
 * one undo step.
 */
import type { Floor, InterchangeState, Point, Project } from '$lib/models/types';
import { orderedFloors } from './floors';
import { wallPlanBounds } from './wallPlanGeometry';
import { furniturePlanBounds } from './furniturePlanBounds';
import { stairPlanBounds } from './stairPlanGeometry';
import { columnPlanBounds } from './columnPlanGeometry';

export type ContentBounds = { minX: number; minY: number; maxX: number; maxY: number };
/** Ids a merge appended to one floor, as they are in the project (re-issued where needed). */
export type AddedContent = { floorId: string; ids: string[] };

/** Floor lists whose items carry an id, in append order. */
const CONTENT_LISTS = ['walls', 'rooms', 'doors', 'windows', 'furniture', 'stairs', 'columns', 'guides', 'measurements', 'annotations', 'textAnnotations', 'groups', 'entourage'] as const;
type ContentList = typeof CONTENT_LISTS[number];
/** The lists the canvas can hold in one selection; rooms, groups and guides are selected through their members or not at all. */
const SELECTABLE_LISTS = ['walls', 'doors', 'windows', 'furniture', 'stairs', 'columns', 'entourage', 'textAnnotations', 'measurements', 'annotations'] as const;

function freshId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

/** An id outside `taken`, reserved there for later calls. */
function unusedId(taken: Set<string>): string {
  let id = freshId();
  while (taken.has(id)) id = freshId();
  taken.add(id);
  return id;
}

function contentIds(floor: Floor): string[] {
  const ids: string[] = [];
  for (const key of CONTENT_LISTS) for (const item of floor[key] ?? []) ids.push(item.id);
  return ids;
}

/** Those of `ids` that the canvas can select on the floor, in the floor's own order. */
export function selectableContentIds(floor: Floor, ids: Iterable<string>): string[] {
  const wanted = new Set(ids), out: string[] = [];
  for (const key of SELECTABLE_LISTS) for (const item of floor[key] ?? []) if (wanted.has(item.id)) out.push(item.id);
  return out;
}

/** Extent of everything drawn on the floor, or null when it is empty. Guides and the background image are not content. */
export function floorContentBounds(floor: Floor): ContentBounds | null {
  const boxes: ContentBounds[] = [];
  const point = (x: number, y: number) => boxes.push({ minX: x, minY: y, maxX: x, maxY: y });
  for (const wall of floor.walls) boxes.push(wallPlanBounds(wall));
  for (const item of floor.furniture) boxes.push(furniturePlanBounds(item));
  for (const item of floor.stairs ?? []) boxes.push(stairPlanBounds(item));
  for (const item of floor.columns ?? []) boxes.push(columnPlanBounds(item));
  // A symbol's height follows its image aspect; a square of its width is close enough for placement.
  for (const { position, width } of floor.entourage ?? []) {
    boxes.push({ minX: position.x - width / 2, minY: position.y - width / 2, maxX: position.x + width / 2, maxY: position.y + width / 2 });
  }
  for (const item of floor.textAnnotations ?? []) point(item.x, item.y);
  for (const item of [...floor.measurements ?? [], ...floor.annotations ?? []]) { point(item.x1, item.y1); point(item.x2, item.y2); }
  if (!boxes.length) return null;
  return boxes.reduce((a, b) => ({ minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) }));
}

/** Translate every positioned element by (dx, dy). Room label offsets are relative and guides stay put. */
export function offsetFloor(floor: Floor, dx: number, dy: number): Floor {
  const copy = structuredClone(floor);
  const move = (p: Point) => { p.x += dx; p.y += dy; };
  for (const wall of copy.walls) { move(wall.start); move(wall.end); if (wall.curvePoint) move(wall.curvePoint); }
  for (const item of [...copy.furniture, ...copy.stairs ?? [], ...copy.columns ?? [], ...copy.entourage ?? []]) move(item.position);
  for (const item of copy.textAnnotations ?? []) { item.x += dx; item.y += dy; }
  for (const item of [...copy.measurements ?? [], ...copy.annotations ?? []]) { item.x1 += dx; item.y1 += dy; item.x2 += dx; item.y2 += dy; }
  if (copy.backgroundImage) move(copy.backgroundImage.position);
  return copy;
}

/** Set `imported` down to the right of the existing content with `gapCm` of clear space, top edges aligned. Nothing moves when either floor is empty. */
export function placeFloorBeside(imported: Floor, existing: Floor, gapCm = 100): Floor {
  const target = floorContentBounds(existing), source = floorContentBounds(imported);
  if (!target || !source) return imported;
  return offsetFloor(imported, target.maxX + gapCm - source.minX, target.minY - source.minY);
}

/** Re-issue ids the project already uses on any floor, rewriting opening, room and group references. Other ids are kept. */
export function uniqueFloorIds(imported: Floor, project: Project, mapping = new Map<string, string>()): Floor {
  const floor = structuredClone(imported);
  const used = new Set(project.floors.flatMap(contentIds));
  const taken = new Set([...used, ...contentIds(floor)]);
  // `mapping` collects old → new ids so callers can follow references kept outside the floor.
  for (const key of CONTENT_LISTS) for (const item of floor[key] ?? []) {
    if (!used.has(item.id)) continue;
    const id = unusedId(taken);
    mapping.set(item.id, id);
    item.id = id;
  }
  if (!mapping.size) return floor;
  const remap = (id: string) => mapping.get(id) ?? id;
  for (const opening of [...floor.doors, ...floor.windows]) opening.wallId = remap(opening.wallId);
  for (const room of floor.rooms) room.walls = room.walls.map(remap);
  for (const group of floor.groups ?? []) group.elementIds = group.elementIds.map(remap);
  return floor;
}

/** Same shape as the store's createDefaultFloor, built here so the store can import this module without a cycle. */
function emptyFloor(id: string, name: string, level: number): Floor {
  return { id, name, level, walls: [], rooms: [], doors: [], windows: [], furniture: [], stairs: [], columns: [], guides: [], measurements: [], annotations: [], textAnnotations: [], groups: [] };
}

function appendContent(target: Floor, source: Floor): number {
  // Each list has its own item type; the cast lets one loop append all of them.
  const lists = target as unknown as Record<ContentList, unknown[] | undefined>;
  let count = 0;
  for (const key of CONTENT_LISTS) {
    const items = source[key];
    if (!items?.length) continue;
    lists[key] = [...lists[key] ?? [], ...items];
    count += items.length;
  }
  return count;
}

/**
 * Add imported storeys to a copy of the project, matched by level. Content
 * lands beside whatever that floor holds, with ids the project is not using;
 * a level the project lacks becomes a new floor named after the capture's
 * storey. The active floor is unchanged. `placed` counts the elements added and
 * `added` lists their final ids per target floor, in storey order, so a caller
 * can select what arrived; a storey that was empty still names its floor.
 */
export function mergeRoomPlanFloors(project: Project, floors: Floor[], gapCm = 100, interchange?: InterchangeState): { project: Project; placed: number; added: AddedContent[] } {
  const next = structuredClone(project);
  let placed = 0;
  const added: AddedContent[] = [];
  const mapping = new Map<string, string>();
  for (const imported of floors) {
    let target = orderedFloors(next.floors).find(entry => entry.level === imported.level)?.floor;
    if (!target) {
      target = emptyFloor(unusedId(new Set(next.floors.map(f => f.id))), imported.name, imported.level);
      next.floors.push(target);
    }
    const content = uniqueFloorIds(placeFloorBeside(imported, target, gapCm), next, mapping);
    placed += appendContent(target, content);
    const entry = added.find(a => a.floorId === target!.id);
    if (entry) entry.ids.push(...contentIds(content));
    else added.push({ floorId: target.id, ids: contentIds(content) });
  }
  if (interchange) next.interchange = mergeInterchangeState(next.interchange, interchange, id => mapping.get(id) ?? id);
  return { project: next, placed, added };
}

/**
 * Sibling planner data carried by a merged file. Object attributes follow their re-issued ids;
 * a block the plan already holds for the same planner wins (a second file of that planner adds
 * geometry only), and the plan's own defaults and notes are kept.
 */
export function mergeInterchangeState(existing: InterchangeState | undefined, incoming: InterchangeState, remap: (id: string) => string): InterchangeState {
  const attributes: Record<string, Record<string, unknown>> = structuredClone(existing?.attributes ?? {});
  for (const [id, value] of Object.entries(incoming.attributes ?? {})) attributes[remap(id)] = structuredClone(value);
  const defaults = existing?.defaults ?? incoming.defaults;
  const planNotes = existing?.planNotes ?? incoming.planNotes;
  return {
    version: 1,
    blocks: { ...structuredClone(incoming.blocks), ...structuredClone(existing?.blocks ?? {}) },
    ...(Object.keys(attributes).length ? { attributes } : {}),
    ...(defaults ? { defaults: structuredClone(defaults) } : {}),
    ...(planNotes ? { planNotes } : {}),
  };
}
