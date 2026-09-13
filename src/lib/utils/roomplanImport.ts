/**
 * RoomPlan JSON Importer
 * Converts Apple RoomPlan JSON exports into our Floor data model.
 *
 * RoomPlan coordinate system: Y-up, meters, column-major 4×4 transforms
 * Our coordinate system: 2D XY in centimeters (roomplan X→our X, roomplan Z→our Y)
 */

import type { Floor, Wall, Door, Window, FurnitureItem, Room, Point, Project } from '$lib/models/types';
import { createDefaultProject, createDefaultFloor } from '$lib/stores/project';
import { detectRooms, getRoomPolygon } from '$lib/utils/roomDetection';
import { validateRoomPlan } from './roomplanValidation';
import { importedFurnitureCategory } from './furnitureCategories';
export { validateRoomPlan, isRoomPlanJson } from './roomplanValidation';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getPosition(t: number[]): { x: number; y: number; z: number } {
  return { x: t[12], y: t[13], z: t[14] };
}

/** Convert RoomPlan meters (XZ ground plane) to our cm (XY) */
function toOurPoint(rpX: number, rpZ: number): Point {
  return { x: rpX * 100, y: rpZ * 100 };
}

interface RPWall {
  identifier: string;
  dimensions: number[];
  transform: number[];
  category: any;
  parentIdentifier?: string | null;
  /** Storey index; absent means ground floor. */
  story?: number;
}

interface RPStory {
  index: number;
  name: string;
}

/** Storey an element belongs to; anything untagged is the ground floor. */
function storyOf(item: { story?: number }): number {
  return typeof item.story === 'number' ? item.story : 0;
}

interface RPDoorWindow {
  identifier: string;
  dimensions: number[];
  transform: number[];
  category: any;
  parentIdentifier: string | null;
  story?: number;
  style?: string;
  hingeLeft?: boolean;
  opensInward?: boolean;
  sillHeight?: number;
}

interface RPObject {
  identifier: string;
  dimensions: number[];
  transform: number[];
  category: any;
  attributes?: any;
  story?: number;
}

interface RPSection {
  center: number[];
  label: string;
  story: number;
  /** Optional human-readable name from the iOS app, overriding the label map. */
  displayName?: string;
  /** Optional "#RRGGBB" room colour from the iOS app. */
  color?: string;
}

/** Ray-casting point-in-polygon test. */
function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const straddles = a.y > point.y !== b.y > point.y;
    if (straddles && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function polygonCentroid(polygon: Point[]): Point {
  let x = 0, y = 0;
  for (const p of polygon) { x += p.x; y += p.y; }
  return { x: x / polygon.length, y: y / polygon.length };
}

function getCategoryKey(cat: any): string {
  if (typeof cat === 'string') return cat;
  if (typeof cat === 'object' && cat !== null) return Object.keys(cat)[0] || '';
  return '';
}

function mapDoorType(cat: any): Door['type'] {
  const key = getCategoryKey(cat);
  if (key === 'door') {
    const inner = cat[key];
    if (inner?.isOpen) return 'single';
    return 'single';
  }
  if (key === 'doubleDoor' || key === 'french') return 'double';
  if (key === 'slidingDoor') return 'sliding';
  if (key === 'foldingDoor') return 'bifold';
  return 'single';
}

function mapWindowType(cat: any): Window['type'] {
  const key = getCategoryKey(cat);
  if (key === 'slidingWindow') return 'sliding';
  if (key === 'bayWindow') return 'bay';
  return 'standard';
}

function mapSectionLabel(label: string): string {
  const map: Record<string, string> = {
    livingRoom: 'Living Room',
    bedroom: 'Bedroom',
    kitchen: 'Kitchen',
    bathroom: 'Bathroom',
    diningRoom: 'Dining Room',
    laundryRoom: 'Laundry',
    office: 'Office',
    hallway: 'Hallway',
    garage: 'Garage',
    closet: 'Closet',
    pantry: 'Pantry',
    entryway: 'Entryway',
  };
  return map[label] ?? label;
}

/**
 * Find the closest point on a wall segment to a given point, return parameter t (0-1)
 */
function projectOntoWall(wall: Wall, pt: Point): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return 0.5;
  const t = ((pt.x - wall.start.x) * dx + (pt.y - wall.start.y) * dy) / lenSq;
  return Math.max(0, Math.min(1, t));
}

