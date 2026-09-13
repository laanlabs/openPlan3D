import type { Point, Wall } from '$lib/models/types';
import { planWallSpans } from './planOpening';

/** Continuous CAD outlines with butt ends and bounded miter joins. Openings
 * separate runs so no outline crosses a doorway or window. */
export function planWallOutlines(wall: Wall, openings: { position: number; width: number }[]): Point[][] {
  const half = wall.thickness / 2;
  if (!Number.isFinite(half) || half <= 0) return [];
  const runs: Point[][] = [];
  for (const span of planWallSpans(wall, openings)) {
    const previous = runs[runs.length - 1];
    const end = previous?.[previous.length - 1];
    if (end && Math.hypot(end.x - span.start.x, end.y - span.start.y) < 1e-8) previous.push(span.end);
    else runs.push([span.start, span.end]);
  }
  return runs.map(points => {
    const normals = points.slice(1).map((p, i) => {
      const dx = p.x - points[i].x, dy = p.y - points[i].y, length = Math.hypot(dx, dy);
      return { x: -dy / length, y: dx / length };
    });
    const side = (sign: number) => points.flatMap((p, i) => {
      const before = normals[Math.max(0, i - 1)], after = normals[Math.min(i, normals.length - 1)];
      const denominator = 1 + before.x * after.x + before.y * after.y;
      const offset = denominator > 1e-12
        ? { x: (before.x + after.x) / denominator, y: (before.y + after.y) / denominator }
        : null;
      // A bevel avoids arbitrarily long spikes near a reversal.
      const offsets = offset && Math.hypot(offset.x, offset.y) <= 4 ? [offset] : [before, after];
      return offsets.map(n => ({ x: p.x + sign * half * n.x, y: p.y + sign * half * n.y }));
    });
    return [...side(1), ...side(-1).reverse()];
  });
}
