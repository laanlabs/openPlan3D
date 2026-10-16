/**
 * Sibling planner interchange. OpenKitchen3D, OpenLandscape3D and OpenCatio3D exchange
 * OpenPlan3D "prepared RoomPlan JSON" (docs/handoff-format-v1.md and each sibling's
 * docs/EXPORT_FORMAT.md). `createProjectFromRoomPlan` reads that format; this module writes it
 * from a web project and re-emits the sibling blocks, object attributes, defaults and plan notes
 * that import retained on `project.interchange`, so OpenPlan3D → sibling → OpenPlan3D keeps them.
 *
 * Conventions, shared with roomplanImport.ts and the siblings' importers:
 * - Lengths in metres (web cm / 100, rounded to 8 decimals). Plan x → X, plan y → Z, Y up.
 * - Transforms are column-major 4×4 `[c,0,s,0, 0,1,0,0, -s,0,c,0, x,y,z,1]`; the heading is
 *   `atan2(t[2], t[0])`. A wall sits at its midpoint with y = height / 2, heading start → end, so
 *   the importer's direction reproduces start and end. Openings sit on the wall at `position`.
 * - Mirrored furniture negates the local Z column (`scale.y < 0` → t[8], t[10]); the importer's
 *   determinant test turns that back into `scale.y = -1`. A `scale.x < 0` item negates the local X
 *   column instead, which imports as the same pose written as rotation + 180° with `scale.y = -1`.
 * - `story` is the floor level and `stories` names every exported floor. Floors sharing a level
 *   are bumped like projectPackageBridge.webToNative. Web ids are unique per floor only: a repeat
 *   on a later floor is suffixed `-s<level>` and parent references follow.
 *
 * Lossy or unrepresented: curved walls export their straight chord (no curve exists in the
 * format); sloped walls their taller end; door types french/garage → double, pocket → sliding,
 * bifold → single; an `opening` carries no hinge or swing; window types other than sliding →
 * fixed; custom models export as their catalog box; stairs, columns, dimension/text annotations,
 * measurements, guides, entourage, background images, colours, textures and item details are not
 * exported. Floor openings ("Open to floor below") and floor elevations and slab thicknesses have
 * no place in the format (a section has no opening flag, a `stories` entry is `{ index, name }`),
 * so on import the room has its slab again and each floor stands at level × 300 cm on a 5 cm slab.
 *
 * Retained sibling blocks are re-emitted with three adjustments, so the receiving planner reads
 * the edited geometry instead of its own old snapshot: a `webProject` copy (the siblings' importers
 * prefer it over the top-level arrays) is never written back; a non-null `building` (the siblings'
 * verbatim copy of the OpenPlan3D arrays) is replaced by the arrays being written; and the retained
 * `defaults.ceilingHeight` follows the current walls. With `forLink`, the family's link rules are
 * applied as well: `site.location` is rounded to two decimals and marked coarse, observations lose
 * `lat`/`lon`/`headingDeg`/`photoFile`, and `ios.geoOrigin` is dropped. Room anchors are interior
 * points, never the dragged label position, so names stay with their rooms on re-import.
 */
import type { Door, Project, Window } from '$lib/models/types';
import { INTERCHANGE_BLOCK_KEYS, getWallEndHeight, getWallStartHeight, validWallHeight } from '$lib/models/types';
import { getFurnitureSize } from './furnitureCatalog';
import { exportedFurnitureCategory } from './furnitureCategories';
import { getRoomPolygon, resolveRooms } from './roomDetection';
import { roomHoles, roomInteriorPoint } from './roomNesting';

export { INTERCHANGE_BLOCK_KEYS };
export type { InterchangeState } from '$lib/models/types';

type Json = Record<string, unknown>;

/** Eight decimals in metres; `+ 0` turns −0 into 0 so files round-trip byte for byte. */
const r8 = (value: number) => Math.round(value * 1e8) / 1e8 + 0;
const metres = (cm: number) => r8(cm / 100);
/** validateRoomPlan rejects zero sizes; anything under a centimetre exports as 1 cm. */
const positive = (m: number) => Math.max(0.01, m);
const plain = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value);

function transformAt(x: number, z: number, angle: number, y: number, mirrorX = false, mirrorY = false): number[] {
  const c = Math.cos(angle), s = Math.sin(angle), sx = mirrorX ? -1 : 1, sy = mirrorY ? -1 : 1;
  return [c * sx, 0, s * sx, 0, 0, 1, 0, 0, -s * sy, 0, c * sy, 0, x, y, z, 1].map(v => v + 0);
}

const DOOR_STYLES: Record<Exclude<Door['type'], 'opening'>, 'single' | 'double' | 'sliding'> = {
  single: 'single', double: 'double', sliding: 'sliding', french: 'double', pocket: 'sliding', bifold: 'single', garage: 'double',
};