/**
 * Straighten walls: snap near-horizontal/vertical walls to axis-aligned,
 * then merge nearby endpoints so corners meet cleanly.
 */
function straightenWalls(walls: Wall[], angleTolerance = 5, mergeDistance = 15): void {
  const tolRad = (angleTolerance * Math.PI) / 180;

  // Pass 1: Snap walls that are nearly axis-aligned
  for (const wall of walls) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const angle = Math.atan2(dy, dx);
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;

    // Check if near 0°, 90°, 180°, 270°
    const snappedAngle = [0, Math.PI / 2, Math.PI, -Math.PI / 2, -Math.PI].find(
      a => angleDiff(angle, a) < tolRad
    );

    if (snappedAngle !== undefined) {
      // Recalculate endpoints from midpoint + snapped angle
      const mx = (wall.start.x + wall.end.x) / 2;
      const my = (wall.start.y + wall.end.y) / 2;
      const halfLen = len / 2;
      const cdx = Math.cos(snappedAngle) * halfLen;
      const cdy = Math.sin(snappedAngle) * halfLen;
      wall.start.x = Math.round(mx - cdx);
      wall.start.y = Math.round(my - cdy);
      wall.end.x = Math.round(mx + cdx);
      wall.end.y = Math.round(my + cdy);
    }
  }

  // Pass 2: Merge nearby endpoints
  mergeEndpoints(walls, mergeDistance);
}

