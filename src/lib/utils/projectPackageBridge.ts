import type { Project, DetailKind, PackageMapping } from '$lib/models/types';
import { createDefaultFloor, createDefaultProject } from '$lib/stores/project';
import { readProject } from './projectValidation';
import { detectRooms, getRoomPolygon, roomCentroid } from './roomDetection';
import { getFurnitureSize } from './furnitureCatalog';
import { exportedFurnitureCategory, importedFurnitureCategory } from './furnitureCategories';
import { packageError, safePackagePath } from './projectPackageZip';
import { nativeItemDetails, withNativeDetails } from './itemDetails';

type ObjectMap = Record<string, any>;
export type { PackageMapping } from '$lib/models/types';
const kinds = ['walls', 'openings', 'furniture', 'rooms', 'notes', 'levels'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const packageId = () => crypto.randomUUID();
const key = (id: string) => id.toLowerCase();
const cm = (m: number) => Math.round(m * 1e10) / 1e8;
const meters = (n: number) => n / 100;
const point = (p: any, scale = 100) => ({ x: p.x * scale, y: p.y * scale });
const equal = (a: any, b: any): boolean => {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(a), Math.abs(b));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every(k => equal(a[k], b[k]));
  }
  return a === b;
};
const object = (v: any) => v && typeof v === 'object' && !Array.isArray(v);

