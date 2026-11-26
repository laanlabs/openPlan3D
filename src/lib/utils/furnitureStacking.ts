import type { FurnitureItem } from '$lib/models/types';
import { getCatalogItem, getFurnitureSize } from './furnitureCatalog';
import { defaultFurnitureElevation, furnitureElevation, storedFurnitureElevation } from './furnitureElevation';

/**
 * Stacking: when two items share a spot on the floor, the smaller one rests on top of the larger.
 * "Share a spot" means the smaller item's centre lies inside the larger item's rotated footprint;
 * "smaller" compares footprint areas. Only items left at their default height of 0 stack, and a
 * height the user typed is never changed.
 *
 * A furniture top takes only loose items: seating, beds, rugs, fixtures and appliances stay on the
 * floor beside or under it. A platform (a deck) is a raised floor, so everything on it stands at
 * its height.
 */

const SEATING = ['sofa', 'loveseat', 'chair', 'office_chair', 'dining_chair', 'patio_chair', 'bench_outdoor', 'lounger', 'pool_lounge'];
const BEDS = ['bed_queen', 'bed_twin'];
const RUGS = ['rug', 'round_rug', 'runner_rug'];
/** Floor coverings outdoors; like rugs, things stand on the ground through them. */
const GROUND_COVER_CATEGORIES = new Set(['Paths & Lawns', 'Pool & Spa', 'Fencing']);

/**
 * Built in or plumbed in. A sink, stove or fridge set into a run of counters, or a scanned sink
 * inside its scanned cabinet, is centred on a larger item without standing on top of it.
 */
const FIXTURES = ['stove', 'fridge', 'sink_k', 'counter', 'dishwasher', 'oven', 'toilet', 'bathtub', 'shower', 'sink_b',
  'washer_dryer', 'fireplace', 'wardrobe', 'storage'];
/** Raised floors: whatever stands on one stands at its height, chairs and rugs included. */
const PLATFORMS = new Set(['deck_patio']);

/** Never lifted onto furniture: a chair tucked under a table or a rug under a coffee table stays on the floor. */
const STAYS_ON_FLOOR = new Set([...SEATING, ...BEDS, ...RUGS, ...FIXTURES, 'curtain', 'sheer_curtain', 'stairs',
  'garage_door_single', 'garage_door_double']);

/** Nothing rests on these: their tops are cushions, mattresses, roofs, canopies or water. */
const NOT_A_SURFACE = new Set([...SEATING, ...BEDS, ...RUGS, 'curtain', 'sheer_curtain', 'stairs', 'shower', 'bathtub',
  'tent', 'umbrella', 'pergola', 'gazebo', 'shed', 'greenhouse', 'greenhouse_small', 'arbor', 'trellis', 'string_lights',
  'car_sedan', 'car_suv', 'hedge_row', 'garage_door_single', 'garage_door_double']);

type Stackable = Pick<FurnitureItem, 'id' | 'catalogId' | 'customModelId' | 'position' | 'rotation' | 'scale' | 'width' | 'depth' | 'height' | 'elevation'>;

/** Plan-only symbols and wall or ceiling items (default height above 0) take no part in stacking. */
function takesPart(item: Stackable): boolean {
  if (item.customModelId) return true;
  const catalog = getCatalogItem(item.catalogId);
  if (catalog?.symbol || (catalog && GROUND_COVER_CATEGORIES.has(catalog.category) && item.catalogId !== 'deck_patio')) return false;
  if (item.catalogId.startsWith('tree_') || item.catalogId.startsWith('bush')) return false;
  return defaultFurnitureElevation(item) === 0;
}

const isPlatform = (item: Stackable) => !item.customModelId && PLATFORMS.has(item.catalogId);
/** Whether stacking can ever lift the item: onto a platform at least. */
export const canRest = (item: Stackable) => takesPart(item) && !isPlatform(item);
export const canHold = (item: Stackable) => takesPart(item) && (!!item.customModelId || !NOT_A_SURFACE.has(item.catalogId));
/** Whether `item` may rest on `base`: anything that stands on the floor stands on a platform; a furniture top takes only loose items. */
export function canRestOn(item: Stackable, base: Stackable): boolean {
  if (!canRest(item) || !canHold(base)) return false;
  return isPlatform(base) || !!item.customModelId || !STAYS_ON_FLOOR.has(item.catalogId);
}

const area = (item: Stackable) => { const s = getFurnitureSize(item as FurnitureItem); return s.width * s.depth; };