/** Normalize angle to [-π, π) */
function normalizeAngle(a: number): number {
  a = a % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

/** Smallest absolute angular difference */
function angleDiff(a: number, b: number): number {
  return Math.abs(normalizeAngle(a - b));
}

/**
 * Enforce orthogonal: find the dominant rotation of the whole layout,
 * then rotate ALL points by its inverse so walls become axis-aligned.
 * This preserves topology (connected corners stay connected).
 */
/** Orthogonal enforcement version (shown in import dialog) */
export const ORTHO_VERSION = 'v5';

function enforceOrthogonal(walls: Wall[], mergeDistance = 15, furniture?: FurnitureItem[], extraPoints?: Point[]): void {
  if (walls.length === 0) return;

  // ── Step 1: Global rotation to remove dominant angle ──
  let sinSum = 0, cosSum = 0;
  for (const wall of walls) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const angle = Math.atan2(dy, dx) * 4;
    sinSum += Math.sin(angle) * len;
    cosSum += Math.cos(angle) * len;
  }
  const dominantAngle = Math.atan2(sinSum, cosSum) / 4;

  const AXES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  let bestAxis = 0;
  let bestDiff = Infinity;
  for (const a of AXES) {
    const diff = angleDiff(dominantAngle, a);
    if (diff < bestDiff) { bestDiff = diff; bestAxis = a; }
  }
  const rotationAngle = bestAxis - dominantAngle;

  let cx = 0, cy = 0, n = 0;
  for (const wall of walls) {
    cx += wall.start.x + wall.end.x;
    cy += wall.start.y + wall.end.y;
    n += 2;
  }
  cx /= n; cy /= n;

  const cosR = Math.cos(rotationAngle);
  const sinR = Math.sin(rotationAngle);
  function rotatePoint(p: { x: number; y: number }) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    p.x = cx + dx * cosR - dy * sinR;
    p.y = cy + dx * sinR + dy * cosR;
  }

  for (const wall of walls) {
    rotatePoint(wall.start);
    rotatePoint(wall.end);
  }
  if (furniture) {
    for (const f of furniture) {
      rotatePoint(f.position);
      f.rotation = (f.rotation ?? 0) + (rotationAngle * 180) / Math.PI;
    }
  }
  // Room-label anchors must ride the same rotation as the walls, or they end
  // up outside the room they name once the layout is squared up.
  if (extraPoints) {
    for (const p of extraPoints) rotatePoint(p);
  }

  // ── Step 2: Classify each wall as H or V ──
  const wallOrientation = new Map<Wall, 'H' | 'V'>();
  for (const wall of walls) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const angle = Math.atan2(dy, dx);
    const nearestAxis = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
    wallOrientation.set(wall, Math.abs(Math.cos(nearestAxis)) > Math.abs(Math.sin(nearestAxis)) ? 'H' : 'V');
  }

  // ── Step 3: Enforce exact H/V per wall ──
  // H walls: lock both endpoints to same Y (average)
  // V walls: lock both endpoints to same X (average)
  for (const wall of walls) {
    const orient = wallOrientation.get(wall)!;
    if (orient === 'H') {
      const midY = Math.round((wall.start.y + wall.end.y) / 2);
      wall.start.y = midY;
      wall.end.y = midY;
      wall.start.x = Math.round(wall.start.x);
      wall.end.x = Math.round(wall.end.x);
    } else {
      const midX = Math.round((wall.start.x + wall.end.x) / 2);
      wall.start.x = midX;
      wall.end.x = midX;
      wall.start.y = Math.round(wall.start.y);
      wall.end.y = Math.round(wall.end.y);
    }
  }

  // ── Step 4: Smart corner merge ──
  // When merging nearby endpoints, respect wall orientation:
  //   H wall endpoints: Y is authoritative (locked), only merge X
  //   V wall endpoints: X is authoritative (locked), only merge Y
  //   H meets V: perfect corner — H provides Y, V provides X
  type Endpoint = { wall: Wall; which: 'start' | 'end'; orient: 'H' | 'V' };
  const eps: Endpoint[] = [];
  for (const wall of walls) {
    const orient = wallOrientation.get(wall)!;
    eps.push({ wall, which: 'start', orient });
    eps.push({ wall, which: 'end', orient });
  }

  function getP(ep: Endpoint): Point {
    return ep.which === 'start' ? ep.wall.start : ep.wall.end;
  }
  function setP(ep: Endpoint, x: number, y: number) {
    if (ep.which === 'start') { ep.wall.start.x = x; ep.wall.start.y = y; }
    else { ep.wall.end.x = x; ep.wall.end.y = y; }
  }

  // Union-Find
  const parent: number[] = eps.map((_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  }
  function union(a: number, b: number) { parent[find(a)] = find(b); }

  for (let i = 0; i < eps.length; i++) {
    const pi = getP(eps[i]);
    for (let j = i + 1; j < eps.length; j++) {
      const pj = getP(eps[j]);
      if (Math.hypot(pi.x - pj.x, pi.y - pj.y) < mergeDistance) {
        union(i, j);
      }
    }
  }

  const corners = new Map<number, number[]>();
  for (let i = 0; i < eps.length; i++) {
    const root = find(i);
    if (!corners.has(root)) corners.set(root, []);
    corners.get(root)!.push(i);
  }

  for (const [, members] of corners) {
    if (members.length < 2) continue;

    // Collect authoritative values per axis
    const xFromV: number[] = []; // V walls own their X
    const yFromH: number[] = []; // H walls own their Y
    const allX: number[] = [];
    const allY: number[] = [];

    for (const idx of members) {
      const p = getP(eps[idx]);
      allX.push(p.x);
      allY.push(p.y);
      if (eps[idx].orient === 'V') xFromV.push(p.x);
      if (eps[idx].orient === 'H') yFromH.push(p.y);
    }

    // X: prefer V-wall authority, fallback to average
    const finalX = Math.round(xFromV.length > 0
      ? xFromV.reduce((a, b) => a + b, 0) / xFromV.length
      : allX.reduce((a, b) => a + b, 0) / allX.length);

    // Y: prefer H-wall authority, fallback to average
    const finalY = Math.round(yFromH.length > 0
      ? yFromH.reduce((a, b) => a + b, 0) / yFromH.length
      : allY.reduce((a, b) => a + b, 0) / allY.length);

    for (const idx of members) {
      const ep = eps[idx];
      if (ep.orient === 'H') {
        // H wall: keep its locked Y, take merged X
        setP(ep, finalX, getP(ep).y);
      } else {
        // V wall: keep its locked X, take merged Y
        setP(ep, getP(ep).x, finalY);
      }
    }
  }

  // ── Step 5: Iterative orientation-aware merge + re-enforce ──
  for (let iter = 0; iter < 5; iter++) {
    // Rebuild eps list with current positions
    const iterEps: Endpoint[] = [];
    for (const wall of walls) {
      const orient = wallOrientation.get(wall)!;
      iterEps.push({ wall, which: 'start', orient });
      iterEps.push({ wall, which: 'end', orient });
    }

    // Re-cluster
    const iterParent: number[] = iterEps.map((_, i) => i);
    function iterFind(i: number): number {
      while (iterParent[i] !== i) { iterParent[i] = iterParent[iterParent[i]]; i = iterParent[i]; }
      return i;
    }
    function iterUnion(a: number, b: number) { iterParent[iterFind(a)] = iterFind(b); }

    for (let i = 0; i < iterEps.length; i++) {
      const pi = getP(iterEps[i]);
      for (let j = i + 1; j < iterEps.length; j++) {
        const pj = getP(iterEps[j]);
        if (Math.hypot(pi.x - pj.x, pi.y - pj.y) < mergeDistance) {
          iterUnion(i, j);
        }
      }
    }

    const iterCorners = new Map<number, number[]>();
    for (let i = 0; i < iterEps.length; i++) {
      const root = iterFind(i);
      if (!iterCorners.has(root)) iterCorners.set(root, []);
      iterCorners.get(root)!.push(i);
    }

    // Orientation-aware merge
    for (const [, members] of iterCorners) {
      if (members.length < 2) continue;
      const xFromV: number[] = [];
      const yFromH: number[] = [];
      const allX: number[] = [];
      const allY: number[] = [];

      for (const idx of members) {
        const p = getP(iterEps[idx]);
        allX.push(p.x);
        allY.push(p.y);
        if (iterEps[idx].orient === 'V') xFromV.push(p.x);
        if (iterEps[idx].orient === 'H') yFromH.push(p.y);
      }

      const finalX = Math.round(xFromV.length > 0
        ? xFromV.reduce((a, b) => a + b, 0) / xFromV.length
        : allX.reduce((a, b) => a + b, 0) / allX.length);
      const finalY = Math.round(yFromH.length > 0
        ? yFromH.reduce((a, b) => a + b, 0) / yFromH.length
        : allY.reduce((a, b) => a + b, 0) / allY.length);

      for (const idx of members) {
        setP(iterEps[idx], finalX, finalY);
      }
    }

    // Re-enforce H/V
    for (const wall of walls) {
      const orient = wallOrientation.get(wall)!;
      if (orient === 'H') {
        const midY = Math.round((wall.start.y + wall.end.y) / 2);
        wall.start.y = midY;
        wall.end.y = midY;
      } else {
        const midX = Math.round((wall.start.x + wall.end.x) / 2);
        wall.start.x = midX;
        wall.end.x = midX;
      }
    }
  }

  // ── Step 6: Final coordinate snapping for rounding artifacts ──
  // After iteration, some corners differ by 1-2cm due to rounding.
  // Group same-orientation walls by their locked coordinate and unify nearby values.
  function snapCoordGroups(getCoord: (w: Wall) => number, setCoord: (w: Wall, v: number) => void, filter: (w: Wall) => boolean) {
    const vals = walls.filter(filter).map(w => ({ wall: w, val: getCoord(w) }));
    vals.sort((a, b) => a.val - b.val);
    let i = 0;
    while (i < vals.length) {
      let j = i;
      while (j < vals.length && vals[j].val - vals[i].val <= 3) j++;
      // Snap group [i, j) to weighted average
      const avg = Math.round(vals.slice(i, j).reduce((s, v) => s + v.val, 0) / (j - i));
      for (let k = i; k < j; k++) setCoord(vals[k].wall, avg);
      i = j;
    }
  }

  // Snap V walls' X coordinates
  snapCoordGroups(
    w => w.start.x,
    (w, v) => { w.start.x = v; w.end.x = v; },
    w => wallOrientation.get(w) === 'V'
  );
  // Snap H walls' Y coordinates
  snapCoordGroups(
    w => w.start.y,
    (w, v) => { w.start.y = v; w.end.y = v; },
    w => wallOrientation.get(w) === 'H'
  );

  // Final merge
  mergeEndpoints(walls, mergeDistance);
}