/** Validate native plan fields before projecting them. Unknown fields stay on the native document. */
export function validatePackagePlan(plan: any): ObjectMap {
  const fail = () => packageError('The edited iPhone plan contains invalid geometry or references.');
  const num = (n: any, min = -Infinity, positive = false) => { if (typeof n !== 'number' || !Number.isFinite(n) || n < min || positive && n <= min) fail(); };
  const xy = (p: any) => { if (!object(p)) fail(); num(p.x); num(p.y); if (Math.abs(p.x) > 10_000 || Math.abs(p.y) > 10_000) fail(); };
  if (!object(plan) || !Array.isArray(plan.walls)) fail();
  const result = structuredClone(plan), seen = new Set<string>();
  let count = 0;
  for (const kind of kinds) {
    const items = result[kind] === undefined || kind === 'levels' && result[kind] === null ? [] : result[kind];
    if (!Array.isArray(items)) fail();
    result[kind] = items;
    for (const item of items) {
      if (!object(item) || typeof item.id !== 'string' || !uuidPattern.test(item.id) || seen.has(key(item.id)) || ++count > 5000) fail();
      seen.add(key(item.id));
      for (const field of ['height', 'thickness', 'width', 'depth', 'ceilingHeight', 'fontSize']) if (item[field] != null) {
        num(item[field], 0, true); if (item[field] > (field === 'thickness' ? 10 : 10_000)) fail();
      }
      for (const field of ['price', 'sillHeight']) if (item[field] != null) num(item[field], 0);
      if (item.sillHeight != null && item.sillHeight > 10_000) fail();
      for (const field of ['angle']) if (item[field] != null) { num(item[field]); if (Math.abs(item[field]) > 100_000) fail(); }
      for (const field of ['name', 'text', 'note', 'material', 'style', 'category', 'colorHex']) if (item[field] != null && typeof item[field] !== 'string') fail();
      if (item.level != null && (!Number.isSafeInteger(item.level) || Math.abs(item.level) > 1000)) fail();
      if (item.photos != null && (!Array.isArray(item.photos) || item.photos.some((name: any) => typeof name !== 'string' || !safePackagePath(name)))) fail();
      for (const field of ['hingeLeft', 'opensInward']) if (item[field] != null && typeof item[field] !== 'boolean') fail();
      if (kind === 'walls') { xy(item.start); xy(item.end); if (equal(item.start, item.end)) fail(); }
      if (kind === 'openings') {
        if (!['door', 'window'].includes(item.kind) || typeof item.wallID !== 'string' || !result.walls.some((w: any) => key(w.id) === key(item.wallID))) fail();
        num(item.position, 0); if (item.position > 1) fail(); num(item.width, 0, true);
      }
      if (kind === 'furniture') { xy(item.center); num(item.angle); num(item.width, 0, true); num(item.depth, 0, true); if (typeof item.category !== 'string') fail(); }
      if (kind === 'rooms') {
        if (item.floorOpening != null && typeof item.floorOpening !== 'boolean') fail();
        if (item.boundaryWallIDs != null && (!Array.isArray(item.boundaryWallIDs) || item.boundaryWallIDs.length > 5000 || item.boundaryWallIDs.some((id: any) => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))) fail();
        xy(item.center); if (typeof item.name !== 'string') fail();
        if (item.type != null && !['livingRoom', 'bedroom', 'kitchen', 'bathroom', 'diningRoom', 'laundryRoom', 'office', 'hallway', 'garage', 'closet', 'pantry', 'entryway'].includes(item.type)) fail();
      }
      if (kind === 'notes') { xy(item.position); if (typeof item.text !== 'string') fail(); }
      if (kind === 'levels' && item.elevation != null) { num(item.elevation); if (Math.abs(item.elevation) > 10_000) fail(); }
      if (kind === 'levels' && item.slabThickness != null) { num(item.slabThickness, 0, true); if (item.slabThickness > 10_000) fail(); }
      if (kind === 'levels' && (typeof item.name !== 'string' || !Number.isSafeInteger(item.index) || Math.abs(item.index) > 1000)) fail();
    }
  }
  if (new Set(result.levels.map((l: any) => l.index)).size !== result.levels.length) fail();
  if (result.planNotes != null && typeof result.planNotes !== 'string') fail();
  if (result.defaults != null) {
    if (!object(result.defaults)) fail();
    for (const field of ['ceilingHeight', 'interiorWallThickness', 'exteriorWallThickness']) if (result.defaults[field] != null) {
      num(result.defaults[field], 0, true); if (result.defaults[field] > (field === 'ceilingHeight' ? 10_000 : 10)) fail();
    }
  }
  if (result.underlay != null) {
    if (!object(result.underlay) || typeof result.underlay.imageFilename !== 'string' || !safePackagePath(result.underlay.imageFilename)) fail();
    if (result.underlay.angle != null) { num(result.underlay.angle); if (Math.abs(result.underlay.angle) > 100_000) fail(); }
    xy(result.underlay.center); num(result.underlay.widthMeters, 0, true); if (result.underlay.widthMeters > 10_000) fail();
  }
  return result;
}
export function nativeAssetNames(plan: ObjectMap): string[] {
  return [...new Set<string>([...plan.furniture, ...plan.rooms].flatMap(item => item.photos ?? []).concat(plan.underlay ? [plan.underlay.imageFilename] : []))];
}
export function validatePackageMapping(value: any): PackageMapping {
  if (!Array.isArray(value) || value.length > 5000) packageError('Invalid identity map.');
  const seen = new Set<string>(), targets = new Set<string>();
  for (const entry of value) {
    if (!object(entry) || typeof entry.id !== 'string' || !uuidPattern.test(entry.id) ||
        !['levels', 'walls', 'doors', 'windows', 'furniture', 'rooms', 'textAnnotations'].includes(entry.kind) ||
        typeof entry.webId !== 'string' || !entry.webId || entry.kind !== 'levels' && (typeof entry.floorId !== 'string' || !entry.floorId)) packageError('Invalid identity map.');
    const target = JSON.stringify([entry.floorId, entry.kind, entry.webId]);
    if (seen.has(key(entry.id)) || targets.has(target)) packageError('Duplicate mapped identity.');
    seen.add(key(entry.id)); targets.add(target);
  }
  return structuredClone(value);
}
function inside(p: any, polygon: any[]) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}
function nativeFloorIndices(plan: ObjectMap): number[] {
  const explicit = plan.levels.map((l: any) => l.index);
  const implicit = [...plan.walls, ...plan.furniture, ...plan.rooms].map((item: any) => item.level ?? 0);
  return [...new Set<number>([...explicit, ...implicit, ...(explicit.length || implicit.length ? [] : [0])])];
}
/** Project only fields both editors understand. A baseline lets unchanged lossy
 * projections preserve richer web details, such as mirrored furniture and sloped walls. */