function covers(base: Stackable, point: { x: number; y: number }): boolean {
  const { width, depth } = getFurnitureSize(base as FurnitureItem);
  const angle = -(base.rotation * Math.PI) / 180;
  const dx = point.x - base.position.x, dy = point.y - base.position.y;
  const rx = dx * Math.cos(angle) - dy * Math.sin(angle), ry = dx * Math.sin(angle) + dy * Math.cos(angle);
  return Math.abs(rx) <= width / 2 + 1e-6 && Math.abs(ry) <= depth / 2 + 1e-6;
}

/** Top (cm above the floor) of the highest larger surface under the item's centre, or null when none. */
export function restingElevation(item: Stackable, furniture: readonly Stackable[]): number | null {
  const own = area(item);
  let top: number | null = null;
  for (const base of furniture) {
    if (base.id === item.id || !canRestOn(item, base) || area(base) <= own || !covers(base, item.position)) continue;
    const height = furnitureElevation(base) + getFurnitureSize(base as FurnitureItem).height;
    if (top === null || height > top) top = height;
  }
  return top;
}

const PLACEMENT_KEYS = ['catalogId', 'customModelId', 'width', 'depth', 'height', 'rotation', 'elevation'] as const;
function placementChanged(a: Stackable, b: Stackable): boolean {
  return a.position.x !== b.position.x || a.position.y !== b.position.y
    || a.scale.x !== b.scale.x || a.scale.y !== b.scale.y || a.scale.z !== b.scale.z
    || PLACEMENT_KEYS.some(key => a[key] !== b[key]);
}

/**
 * Heights to apply after an edit turned `before` into `after` (one floor's furniture). Returns the
 * new stored elevation (undefined = back on the floor) for each item whose height changes.
 *
 * Only items the edit touched are reconsidered: ones that were added, moved, resized or rotated,
 * and ones whose centre lies over such an item (or over one that was deleted) before or after the
 * edit. An item moves with the stack only while it sits at 0 or exactly on the surface under it;
 * an item whose height this edit set is left where the user put it.
 */
export function settleStacks(before: readonly Stackable[], after: readonly Stackable[]): Map<string, number | undefined> {
  const previous = new Map(before.map(item => [item.id, item]));
  const current = new Map(after.map(item => [item.id, { ...item }]));
  const changed: Stackable[] = [];
  for (const item of after) {
    const old = previous.get(item.id);
    if (!old || placementChanged(old, item)) changed.push(item);
  }
  for (const item of before) if (!current.has(item.id)) changed.push(item);
  if (!changed.length) return new Map();

  const footprints = [...changed, ...changed.map(item => previous.get(item.id)).filter((item): item is Stackable => !!item)];
  const pending = new Set<string>();
  for (const item of after) {
    if (!canRest(item)) continue;
    if (changed.includes(item) || footprints.some(f => f.id !== item.id && covers(f, item.position))) pending.add(item.id);
  }

  const manual = (item: Stackable) => {
    const old = previous.get(item.id);
    return !!old && old.elevation !== item.elevation;
  };
  const auto = (item: Stackable) => {
    if (item.elevation === undefined) return true;
    const old = previous.get(item.id);
    return !!old && old.elevation === item.elevation && restingElevation(old, before) === old.elevation;
  };

  const updates = new Map<string, number | undefined>();
  const list = [...current.values()];
  // Larger items first, so a surface settles before what rests on it; a change re-queues the items above.
  for (let pass = 0; pending.size && pass < after.length + 1; pass++) {
    const batch = [...pending].map(id => current.get(id)!).sort((a, b) => area(b) - area(a));
    pending.clear();
    for (const item of batch) {
      const original = after.find(i => i.id === item.id)!;
      if (manual(original) || !auto(original)) continue;
      const top = restingElevation(item, list);
      const next = top === null || top === 0 ? undefined : top;
      if (next === item.elevation) continue;
      item.elevation = next;
      updates.set(item.id, next);
      for (const other of list) if (other.id !== item.id && canRestOn(other, item) && covers(item, other.position) && area(other) < area(item)) pending.add(other.id);
    }
  }
  for (const [id, value] of updates) if (value === after.find(i => i.id === id)!.elevation) updates.delete(id);
  return updates;
}

/**
 * Stored form of a height typed in Properties. A typed default is normally stored as "no height",
 * which stacking reads as free to lift. Over a surface it is kept as a number instead, so an item
 * put back on the floor under a table stays there.
 */
export function typedFurnitureElevation(item: FurnitureItem, value: number, furniture: readonly Stackable[]): number | undefined {
  const stored = storedFurnitureElevation(item, value);
  return stored === undefined && restingElevation(item, furniture) !== null ? value : stored;
}

/** Plan drawing order: raised items over what they rest on; stable, so the user's order still applies at one height. */
export function byElevation<T extends Stackable>(furniture: readonly T[]): T[] {
  return [...furniture].sort((a, b) => furnitureElevation(a) - furnitureElevation(b));
}