/** Merge nearby wall endpoints to cluster average */
function mergeEndpoints(walls: Wall[], mergeDistance: number): void {
  const endpoints: { wall: Wall; which: 'start' | 'end' }[] = [];
  for (const wall of walls) {
    endpoints.push({ wall, which: 'start' });
    endpoints.push({ wall, which: 'end' });
  }

  const merged = new Set<number>();
  for (let i = 0; i < endpoints.length; i++) {
    if (merged.has(i)) continue;
    const pi = endpoints[i].which === 'start' ? endpoints[i].wall.start : endpoints[i].wall.end;
    const cluster = [i];

    for (let j = i + 1; j < endpoints.length; j++) {
      if (merged.has(j)) continue;
      const pj = endpoints[j].which === 'start' ? endpoints[j].wall.start : endpoints[j].wall.end;
      if (Math.hypot(pi.x - pj.x, pi.y - pj.y) < mergeDistance) {
        cluster.push(j);
      }
    }

    if (cluster.length > 1) {
      let ax = 0, ay = 0;
      for (const idx of cluster) {
        const p = endpoints[idx].which === 'start' ? endpoints[idx].wall.start : endpoints[idx].wall.end;
        ax += p.x; ay += p.y;
      }
      ax = Math.round(ax / cluster.length);
      ay = Math.round(ay / cluster.length);

      for (const idx of cluster) {
        const ep = endpoints[idx];
        if (ep.which === 'start') { ep.wall.start.x = ax; ep.wall.start.y = ay; }
        else { ep.wall.end.x = ax; ep.wall.end.y = ay; }
        merged.add(idx);
      }
    }
  }
}

