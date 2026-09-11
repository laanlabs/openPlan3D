import type { Floor, Wall } from '$lib/models/types';
import { getRoomPolygon } from './roomDetection';

/** Choose which child segments still bound each saved room before changing geometry. */
export function splitWallRoomReferences(floor: Floor, wall: Wall, t: number, newId: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy);
  if (!length) return result;
  for (const room of floor.rooms) {
    if (!room.walls.includes(wall.id)) continue;
    const polygon = getRoomPolygon(room, floor.walls);
    let first = false, second = false;
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const distance = (point: typeof a) => Math.abs((point.x - wall.start.x) * dy - (point.y - wall.start.y) * dx) / length;
      if (distance(a) > 1e-6 || distance(b) > 1e-6) continue;
      const parameter = (point: typeof a) => ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / (length * length);
      const lo = Math.max(0, Math.min(parameter(a), parameter(b)));
      const hi = Math.min(1, Math.max(parameter(a), parameter(b)));
      first ||= Math.min(hi, t) - lo > 1e-9;
      second ||= hi - Math.max(lo, t) > 1e-9;
    }
    // Retain both references if a historical saved room cannot currently resolve.
    if (!first && !second) first = second = true;
    result.set(room.id, room.walls.flatMap(id => id === wall.id
      ? [...(first ? [wall.id] : []), ...(second ? [newId] : [])] : [id]));
  }
  return result;
}
