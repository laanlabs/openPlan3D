/**
 * Snap one scanned room onto another at a shared door (issue #103).
 *
 * Rooms scanned one at a time meet at the doors between them. The user picks
 * the door in the room that should move, then the same door in the room that
 * stays, and the moving room's wall group is carried rigidly to the far side
 * of the target wall so the two rooms face each other across it. Everything
 * here is pure; the project store commits a join as one undo step.
 */
import type { Floor, Point, Wall, Door } from '$lib/models/types';
import { connectedWallEndpoints } from './wallEditing';
import { resolveRoomGeometry } from './roomDetection';
import { roomInteriorPoint } from './roomNesting';
import { pointInPolygon, pointToSegmentDist } from './hitTesting';
import { wallPlanBounds } from './wallPlanGeometry';

export type DoorJoinResult = { floor: Floor; movedIds: string[] };

/** Walls reachable from `wallId` through shared endpoints (corners within WALL_JOIN_TOLERANCE), itself included. */
export function connectedWallGroup(walls: Wall[], wallId: string): Set<string> {
  const group = new Set<string>();
  const queue = [wallId];
  while (queue.length) {
    const id = queue.pop()!;
    const wall = walls.find(w => w.id === id);
    if (!wall || group.has(id)) continue;
    group.add(id);
    for (const point of [wall.start, wall.end]) {
      for (const joined of connectedWallEndpoints(walls, point, id)) if (!group.has(joined.wallId)) queue.push(joined.wallId);
    }
  }
  return group;
}

function unit(a: Point, b: Point): Point | null {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  return length > 1e-6 ? { x: (b.x - a.x) / length, y: (b.y - a.y) / length } : null;
}

function doorCentre(wall: Wall, door: Door): Point {
  return { x: wall.start.x + (wall.end.x - wall.start.x) * door.position, y: wall.start.y + (wall.end.y - wall.start.y) * door.position };
}

/** The rooms a wall group closes, with their polygons; walls outside the group cannot close one of them. */
function groupRooms(floor: Floor, walls: Wall[]) {
  return resolveRoomGeometry({ walls, rooms: floor.rooms }).filter(entry => entry.polygon.length >= 3);
}

/**
 * Move the wall group holding `movingDoorId` so that door meets `targetDoorId`
 * across the target wall.
 *
 * The group turns about the moving door's centre until its wall runs opposite
 * to the target wall and that centre lands `gapCm` beyond the target door's
 * centre, on the side of the target wall that faces away from the room it
 * bounds. Two scans each modelled the shared wall from their own side, so the
 * gap defaults to the mean of the two wall thicknesses: one real wall between
 * the centrelines (15 cm for walls the importer gave its default). When the
 * moving scan was traced the other way round, a half turn more keeps its room
 * on the free side instead of on top of the target room; when no room bounds
 * the target wall, the moving group stays on the side of that wall it is on
 * now.
 *
 * Doors and windows on the group's walls ride along because their position is
 * a fraction of their wall. Furniture, stairs, columns, entourage, text notes,
 * measurements and dimension lines move when they lie inside one of the
 * group's rooms or on one of its walls, or, for a group that closes no room,
 * inside the walls' drawn extent; a dimension line counts by its midpoint.
 * Wall ids, endpoint order and room records are kept. Returns null when a door
 * is missing, both doors sit on one wall group, or either door's wall is
 * curved (its direction is not defined); curved walls elsewhere in the group
 * move rigidly with it.
 */