/** roomplanImport's mapSectionLabel, reversed: the keys are itemDetails' ROOM_TYPES. */
const SECTION_LABELS: Record<string, string> = {
  livingRoom: 'Living Room', bedroom: 'Bedroom', kitchen: 'Kitchen', bathroom: 'Bathroom', diningRoom: 'Dining Room',
  laundryRoom: 'Laundry', office: 'Office', hallway: 'Hallway', garage: 'Garage', closet: 'Closet', pantry: 'Pantry', entryway: 'Entryway',
};
/** A room's native type when set, else the type whose key or display name the room is named after, else 'room'. */
function sectionLabel(name: string, roomType?: string | null): string {
  if (roomType && Object.hasOwn(SECTION_LABELS, roomType)) return roomType;
  const wanted = name.trim().toLowerCase();
  return Object.entries(SECTION_LABELS).find(([key, display]) => key.toLowerCase() === wanted || display.toLowerCase() === wanted)?.[0] ?? 'room';
}

/**
 * The project (or `options.floorIds`, in project order) as prepared RoomPlan JSON. The result
 * passes validateRoomPlan and never shares references with the project.
 */
export function projectToPreparedRoomPlan(project: Project, options: { floorIds?: string[]; forLink?: boolean } = {}): Json {
  // Story indices come from every floor so a partial export keeps the levels of the full one.
  const levels = new Map<string, number>(), taken = new Set<number>();
  for (const floor of project.floors) {
    let level = floor.level;
    while (taken.has(level)) level++;
    taken.add(level);
    levels.set(floor.id, level);
  }
  const floors = options.floorIds ? project.floors.filter(f => options.floorIds!.includes(f.id)) : project.floors;
  const ids = new Set<string>();
  const identifier = (id: string, level: number) => {
    let unique = id;
    for (let n = 1; ids.has(unique); n++) unique = `${id}-s${level}${n > 1 ? `-${n}` : ''}`;
    ids.add(unique);
    return unique;
  };
  const retained = project.interchange;
  const walls: Json[] = [], doors: Json[] = [], windows: Json[] = [], openings: Json[] = [], objects: Json[] = [], sections: Json[] = [];
  const heights: number[] = [];

  for (const floor of floors) {
    const story = levels.get(floor.id)!;
    const exported = new Map<string, { identifier: string; angle: number; thickness: number }>();
    for (const wall of floor.walls) {
      const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y, angle = Math.atan2(dy, dx);
      const height = Math.max(getWallStartHeight(wall), getWallEndHeight(wall), validWallHeight(wall.height) ? wall.height : 0);
      const thickness = Math.max(0, wall.thickness), id = identifier(wall.id, story);
      exported.set(wall.id, { identifier: id, angle, thickness });
      heights.push(height);
      walls.push({
        identifier: id,
        dimensions: [positive(metres(Math.hypot(dx, dy))), positive(metres(height)), metres(thickness)],
        transform: transformAt(metres((wall.start.x + wall.end.x) / 2), metres((wall.start.y + wall.end.y) / 2), angle, metres(height / 2)),
        category: { wall: {} },
        story,
      });
    }

    const opening = (item: Door | Window, sillCm = 0): Json | undefined => {
      const wall = floor.walls.find(w => w.id === item.wallId), parent = wall && exported.get(wall.id);
      if (!wall || !parent) return undefined;
      const t = Math.max(0, Math.min(1, item.position)), height = positive(metres(item.height));
      return {
        identifier: identifier(item.id, story),
        parentIdentifier: parent.identifier,
        dimensions: [positive(metres(item.width)), height, metres(parent.thickness)],
        transform: transformAt(metres(wall.start.x + (wall.end.x - wall.start.x) * t), metres(wall.start.y + (wall.end.y - wall.start.y) * t), parent.angle, r8(metres(sillCm) + height / 2)),
      };
    };
    for (const door of floor.doors) {
      const base = opening(door);
      if (!base) continue;
      if (door.type === 'opening') openings.push({ ...base, category: { opening: {} }, story });
      else doors.push({ ...base, category: { door: {} }, story, style: DOOR_STYLES[door.type] ?? 'single', hingeLeft: door.swingDirection === 'right', opensInward: !door.flipSide });
    }
    for (const window of floor.windows) {
      const sill = Math.max(0, window.sillHeight), base = opening(window, sill);
      if (!base) continue;
      windows.push({ ...base, category: { window: {} }, story, style: window.type === 'sliding' ? 'sliding' : 'fixed', sillHeight: metres(sill) });
    }

    for (const item of floor.furniture) {
      const size = getFurnitureSize(item), height = positive(metres(size.height));
      const attributes = retained?.attributes?.[item.id];
      objects.push({
        identifier: identifier(item.id, story),
        dimensions: [positive(metres(size.width)), height, positive(metres(size.depth))],
        transform: transformAt(metres(item.position.x), metres(item.position.y), (item.rotation ?? 0) * Math.PI / 180, r8(height / 2), (item.scale?.x ?? 1) < 0, (item.scale?.y ?? 1) < 0),
        category: { [exportedFurnitureCategory(item)]: {} },
        ...(plain(attributes) ? { attributes: structuredClone(attributes) } : {}),
        story,
      });
    }

    const rooms = resolveRooms(floor), polygons = rooms.map(room => getRoomPolygon(room, floor.walls)), holes = roomHoles(polygons);
    rooms.forEach((room, index) => {
      if (polygons[index].length < 3) return;
      // The importer anchors a room by this point, so it must lie inside the room; a dragged label does not.
      const at = roomInteriorPoint(polygons[index], holes[index]);
      sections.push({
        center: [metres(at.x), 0, metres(at.y)],
        label: sectionLabel(room.name ?? '', room.details?.roomType),
        ...(room.name ? { displayName: room.name } : {}),
        ...(room.color ? { color: room.color } : {}),
        story,
      });
    });
  }

  // The ceiling default is the most common wall height; ties keep the first one seen.
  const counts = new Map<number, number>();
  let common: number | undefined;
  for (const height of heights) {
    const n = (counts.get(height) ?? 0) + 1;
    counts.set(height, n);
    if (common === undefined || n > counts.get(common)!) common = height;
  }
  const ceilingHeight = common === undefined ? 2.4 : positive(metres(common));
  // Retained defaults keep their other fields; the ceiling follows the walls as they are now.
  const defaults = plain(retained?.defaults)
    ? { ...structuredClone(retained!.defaults), ...(common === undefined ? {} : { ceilingHeight }) }
    : { ceilingHeight, interiorWallThickness: 0.12, exteriorWallThickness: 0.2 };
  const planNotes = project.description?.trim() || retained?.planNotes || 'Created with OpenPlan3D (web editor).';
  const file: Json = {
    openplanPrepared: true, openplanHandoffVersion: 1, version: 2,
    walls, doors, windows, openings, objects, sections,
    stories: floors.map(f => ({ index: levels.get(f.id)!, name: f.name })),
    floors: [], defaults, planNotes,
  };
  for (const key of INTERCHANGE_BLOCK_KEYS) if (plain(retained?.blocks?.[key])) file[key] = exportedBlock(retained!.blocks[key] as Json, file, !!options.forLink);
  return file;
}