export interface RoomPlanImportOptions {
  straighten?: boolean;
  orthogonal?: boolean;
  angleTolerance?: number;   // degrees, default 5
  mergeDistance?: number;     // cm, default 15
}

/** Shared defaults for file, ZIP and hosted capture imports. Explicit choices win. */
export function roomPlanImportOptions(data: any): RoomPlanImportOptions {
  const sent = data?.openplanImportOptions;
  if (sent) return { straighten: sent.straighten, orthogonal: sent.orthogonal,
    mergeDistance: sent.straighten || sent.orthogonal ? 15 : 0 };
  return data?.openplanPrepared
    ? { straighten: false, orthogonal: false, mergeDistance: 0 }
    : { ...DEFAULT_ROOMPLAN_OPTIONS };
}

const centimetres = (metres: number) => Math.round(metres * 100 * 1e8) / 1e8;

export function importRoomPlan(jsonData: any, options: RoomPlanImportOptions = roomPlanImportOptions(jsonData)): Floor {
  validateRoomPlan(jsonData);
  const rpWalls: RPWall[] = jsonData.walls ?? [];
  const rpDoors: RPDoorWindow[] = [...(jsonData.doors ?? []), ...(jsonData.openings ?? [])];
  const passageIds = new Set((jsonData.openings ?? []).map((opening: RPDoorWindow) => opening.identifier));
  const rpWindows: RPDoorWindow[] = jsonData.windows ?? [];
  const rpObjects: RPObject[] = jsonData.objects ?? [];
  const rpSections: RPSection[] = jsonData.sections ?? [];

  const floorId = uid();
  const walls: Wall[] = [];
  const doors: Door[] = [];
  const windows: Window[] = [];
  const furniture: FurnitureItem[] = [];
  const rooms: Room[] = [];

  // Map RoomPlan wall identifier → our wall id
  const wallIdMap = new Map<string, string>();

  // Process walls
  for (const rw of rpWalls) {
    if (!rw.dimensions || rw.dimensions.length < 2 || !rw.transform || rw.transform.length < 16) continue;
    if (!isFinite(rw.dimensions[0]) || !isFinite(rw.dimensions[1])) continue;
    const pos = getPosition(rw.transform);
    const halfWidth = (rw.dimensions[0] / 2) * 100;
    const height = centimetres(rw.dimensions[1]);
    const center = toOurPoint(pos.x, pos.z);
    const norm = Math.hypot(rw.transform[0], rw.transform[2]);
    const wallDirX = rw.transform[0] / norm;
    const wallDirZ = rw.transform[2] / norm;

    const start: Point = {
      x: center.x - wallDirX * halfWidth,
      y: center.y - wallDirZ * halfWidth,
    };
    const end: Point = {
      x: center.x + wallDirX * halfWidth,
      y: center.y + wallDirZ * halfWidth,
    };

    const wallId = rw.identifier;
    wallIdMap.set(rw.identifier, wallId);

    walls.push({
      id: wallId,
      start,
      end,
      // Apple scans often report zero depth; edited iOS plans supply the actual thickness.
      thickness: rw.dimensions[2] > 0 ? centimetres(rw.dimensions[2]) : 15,
      height,
      startHeight: height,
      endHeight: height,
      color: '#444444',
    });
  }

  // Process doors
  for (const rd of rpDoors) {
    if (!rd.dimensions || rd.dimensions.length < 2 || !rd.transform || rd.transform.length < 16) continue;
    const parentWallId = rd.parentIdentifier ? wallIdMap.get(rd.parentIdentifier) : undefined;
    if (!parentWallId) continue;

    const wall = walls.find(w => w.id === parentWallId);
    if (!wall) continue;

    const pos = getPosition(rd.transform);
    const doorPoint = toOurPoint(pos.x, pos.z);
    const position = projectOntoWall(wall, doorPoint);

    doors.push({
      id: rd.identifier,
      wallId: parentWallId,
      position,
      width: centimetres(rd.dimensions[0]),
      height: centimetres(rd.dimensions[1]),
      type: passageIds.has(rd.identifier) ? 'opening'
        : rd.style === 'patio' ? 'sliding'
        : rd.style as Door['type'] ?? mapDoorType(rd.category),
      // Web 'right' places the hinge at the wall-start jamb; iOS calls this hingeLeft.
      swingDirection: (rd.hingeLeft ?? (jsonData.openplanPrepared ? true : false)) ? 'right' : 'left',
      flipSide: !(rd.opensInward ?? true),
    });
  }

  // Process windows
  for (const rw of rpWindows) {
    if (!rw.dimensions || rw.dimensions.length < 2 || !rw.transform || rw.transform.length < 16) continue;
    const parentWallId = rw.parentIdentifier ? wallIdMap.get(rw.parentIdentifier) : undefined;
    if (!parentWallId) continue;

    const wall = walls.find(w => w.id === parentWallId);
    if (!wall) continue;

    const pos = getPosition(rw.transform);
    const winPoint = toOurPoint(pos.x, pos.z);
    const position = projectOntoWall(wall, winPoint);

    const sourceWall = rpWalls.find(w => w.identifier === rw.parentIdentifier)!;
    const floorY = sourceWall.transform[13] - sourceWall.dimensions[1] / 2;

    windows.push({
      id: rw.identifier,
      wallId: parentWallId,
      position,
      width: centimetres(rw.dimensions[0]),
      height: centimetres(rw.dimensions[1]),
      sillHeight: centimetres(rw.sillHeight ?? Math.max(0, pos.y - rw.dimensions[1] / 2 - floorY)),
      type: rw.style as Window['type'] ?? mapWindowType(rw.category),
    });
  }

  // Process objects (furniture)
  for (const ro of rpObjects) {
    if (!ro.dimensions || ro.dimensions.length < 3 || !ro.transform || ro.transform.length < 16) continue;
    const pos = getPosition(ro.transform);
    // Heading in our 2D plane: the object's local X axis projected onto the ground
    // plane is (t[0], t[2]) — same columns the wall direction uses above. Note that
    // mapping rpZ→ourY flips handedness, so this equals -getYRotation(): a RoomPlan
    // Y-rotation of +a appears as plane angle -a in our coords. Our furniture
    // `rotation` convention is atan2(dy, dx) in data coords (see snapFurnitureToWall
    // / drawFurnitureItem), so derive it from the transform columns directly.
    const angle2d = Math.atan2(ro.transform[2], ro.transform[0]);
    // Local X supplies heading; the determinant retains the remaining Y
    // reflection, including native mirrored furniture exported without sidecars.
    const reflected = ro.transform[0] * ro.transform[10] - ro.transform[2] * ro.transform[8] < 0;
    furniture.push({
      id: ro.identifier,
      ...importedFurnitureCategory(getCategoryKey(ro.category), centimetres(ro.dimensions[0])),
      position: toOurPoint(pos.x, pos.z),
      rotation: (angle2d * 180) / Math.PI,
      scale: { x: 1, y: reflected ? -1 : 1, z: 1 },
      width: centimetres(ro.dimensions[0]),
      depth: centimetres(ro.dimensions[2]),
      height: centimetres(ro.dimensions[1]),
    });
  }

  // Section anchors travel with the walls through post-processing so a label
  // still lands inside its room after the layout is straightened.
  const sectionAnchors: Point[] = rpSections.map(rs =>
    toOurPoint(rs.center?.[0] ?? 0, rs.center?.[2] ?? 0)
  );

  // Post-process walls (after doors/windows/furniture so projections use original positions)
  const md = options.mergeDistance ?? 15;
  if (options.orthogonal) {
    enforceOrthogonal(walls, md, furniture, sectionAnchors);
  } else if (options.straighten !== false) {
    straightenWalls(walls, options.angleTolerance ?? 5, md);
  }

  // Process sections (rooms).
  //
  // A section is a label at a point; the room it names is whichever detected
  // wall cycle encloses that point. Without this the imported rooms carry no
  // wall ids, and the canvas — which matches saved rooms to detected ones by
  // wall set — silently drops every name the capture sent.
  if (rpSections.length > 0) {
    const detected = detectRooms(walls);
    const polygons = detected.map(room => getRoomPolygon(room, walls));
    const claimed = new Set<number>();

    for (let si = 0; si < rpSections.length; si++) {
      const rs = rpSections[si];
      const anchor = sectionAnchors[si];

      let matchIndex = polygons.findIndex(
        (poly, di) => !claimed.has(di) && poly.length >= 3 && pointInPolygon(anchor, poly)
      );
      // Nothing encloses it (open-plan capture, or a label nudged outside):
      // fall back to the nearest unclaimed room so the name isn't lost.
      if (matchIndex < 0) {
        let bestDistance = Infinity;
        for (let di = 0; di < detected.length; di++) {
          if (claimed.has(di) || polygons[di].length < 3) continue;
          const c = polygonCentroid(polygons[di]);
          const d = Math.hypot(c.x - anchor.x, c.y - anchor.y);
          if (d < bestDistance) { bestDistance = d; matchIndex = di; }
        }
      }

      const source = matchIndex >= 0 ? detected[matchIndex] : undefined;
      if (matchIndex >= 0) claimed.add(matchIndex);

      rooms.push({
        id: source?.id ?? uid(),
        name: rs.displayName || mapSectionLabel(rs.label),
        walls: source?.walls ?? [],
        floorTexture: 'hardwood',
        area: source?.area ?? 0,
        ...(rs.color ? { color: rs.color } : {}),
      });
    }
  }

  return {
    id: floorId,
    name: 'Ground Floor',
    level: 0,
    walls,
    rooms,
    doors,
    windows,
    furniture,
    stairs: [],
    columns: [],
    guides: [],
    measurements: [],
    annotations: [],
    textAnnotations: [],
    groups: [],
  };
}

