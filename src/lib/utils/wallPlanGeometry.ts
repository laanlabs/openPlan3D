import { wallPathProfile } from './wallProfiles';
import type { Wall } from '$lib/models/types';

/** Exact quadratic centreline extrema, expanded for a round-capped wall stroke. */
export function wallPlanBounds(wall: Wall) {
  const points = [wall.start, wall.end];
  if (wall.curvePoint) {
    for (const axis of ['x', 'y'] as const) {
      const a = wall.start[axis], c = wall.curvePoint[axis], b = wall.end[axis];
      const denominator = a - 2 * c + b;
      const t = denominator ? (a - c) / denominator : -1;
      if (t > 0 && t < 1) points.push({
        x: (1 - t) ** 2 * wall.start.x + 2 * (1 - t) * t * wall.curvePoint.x + t * t * wall.end.x,
        y: (1 - t) ** 2 * wall.start.y + 2 * (1 - t) * t * wall.curvePoint.y + t * t * wall.end.y,
      });
    }
  }
  const half = Math.max(0, wall.thickness) / 2;
  return { minX: Math.min(...points.map(p => p.x)) - half, maxX: Math.max(...points.map(p => p.x)) + half,
    minY: Math.min(...points.map(p => p.y)) - half, maxY: Math.max(...points.map(p => p.y)) + half };
}

/** Match the faceted wall length, with readable dimension text outside curves. */
export function wallPlanDimension(wall: Wall) {
  const path = wallPathProfile(wall), middle = path.length / 2;
  const point = path.sample(middle).point;
  if (!wall.curvePoint) return { length: Math.round(path.length), point: { x: point.x, y: point.y - 8 } };
  const a = path.sample(Math.max(0, middle - 1)).point, b = path.sample(Math.min(path.length, middle + 1)).point;
  const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1;
  const offset = Math.max(0, wall.thickness) / 2 + 20;
  return { length: Math.round(path.length), point: { x: point.x + dy / length * offset, y: point.y - dx / length * offset } };
}
