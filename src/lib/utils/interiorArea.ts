import type { Point, Wall } from '$lib/models/types';
import { wallPathSpans } from './wallProfiles';

type Interval = [number, number];
type Edge = [Point, Point];

/** Area inside a room (with holes), excluding the union of wall footprints.
 * Coordinates are cm, result m². Integrate scanline lengths between every
 * vertex/intersection: edge order is fixed within each band, so its midpoint
 * gives the exact integral for the faceted polygons. Unknown on budget/invalid
 * input rather than returning a partial area. Openings do not remove floor wall
 * footprints, matching the native room-area convention.
 */
export function interiorRoomArea(ring: Point[], holes: Point[][], walls: Wall[]): number | null {
  const room = [ring, ...holes];
  if (ring.length < 3 || room.some(r => r.length < 3 || r.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y)))) return null;
  const footprints: Point[][] = [];
  for (const wall of walls) {
    if (!Number.isFinite(wall.thickness) || wall.thickness <= 0) return null;
    for (const span of wallPathSpans(wall)) {
      const dx = span.end.x - span.start.x, dy = span.end.y - span.start.y;
      const length = Math.hypot(dx, dy), half = wall.thickness / 2;
      if (!Number.isFinite(length)) return null;
      if (length === 0) continue;
      const ux = dx / length, uy = dy / length;
      // Square end caps close corners and T junctions; overlapping walls count once.
      footprints.push([[-half, -half], [length + half, -half], [length + half, half], [-half, half]]
        .map(([along, across]) => ({ x: span.start.x + along * ux - across * uy, y: span.start.y + along * uy + across * ux })));
    }
  }
  const polygons = [...room, ...footprints];
  const edges: Edge[] = polygons.flatMap(r => r.map((a, i) => [a, r[(i + 1) % r.length]] as Edge));
  if (edges.length > 600) return null;
  const levels = polygons.flat().map(p => p.y);
  for (let i = 0; i < edges.length; i++) {
    const [a, b] = edges[i], dx = b.x - a.x, dy = b.y - a.y;
    for (let j = i + 1; j < edges.length; j++) {
      const [c, d] = edges[j], ex = d.x - c.x, ey = d.y - c.y;
      const cross = dx * ey - dy * ex;
      if (cross === 0) continue;
      const t = ((c.x - a.x) * ey - (c.y - a.y) * ex) / cross;
      const u = ((c.x - a.x) * dy - (c.y - a.y) * dx) / cross;
      if (t > 0 && t < 1 && u > 0 && u < 1) levels.push(a.y + t * dy);
    }
  }
  const ys = [...new Set(levels)].sort((a, b) => a - b);
  if (ys.length * edges.length > 2_000_000) return null;
  function intervals(rings: Point[][], y: number): Interval[] {
    const xs = rings.flatMap(r => r.flatMap((a, i) => {
      const b = r[(i + 1) % r.length];
      return (a.y > y) !== (b.y > y) ? [a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y)] : [];
    })).sort((a, b) => a - b);
    const result: Interval[] = [];
    for (let i = 0; i + 1 < xs.length; i += 2) result.push([xs[i], xs[i + 1]]);
    return result;
  }
  let area = 0;
  for (let i = 1; i < ys.length; i++) {
    const y = (ys[i - 1] + ys[i]) / 2;
    const blocked = footprints.flatMap(r => intervals([r], y)).sort((a, b) => a[0] - b[0]);
    const union: Interval[] = [];
    for (const item of blocked) {
      const last = union.at(-1);
      if (last && item[0] <= last[1]) last[1] = Math.max(last[1], item[1]);
      else union.push([...item]);
    }
    let width = 0;
    for (const [left, right] of intervals(room, y)) {
      width += right - left;
      for (const [a, b] of union) width -= Math.max(0, Math.min(right, b) - Math.max(left, a));
    }
    area += Math.max(0, width) * (ys[i] - ys[i - 1]);
  }
  return Number.isFinite(area) ? area / 10_000 : null;
}