/**
 * Extract room.json from a .zip file (iOS RoomPlan export format)
 */
export async function extractRoomJsonFromZip(zipFile: File): Promise<any> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(zipFile);

  const files = Object.values(zip.files).filter(file => !file.dir);
  if (files.some(file => /(^|\/)plan\.json$/i.test(file.name))) {
    throw new Error('This dataset contains an edited iPhone plan. On iPhone, choose Export Editable Plan (JSON) to import its edits; the room.json in this ZIP is the original scan.');
  }
  const captures = files.filter(file => /(^|\/)room\.json$/i.test(file.name));
  if (captures.length !== 1) {
    throw new Error('The ZIP must contain exactly one room.json capture.');
  }
  return JSON.parse(await captures[0].async('string'));
}

/** Default import options — same defaults the import options dialog starts with */
export const DEFAULT_ROOMPLAN_OPTIONS: RoomPlanImportOptions = {
  straighten: true,
  orthogonal: true,
  mergeDistance: 15,
};

/**
 * Build a brand-new project from RoomPlan JSON data (walls/doors/windows/furniture
 * placed on the first floor). Shared by the file-import dialog and the iOS capture
 * handoff (`/editor?import=CODE`). Caller is responsible for loading/saving it.
 */
/** Name for a storey, preferring one the capture supplied. */
function storyName(index: number, stories: RPStory[]): string {
  const named = stories.find(s => s.index === index);
  if (named?.name) return named.name;
  if (index === 0) return 'Ground Floor';
  if (index < 0) return index === -1 ? 'Basement' : `Basement ${-index}`;
  return `Floor ${index}`;
}