export function nativeToWeb(plan: ObjectMap, mapping: PackageMapping, title: string): Project {
  const project = createDefaultProject(title), byId = new Map(mapping.map(m => [key(m.id), m]));
  const mapped = (id: string) => byId.get(key(id))?.webId ?? id;
  const indices = nativeFloorIndices(plan);
  const firstFloorId = plan.levels[0] ? mapped(plan.levels[0].id) : `native-floor-${indices[0]}`;
  project.description = plan.planNotes ?? '';
  project.floors = indices.map(level => {
    const meta = plan.levels.find((l: any) => l.index === level), floor = createDefaultFloor(level);
    floor.id = meta ? mapped(meta.id) : `native-floor-${level}`;
    floor.slabThickness = cm(meta?.slabThickness ?? 0.1);
    if (meta?.elevation != null) floor.elevation = cm(meta.elevation);
    floor.name = meta?.name ?? (level === 0 ? 'Ground Floor' : `Floor ${level}`);
    floor.walls = plan.walls.filter((w: any) => (w.level ?? 0) === level).map((w: any) => ({ details: nativeItemDetails(w, 'walls'), id: mapped(w.id), start: point(w.start), end: point(w.end), thickness: cm(w.thickness ?? plan.defaults?.interiorWallThickness ?? 0.12), height: cm(w.height ?? plan.defaults?.ceilingHeight ?? 2.4), color: '#8e8e93' }));
    const wallIds = new Set(plan.walls.filter((w: any) => (w.level ?? 0) === level).map((w: any) => key(w.id)));
    const openings = plan.openings.filter((o: any) => wallIds.has(key(o.wallID)));
    floor.doors = openings.filter((o: any) => o.kind === 'door').map((o: any) => ({ details: nativeItemDetails(o, 'doors'), id: mapped(o.id), wallId: mapped(o.wallID), position: o.position, width: cm(o.width), height: cm(o.height ?? 2), type: ['single', 'double', 'sliding'].includes(o.style) ? o.style : o.style === 'patio' ? 'sliding' : 'single', swingDirection: o.hingeLeft === false ? 'left' : 'right', flipSide: o.opensInward === false }));
    floor.windows = openings.filter((o: any) => o.kind === 'window').map((o: any) => ({ details: nativeItemDetails(o, 'windows'), id: mapped(o.id), wallId: mapped(o.wallID), position: o.position, width: cm(o.width), height: cm(o.height ?? 1.2), sillHeight: cm(o.sillHeight ?? 0.9), type: o.style === 'sliding' ? 'sliding' : 'fixed' }));
    floor.furniture = plan.furniture.filter((f: any) => (f.level ?? 0) === level).map((f: any) => ({ details: nativeItemDetails(f, 'furniture'), id: mapped(f.id), ...importedFurnitureCategory(f.category, cm(f.width)), position: point(f.center), rotation: f.angle * 180 / Math.PI, width: cm(f.width), depth: cm(f.depth), scale: { x: 1, y: 1, z: 1 } }));
    const detected = detectRooms(floor.walls);
    const polygons = new Map(detected.map(room=>[room.id,getRoomPolygon(room,floor.walls)]));
    const area = (room: typeof detected[number]) => {
      const ring=polygons.get(room.id)!;
      return Math.abs(ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p.x*q.y-q.x*p.y;},0));
    };
    floor.rooms = plan.rooms.filter((r: any) => (r.level ?? 0) === level).map((r: any) => {
      const center = point(r.center), boundary = r.boundaryWallIDs?.map((id:string)=>mapped(id));
      const match = boundary
        ? detected.find(room=>room.walls.length===new Set(boundary).size && room.walls.every(id=>boundary.includes(id)))
        : detected.filter(room=>inside(center,polygons.get(room.id)!)).sort((a,b)=>area(a)-area(b))[0];
      const centroid = match ? roomCentroid(getRoomPolygon(match, floor.walls)) : center;
      return { details: nativeItemDetails(r, 'rooms'), id: mapped(r.id), walls: match?.walls ?? [], name: r.name, color: r.colorHex, floorTexture: 'light-oak', ...(r.floorOpening != null ? {floorOpening:r.floorOpening} : {}), area: r.floorOpening ? 0 : match?.area ?? 0, labelOffset: { x: center.x - centroid.x, y: center.y - centroid.y } };
    });
    floor.textAnnotations = plan.notes.filter((n: any) => (byId.get(key(n.id))?.floorId ?? firstFloorId) === floor.id).map((n: any) => ({ id: mapped(n.id), text: n.text, x: cm(n.position.x), y: cm(n.position.y), fontSize: cm(n.fontSize ?? 0.16), color: n.colorHex ?? '#1e293b', rotation: (n.angle ?? 0) * 180 / Math.PI }));
    return floor;
  });
  project.activeFloorId = project.floors[0].id;
  return readProject(project);
}
function changedFields(source: any, before: any, after: any): any {
  if (!before) return structuredClone(after);
  const result = structuredClone(source ?? before);
  for (const field of Object.keys(after)) if (!equal(before[field], after[field])) {
    if (field === 'details') {
      result.details = { ...(result.details ?? {}) };
      for (const key of Object.keys(after.details)) if (!equal(before.details?.[key], after.details[key])) result.details[key] = structuredClone(after.details[key]);
    } else result[field] = structuredClone(after[field]);
  }
  return result;
}
export function applyNativeEdits(source: Project, before: Project, after: Project): Project {
  const result = readProject(source);
  if (before.description !== after.description) result.description = after.description;
  const beforeFloors = new Map(before.floors.map(f => [f.id, f]));
  const afterFloors = new Map(after.floors.map(f => [f.id, f]));
  result.floors = result.floors.filter(f => !beforeFloors.has(f.id) || afterFloors.has(f.id));
  for (const next of after.floors) {
    const previous = beforeFloors.get(next.id), index = result.floors.findIndex(f => f.id === next.id);
    if (index < 0) result.floors.push({ ...createDefaultFloor(next.level), id: next.id, name: next.name });
    const target: any = result.floors[index < 0 ? result.floors.length - 1 : index];
    if (!previous || previous.name !== next.name) target.name = next.name;
    if (!previous || previous.level !== next.level) target.level = next.level;
    if (!previous || previous.elevation !== next.elevation) {
      if (next.elevation === undefined) delete target.elevation; else target.elevation = next.elevation;
    }
    if (!previous || previous.slabThickness !== next.slabThickness) target.slabThickness = next.slabThickness;
    for (const kind of ['walls', 'doors', 'windows', 'furniture', 'rooms', 'textAnnotations'] as const) {
      const old = new Map((previous?.[kind] ?? []).map(item => [item.id, item]));
      const incoming = new Map(next[kind].map(item => [item.id, item]));
      target[kind] = target[kind].filter((item: any) => !old.has(item.id) || incoming.has(item.id));
      for (const item of next[kind]) {
        const position = target[kind].findIndex((v: any) => v.id === item.id);
        const originals = source.floors.flatMap<ObjectMap>(f => f[kind]).filter(v => v.id === item.id);
        const baselines = before.floors.flatMap<ObjectMap>(f => f[kind]).filter(v => v.id === item.id);
        const existing = target[kind][position] ?? (originals.length === 1 ? originals[0] : undefined);
        const baseline: any = old.get(item.id) ?? (baselines.length === 1 ? baselines[0] : undefined);
        const updated = changedFields(existing, baseline, item);
        if (kind === 'walls' && baseline && baseline.height !== (item as any).height) {
          if (updated.startHeight !== undefined) updated.startHeight = updated.height;
          if (updated.endHeight !== undefined) updated.endHeight = updated.height;
        }
        if (kind === 'furniture' && baseline && existing) for (const [dimension, axis] of [['width', 'x'], ['depth', 'y']]) {
          if (baseline[dimension] !== (item as any)[dimension]) updated[dimension] = (item as any)[dimension] / (Math.abs(existing.scale[axis]) || 1);
        }
        if (position < 0) target[kind].push(updated); else target[kind][position] = updated;
      }
    }
  }
  if (!result.floors.some(f => f.id === result.activeFloorId)) result.activeFloorId = result.floors[0]?.id;
  return readProject(result);
}
export function webToNative(project: Project, original: ObjectMap | undefined, previousMapping: PackageMapping = []): { plan: ObjectMap; mapping: PackageMapping } {
  const plan = structuredClone(original ?? {}), mapping: PackageMapping = [], used = new Set<string>();
  const identity = (kind: string, webId: string, floorId?: string) => {
    const candidates = previousMapping.filter(m => m.kind === kind && m.webId === webId);
    let id = candidates.find(m => m.floorId === floorId)?.id ?? (candidates.length === 1 ? candidates[0].id : undefined);
    if (!id || used.has(key(id))) id = uuidPattern.test(webId) && !used.has(key(webId)) ? webId : packageId();
    used.add(key(id)); mapping.push({ id, kind, webId, ...(floorId ? { floorId } : {}) }); return id;
  };
  const nativeOriginal = (kind: string, id: string) => (original?.[kind] ?? []).find((v: any) => key(v.id) === key(id)) ?? {};
  for (const kind of kinds) plan[kind] = [];
  const levels = new Set<number>();
  for (const floor of project.floors) {
    let level = floor.level; while (levels.has(level)) level++; levels.add(level);
    const floorId = identity('levels', floor.id);
    const oldLevel = nativeOriginal('levels', floorId);
    const nativeLevel: ObjectMap = { ...oldLevel, id: floorId, index: level, name: floor.name, slabThickness: (floor.slabThickness ?? 5) / 100 };
    if (oldLevel.slabThickness == null && nativeLevel.slabThickness === .1) delete nativeLevel.slabThickness;
    if (floor.elevation === undefined) delete nativeLevel.elevation; else nativeLevel.elevation = floor.elevation / 100;
    plan.levels.push(nativeLevel);
    const walls = new Map<string, string>();
    for (const wall of floor.walls) {
      const id = identity('walls', wall.id, floor.id); walls.set(wall.id, id);
      plan.walls.push({ ...nativeOriginal('walls', id), id, start: point(wall.start, 0.01), end: point(wall.end, 0.01), height: meters(Math.max(wall.startHeight ?? wall.height, wall.endHeight ?? wall.height) || 1), thickness: meters(wall.thickness), level });
    }
    for (const kind of ['doors', 'windows'] as const) for (const item of floor[kind]) {
      const id = identity(kind, item.id, floor.id), old = nativeOriginal('openings', id), o: any = item;
      const style = kind === 'doors' ? ['single', 'double', 'sliding'].includes(o.type) ? o.type : 'single' : o.type === 'sliding' ? 'sliding' : 'fixed';
      plan.openings.push({ ...old, id, wallID: walls.get(item.wallId), position: item.position, width: meters(item.width), height: meters(item.height), kind: kind === 'doors' ? 'door' : 'window', style: old.style === 'patio' && style === 'sliding' ? 'patio' : style,
        ...(kind === 'doors' ? { hingeLeft: o.swingDirection === 'right', opensInward: !o.flipSide } : { sillHeight: meters(o.sillHeight) }) });
    }
    for (const item of floor.furniture) {
      const id = identity('furniture', item.id, floor.id), old = nativeOriginal('furniture', id), size = getFurnitureSize(item);
      plan.furniture.push({ ...old, id, category: exportedFurnitureCategory(item), center: point(item.position, 0.01), angle: item.rotation * Math.PI / 180, width: meters(size.width || 1), depth: meters(size.depth || 1), level });
    }
    for (const room of floor.rooms) {
      const id = identity('rooms', room.id, floor.id), old = nativeOriginal('rooms', id), polygon = getRoomPolygon(room, floor.walls), center = polygon.length ? roomCentroid(polygon) : point(old.center ?? { x: 0, y: 0 });
      plan.rooms.push({ ...old, id, name: room.name, boundaryWallIDs: room.walls.flatMap(wallID=>walls.has(wallID)?[walls.get(wallID)!]:[]), floorOpening:room.floorOpening, center: point({ x: center.x + (room.labelOffset?.x ?? 0), y: center.y + (room.labelOffset?.y ?? 0) }, 0.01), ...(room.color ? { colorHex: room.color } : {}), level });
    }
    for (const note of floor.textAnnotations) {
      const id = identity('textAnnotations', note.id, floor.id), old = nativeOriginal('notes', id);
      plan.notes.push({ ...old, id, text: note.text, position: { x: meters(note.x), y: meters(note.y) }, fontSize: meters(note.fontSize), colorHex: note.color, angle: note.rotation * Math.PI / 180 });
    }
  }
  for (const entry of mapping) if (entry.kind !== 'levels' && entry.kind !== 'textAnnotations') {
    const kind = entry.kind as DetailKind;
    const item = project.floors.find(f => f.id === entry.floorId)?.[kind].find(i => i.id === entry.webId);
    const nativeKind = kind === 'doors' || kind === 'windows' ? 'openings' : kind;
    withNativeDetails(plan[nativeKind].find((i: any) => i.id === entry.id), item?.details, kind);
  }
  if (project.description !== undefined) plan.planNotes = project.description;
  if (original) {
    // Keep native defaults, pin-vs-label choices and richer fields when the web
    // representation has not changed. Only transfer edits in shared properties.
    const baseline = webToNative(nativeToWeb(validatePackagePlan(original), previousMapping, project.name), undefined, mapping).plan;
    const fields: Record<string, string[]> = {
      walls: ['start', 'end', 'height', 'thickness', 'level', 'note', 'material'],
      openings: ['wallID', 'position', 'width', 'height', 'kind', 'style', 'hingeLeft', 'opensInward', 'sillHeight', 'price'],
      furniture: ['category', 'center', 'angle', 'width', 'depth', 'level', 'note', 'price', 'photos'],
      rooms: ['name', 'center', 'boundaryWallIDs', 'floorOpening', 'colorHex', 'level', 'note', 'photos', 'type', 'ceilingHeight'],
      notes: ['text', 'position', 'fontSize', 'colorHex', 'angle'], levels: ['name', 'index'],
    };
    for (const kind of kinds) for (const item of plan[kind]) {
      const old = nativeOriginal(kind, item.id), base = baseline[kind].find((v: any) => key(v.id) === key(item.id));
      if (!old.id || !base) continue;
      for (const field of fields[kind]) if (equal(item[field], base[field])) {
        if (old[field] === undefined) delete item[field]; else item[field] = structuredClone(old[field]);
      }
    }
    if (equal(plan.planNotes, baseline.planNotes)) {
      if (original.planNotes === undefined) delete plan.planNotes; else plan.planNotes = original.planNotes;
    }
  }
  return { plan: validatePackagePlan(plan), mapping };
}