/** A retained sibling block as written back: no stale snapshots of our geometry, and link privacy when asked. */
function exportedBlock(block: Json, file: Json, forLink: boolean): Json {
  const out = structuredClone(block);
  delete out.webProject;
  if (plain(out.building)) {
    out.building = structuredClone({ walls: file.walls, doors: file.doors, windows: file.windows, openings: file.openings, sections: file.sections, stories: file.stories, floors: [], defaults: file.defaults });
  }
  if (!forLink) return out;
  const site = out.site;
  if (plain(site) && plain(site.location)) {
    const location = site.location as Json;
    for (const axis of ['lat', 'lon']) if (typeof location[axis] === 'number' && Number.isFinite(location[axis])) location[axis] = Math.round((location[axis] as number) * 100) / 100;
    location.precision = 'coarse';
  }
  if (Array.isArray(out.observations)) {
    for (const observation of out.observations) if (plain(observation)) for (const key of ['lat', 'lon', 'headingDeg', 'photoFile']) delete observation[key];
  }
  if (plain(out.ios)) delete (out.ios as Json).geoOrigin;
  return out;
}

/**
 * The title a sibling planner gave its project (`<block>.name`), cleaned for use as a web
 * project name, or `fallback`. Plain iPhone captures have no block and keep the caller's name.
 */
export function interchangeProjectName(data: unknown, fallback: string): string {
  if (!plain(data)) return fallback;
  for (const key of INTERCHANGE_BLOCK_KEYS) {
    const block = data[key];
    if (!plain(block) || typeof block.name !== 'string') continue;
    const name = block.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120);
    if (name) return name;
  }
  return fallback;
}

/** Compact, key-sorted JSON: the handoff payload and fixture form the siblings use. */
export function sortedJson(value: unknown, indent?: number): string {
  const sort = (x: any): any => Array.isArray(x) ? x.map(sort) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, sort(x[k])])) : x;
  return JSON.stringify(sort(value), null, indent);
}

/** `<safe name>-openplan3d.json`, the family's file name convention. */
export function interchangeFileName(project: Pick<Project, 'name'>): string {
  const safe = (project.name ?? '').split(/[^A-Za-z0-9]+/).filter(Boolean).join('-');
  return `${safe || 'plan'}-openplan3d.json`;
}