/**
 * Import every storey in a capture. Elements carry a `story` index (absent =
 * ground floor); each distinct storey becomes its own Floor, so a multi-level
 * capture no longer collapses into one.
 */
export function importRoomPlanFloors(
  jsonData: any,
  options: RoomPlanImportOptions = roomPlanImportOptions(jsonData)
): Floor[] {
  validateRoomPlan(jsonData);
  const stories: RPStory[] = jsonData.stories ?? [];
  const tagged: { story?: number }[] = [
    ...(jsonData.walls ?? []),
    ...(jsonData.doors ?? []),
    ...(jsonData.openings ?? []),
    ...(jsonData.windows ?? []),
    ...(jsonData.objects ?? []),
    ...(jsonData.sections ?? []),
  ];

  const indices = new Set<number>(tagged.map(storyOf));
  for (const s of stories) indices.add(s.index);
  if (indices.size === 0) indices.add(0);
  const sorted = [...indices].sort((a, b) => a - b);

  return sorted
    .map(index => {
      // Each storey is imported on its own so wall straightening, room
      // detection and corner merging never mix geometry across levels.
      const subset = sorted.length === 1 ? jsonData : {
        ...jsonData,
        walls: (jsonData.walls ?? []).filter((w: any) => storyOf(w) === index),
        doors: (jsonData.doors ?? []).filter((d: any) => storyOf(d) === index),
        openings: (jsonData.openings ?? []).filter((d: any) => storyOf(d) === index),
        windows: (jsonData.windows ?? []).filter((w: any) => storyOf(w) === index),
        objects: (jsonData.objects ?? []).filter((o: any) => storyOf(o) === index),
        sections: (jsonData.sections ?? []).filter((s: any) => storyOf(s) === index),
      };
      const floor = importRoomPlan(subset, options);
      floor.level = index;
      floor.name = storyName(index, stories);
      return floor;
    });
}

/**
 * Build a brand-new project from RoomPlan JSON data. Shared by the
 * file-import dialog and the iOS capture handoff (`/editor?import=CODE`).
 * Caller is responsible for loading/saving it.
 */
export function createProjectFromRoomPlan(
  jsonData: any,
  name: string,
  options: RoomPlanImportOptions = roomPlanImportOptions(jsonData)
): Project {
  const floors = importRoomPlanFloors(jsonData, options);
  const project = createDefaultProject(name || 'RoomPlan Import');

  // Build each storey from a fresh default floor. Spreading one template
  // would alias its guides/annotations/groups arrays across every floor.
  project.floors = floors.map(floor => {
    const target = createDefaultFloor(floor.level);
    target.name = floor.name;
    target.walls = floor.walls;
    target.rooms = floor.rooms;
    target.doors = floor.doors;
    target.windows = floor.windows;
    target.furniture = floor.furniture;
    target.stairs = floor.stairs ?? [];
    target.columns = floor.columns ?? [];
    return target;
  });

  // Open on the ground floor when there is one.
  const ground = project.floors.find(f => f.level === 0) ?? project.floors[0];
  project.activeFloorId = ground.id;
  return project;
}
