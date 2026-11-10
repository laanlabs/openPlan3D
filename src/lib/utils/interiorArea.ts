import type { Point, Wall } from '$lib/models/types';
import { wallPathSpans } from './wallProfiles';

type Interval = [number, number];
type Edge = [Point, Point];
type Extent = { minX: number; minY: number; maxX: number; maxY: number };

/** Narrower open spans are rounding at shared corners, not floor (cm). */
const SLIVER = 1e-6;

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
  const footprints = wallFootprints(walls);
  if (!footprints) return null;
  const ys = bandLevels([...room, ...footprints]);
  if (!ys) return null;
  let area = 0;
  for (let i = 1; i < ys.length; i++) {
    const y = (ys[i - 1] + ys[i]) / 2;
    const union = blockedUnion(footprints, y);
    let width = 0;
    for (const [left, right] of intervals(room, y)) {
      width += right - left;
      for (const [a, b] of union) width -= Math.max(0, Math.min(right, b) - Math.max(left, a));
    }
    area += Math.max(0, width) * (ys[i] - ys[i - 1]);
  }
  return Number.isFinite(area) ? area / 10_000 : null;
}

/** Bounding box of what interiorRoomArea measures, the outline less the wall
 * footprints: its size is the clear span between wall faces, which room
 * dimensions show when walls are measured edge to edge (issue #121). Null on
 * invalid input or budget, or when the walls leave nothing inside.
 */
export function interiorRoomExtent(ring: Point[], walls: Wall[]): Extent | null {
  if (ring.length < 3 || ring.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const all = wallFootprints(walls);
  if (!all) return null;
  const outline = extentOf(ring);
  // A footprint clear of the outline's box cannot cut into the room; leaving it
  // out keeps a large floor within budget.
  const footprints = all.filter(footprint => {
    const box = extentOf(footprint);
    return box.minX <= outline.maxX && box.maxX >= outline.minX && box.minY <= outline.maxY && box.maxY >= outline.minY;
  });
  const ys = bandLevels([ring, ...footprints]);
  if (!ys) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 1; i < ys.length; i++) {
    const y0 = ys[i - 1], y1 = ys[i];
    if (!openIntervals([ring], footprints, (y0 + y1) / 2).length) continue;
    minY = Math.min(minY, y0); maxY = Math.max(maxY, y1);
    // Edges keep their order within a band, so an open span is widest at one of
    // the band's ends; sample just inside both.
    const inset = (y1 - y0) * 1e-9;
    for (const y of [y0 + inset, y1 - inset]) for (const [a, b] of openIntervals([ring], footprints, y)) {
      minX = Math.min(minX, a); maxX = Math.max(maxX, b);
    }
  }
  return minX < maxX && minY < maxY ? { minX, minY, maxX, maxY } : null;
}

function extentOf(points: Point[]): Extent {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

/** Square-capped footprint of each wall span: the caps close corners and T junctions. Null on an invalid wall. */
function wallFootprints(walls: Wall[]): Point[][] | null {
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
  return footprints;
}

/** Scanline levels at every vertex and edge crossing, so edge order is fixed within each band. Null over budget. */
function bandLevels(polygons: Point[][]): number[] | null {
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
  return ys.length * edges.length > 2_000_000 ? null : ys;
}

function intervals(rings: Point[][], y: number): Interval[] {
  const xs = rings.flatMap(r => r.flatMap((a, i) => {
    const b = r[(i + 1) % r.length];
    return (a.y > y) !== (b.y > y) ? [a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y)] : [];
  })).sort((a, b) => a - b);
  const result: Interval[] = [];
  for (let i = 0; i + 1 < xs.length; i += 2) result.push([xs[i], xs[i + 1]]);
  return result;
}

/** The wall footprints' spans at y, merged where they overlap. */
function blockedUnion(footprints: Point[][], y: number): Interval[] {
  const blocked = footprints.flatMap(r => intervals([r], y)).sort((a, b) => a[0] - b[0]);
  const union: Interval[] = [];
  for (const item of blocked) {
    const last = union.at(-1);
    if (last && item[0] <= last[1]) last[1] = Math.max(last[1], item[1]);
    else union.push([...item]);
  }
  return union;
}

/** The room's spans at y that no wall footprint covers. */
function openIntervals(room: Point[][], footprints: Point[][], y: number): Interval[] {
  const union = blockedUnion(footprints, y), open: Interval[] = [];
  for (const [left, right] of intervals(room, y)) {
    let x = left;
    for (const [a, b] of union) {
      if (b <= x) continue;
      if (a >= right) break;
      if (a - x > SLIVER) open.push([x, a]);
      x = Math.max(x, b);
    }
    if (right - x > SLIVER) open.push([x, right]);
  }
  return open;
}
