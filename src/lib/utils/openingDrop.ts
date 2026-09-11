import type { Point, Wall } from '$lib/models/types';
import { projectOntoWall } from './wallProjection';

/** Keep the existing 5% endpoint margin and 100cm radius for opening drops. */
export function openingDropTarget(point: Point, walls: Wall[], radius = 100): { wallId: string; position: number } | null {
  let bestDistance = radius, result: { wallId: string; position: number } | null = null;
  for (const wall of walls) {
    const projected = projectOntoWall(point, wall, .05, .95);
    if (projected && projected.distance < bestDistance) {
      bestDistance = projected.distance;
      result = { wallId: wall.id, position: projected.position };
    }
  }
  return result;
}