export function doorJoin(floor: Floor, movingDoorId: string, targetDoorId: string, gapCm?: number): DoorJoinResult | null {
  const moving = floor.doors.find(d => d.id === movingDoorId), target = floor.doors.find(d => d.id === targetDoorId);
  if (!moving || !target || moving === target) return null;
  const movingWall = floor.walls.find(w => w.id === moving.wallId), targetWall = floor.walls.find(w => w.id === target.wallId);
  if (!movingWall || !targetWall || movingWall.curvePoint || targetWall.curvePoint) return null;
  const group = connectedWallGroup(floor.walls, movingWall.id);
  if (group.has(targetWall.id)) return null;
  const movingDirection = unit(movingWall.start, movingWall.end), targetDirection = unit(targetWall.start, targetWall.end);
  if (!movingDirection || !targetDirection) return null;
  const gap = gapCm ?? (movingWall.thickness + targetWall.thickness) / 2;
  if (!Number.isFinite(gap)) return null;

  const movingWalls = floor.walls.filter(w => group.has(w.id));
  const movingRooms = groupRooms(floor, movingWalls);
  const movingRoom = movingRooms.find(entry => entry.room.walls.includes(movingWall.id)) ?? movingRooms[0];
  const targetGroup = connectedWallGroup(floor.walls, targetWall.id);
  const targetRooms = groupRooms(floor, floor.walls.filter(w => targetGroup.has(w.id))).filter(entry => entry.room.walls.includes(targetWall.id));
  const movingCentre = doorCentre(movingWall, moving), targetCentre = doorCentre(targetWall, target);

  // The free side of the target wall: away from the room it bounds, else the side the moving group is on now.
  const extent = movingWalls.map(wallPlanBounds).reduce((a, b) => ({ minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) }));
  const movingAnchor = movingRoom ? roomInteriorPoint(movingRoom.polygon) : { x: (extent.minX + extent.maxX) / 2, y: (extent.minY + extent.maxY) / 2 };
  const normal = { x: -targetDirection.y, y: targetDirection.x };
  const side = (p: Point) => (p.x - targetCentre.x) * normal.x + (p.y - targetCentre.y) * normal.y;
  const facing = targetRooms.length === 1 ? -side(roomInteriorPoint(targetRooms[0].polygon)) : side(movingAnchor);
  const sign = facing < 0 ? -1 : 1;
  const outward = { x: normal.x * sign, y: normal.y * sign };
  const landing = { x: targetCentre.x + outward.x * gap, y: targetCentre.y + outward.y * gap };

  const rigid = (angle: number) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    return (p: Point): Point => {
      const dx = p.x - movingCentre.x, dy = p.y - movingCentre.y;
      return { x: landing.x + dx * c - dy * s, y: landing.y + dx * s + dy * c };
    };
  };
  let angle = Math.atan2(-targetDirection.y, -targetDirection.x) - Math.atan2(movingDirection.y, movingDirection.x);
  if (movingRoom) {
    const placed = rigid(angle)(roomInteriorPoint(movingRoom.polygon));
    if ((placed.x - targetCentre.x) * outward.x + (placed.y - targetCentre.y) * outward.y < 0) angle += Math.PI;
  }

  const polygons = movingRooms.map(entry => entry.polygon);
  const onWall = (p: Point) => movingWalls.some(w => pointToSegmentDist(p, w.start, w.end) <= w.thickness / 2 + 1);
  const belongs = (p: Point) => polygons.length
    ? polygons.some(polygon => pointInPolygon(p, polygon)) || onWall(p)
    : p.x >= extent.minX && p.x <= extent.maxX && p.y >= extent.minY && p.y <= extent.maxY;

  const next = structuredClone(floor);
  const move = rigid(angle), degrees = angle * 180 / Math.PI;
  const turn = (rotation: number) => ((rotation + degrees) % 360 + 360) % 360;
  const movedIds: string[] = [];
  for (const wall of next.walls) if (group.has(wall.id)) {
    wall.start = move(wall.start);
    wall.end = move(wall.end);
    if (wall.curvePoint) wall.curvePoint = move(wall.curvePoint);
    movedIds.push(wall.id);
  }
  for (const opening of [...next.doors, ...next.windows]) if (group.has(opening.wallId)) movedIds.push(opening.id);
  for (const item of [...next.furniture, ...next.stairs ?? [], ...next.columns ?? [], ...next.entourage ?? []]) if (belongs(item.position)) {
    item.position = move(item.position);
    item.rotation = turn(item.rotation);
    movedIds.push(item.id);
  }
  for (const note of next.textAnnotations ?? []) if (belongs(note)) {
    const p = move(note);
    Object.assign(note, { x: p.x, y: p.y, rotation: turn(note.rotation) });
    movedIds.push(note.id);
  }
  for (const line of [...next.measurements ?? [], ...next.annotations ?? []]) if (belongs({ x: (line.x1 + line.x2) / 2, y: (line.y1 + line.y2) / 2 })) {
    const a = move({ x: line.x1, y: line.y1 }), b = move({ x: line.x2, y: line.y2 });
    Object.assign(line, { x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    movedIds.push(line.id);
  }
  return { floor: next, movedIds };
}
