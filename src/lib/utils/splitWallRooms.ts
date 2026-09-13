import type { Floor, Wall } from '$lib/models/types';
import { getRoomPolygon } from './roomDetection';
import { wallPathSpans } from './wallProfiles';

/** Choose which child segments still bound each saved room before changing geometry. */
export function splitWallRoomReferences(floor: Floor, wall: Wall, t: number, newId: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const spans = wallPathSpans(wall);
  for (const room of floor.rooms) {
    if (!room.walls.includes(wall.id)) continue;
    const polygon = getRoomPolygon(room, floor.walls);
    let first = false, second = false;
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      for (const [index, span] of spans.entries()) {
        const dx = span.end.x-span.start.x, dy = span.end.y-span.start.y;
        const length = Math.hypot(dx, dy);
        if (!length) continue;
        const distance = (point: typeof a) => Math.abs((point.x-span.start.x)*dy-(point.y-span.start.y)*dx)/length;
        if (distance(a) > 1e-6 || distance(b) > 1e-6) continue;
        const parameter = (point: typeof a) => ((point.x-span.start.x)*dx+(point.y-span.start.y)*dy)/(length*length);
        const lo = (index + Math.max(0, Math.min(parameter(a), parameter(b)))) / spans.length;
        const hi = (index + Math.min(1, Math.max(parameter(a), parameter(b)))) / spans.length;
        first ||= Math.min(hi, t) - lo > 1e-9;
        second ||= hi - Math.max(lo, t) > 1e-9;
      }
    }
    // Retain both references if a historical saved room cannot currently resolve.
    if (!first && !second) first = second = true;
    result.set(room.id, room.walls.flatMap(id => id === wall.id
      ? [...(first ? [wall.id] : []), ...(second ? [newId] : [])] : [id]));
  }
  return result;
}
