import { getWallStartHeight, getWallEndHeight, type Wall, type Door, type Window, type Point } from '$lib/models/types';

export interface WallOpening { left: number; right: number; bottom: number; top: number }
export interface WallSegment { width: number; bottomY: number; topYLeft: number; topYRight: number; offsetX: number }
const at = (length: number, start: number, end: number, x: number) => start + (end - start) * Math.max(0, Math.min(1, x / length));

/** Rectangular openings must fit under BOTH ends of their span, not just their
 * centre. Rendering is clipped; the stored opening dimensions are never changed.
 */
export function openingOnWall(length: number, start: number, end: number, position: number, width: number, bottom: number, height: number): WallOpening | null {
  if (![length, start, end, position, width, bottom, height].every(Number.isFinite) || length <= 0 || width <= 0 || height <= 0) return null;
  const left = Math.max(0, position * length - width / 2);
  const right = Math.min(length, position * length + width / 2);
  const top = Math.min(bottom + height, at(length, start, end, left), at(length, start, end, right));
  bottom = Math.max(0, bottom);
  return right > left && top > bottom ? { left, right, bottom, top } : null;
}

/** Subtract the union of all openings from a trapezoidal wall face. Splitting
 * at each opening edge handles overlaps and clipped end openings consistently.
 */
export function buildWallSegments(length: number, start: number, end: number, doors: Door[], windows: Window[]): WallSegment[] {
  if (![length, start, end].every(Number.isFinite) || length <= 0) return [];
  const openings = [
    ...doors.map(d => openingOnWall(length, start, end, d.position, d.width, 0, d.height ?? 210)),
    ...windows.map(w => openingOnWall(length, start, end, w.position, w.width, w.sillHeight ?? 90, w.height)),
  ].filter((o): o is WallOpening => o !== null);
  return segmentsAroundOpenings(length, start, end, openings);
}

function segmentsAroundOpenings(length: number, start: number, end: number, openings: WallOpening[]): WallSegment[] {
  const edges = [...new Set([0, length, ...openings.flatMap(o => [o.left, o.right])])].sort((a, b) => a - b);
  const result: WallSegment[] = [];
  for (let i = 1; i < edges.length; i++) {
    const left = edges[i - 1], right = edges[i];
    const hLeft = at(length, start, end, left), hRight = at(length, start, end, right);
    const holes = openings.filter(o => o.left < right && o.right > left).sort((a, b) => a.bottom - b.bottom);
    let bottom = 0;
    const append = (topLeft: number, topRight: number) => {
      if (Math.max(topLeft, topRight) > bottom) result.push({ width: right - left, offsetX: (left + right) / 2, bottomY: bottom, topYLeft: topLeft, topYRight: topRight });
    };
    for (const hole of holes) {
      if (hole.bottom > bottom) append(hole.bottom, hole.bottom);
      bottom = Math.max(bottom, hole.top);
    }
    append(hLeft, hRight);
  }
  return result;
}

/** Same quadratic parameterization for active and inactive curved walls. */
export function wallPathSpans(wall: Wall): { start: Point; end: Point; startHeight: number; endHeight: number }[] {
  const count = wall.curvePoint ? 16 : 1;
  const startH = getWallStartHeight(wall), endH = getWallEndHeight(wall);
  const point = (t: number): Point => wall.curvePoint ? {
    x: (1 - t) ** 2 * wall.start.x + 2 * (1 - t) * t * wall.curvePoint.x + t * t * wall.end.x,
    y: (1 - t) ** 2 * wall.start.y + 2 * (1 - t) * t * wall.curvePoint.y + t * t * wall.end.y,
  } : { x: wall.start.x + (wall.end.x - wall.start.x) * t, y: wall.start.y + (wall.end.y - wall.start.y) * t };
  return Array.from({ length: count }, (_, i) => ({ start: point(i / count), end: point((i + 1) / count), startHeight: startH + (endH - startH) * i / count, endHeight: startH + (endH - startH) * (i + 1) / count }));
}

/** Distances on the same faceted curve used by the viewer. Saved positions are
 * quadratic parameters, so they must be converted before applying physical widths.
 */
export function wallPathProfile(wall: Wall) {
  let length = 0;
  const spans = wallPathSpans(wall).map(span => {
    const from = length, size = Math.hypot(span.end.x - span.start.x, span.end.y - span.start.y);
    length += size;
    return { ...span, from, to: length, length: size };
  });
  const sample = (distance: number) => {
    const d = Math.max(0, Math.min(length, distance));
    const span = spans.find(s => s.length > 0 && d <= s.to) ?? spans[spans.length - 1];
    const t = span.length > 0 ? Math.max(0, Math.min(1, (d - span.from) / span.length)) : 0;
    return { point: { x: span.start.x + (span.end.x - span.start.x) * t,
      y: span.start.y + (span.end.y - span.start.y) * t }, height: span.startHeight + (span.endHeight - span.startHeight) * t };
  };
  return { length, spans, sample, distanceAt(position: number) {
    if (!Number.isFinite(position)) return NaN;
    const scaled = Math.max(0, Math.min(1, position)) * spans.length;
    const index = Math.min(spans.length - 1, Math.floor(scaled));
    return spans[index].from + (scaled - index) * spans[index].length;
  } };
}

export function pathOpening(path: ReturnType<typeof wallPathProfile>, center: number, width: number, bottom: number, height: number): WallOpening | null {
  if (![path.length, center, width, bottom, height].every(Number.isFinite) || path.length <= 0 || width <= 0 || height <= 0) return null;
  const left = Math.max(0, center - width / 2), right = Math.min(path.length, center + width / 2);
  const top = Math.min(bottom + height, path.sample(left).height, path.sample(right).height);
  bottom = Math.max(0, bottom);
  return right > left && top > bottom ? { left, right, bottom, top } : null;
}

/** Cut the union of the full openings before distributing them across curve
 * spans. A shared head height keeps a sloped aperture level across facet joins.
 */
export function wallProfileSpans(wall: Wall, doors: Door[], windows: Window[]) {
  const path = wallPathProfile(wall);
  const holes = [
    ...doors.map(d => pathOpening(path, path.distanceAt(d.position), d.width, 0, d.height ?? 210)),
    ...windows.map(w => pathOpening(path, path.distanceAt(w.position), w.width, w.sillHeight ?? 90, w.height)),
  ].filter((hole): hole is WallOpening => hole !== null);
  return path.spans.filter(span => span.length > 0).map(span => {
    const local: WallOpening[] = holes.flatMap(hole => {
      // Preserve exact span endpoints: converting through position/width can
      // round a full-span hole inward and leave a zero-width blocking face.
      const left = hole.left <= span.from ? 0 : hole.left - span.from;
      const right = hole.right >= span.to ? span.length : hole.right - span.from;
      const top = Math.min(hole.top, at(span.length, span.startHeight, span.endHeight, left), at(span.length, span.startHeight, span.endHeight, right));
      return right > left && top > hole.bottom ? [{ ...hole, left, right, top }] : [];
    });
    return { ...span, segments: segmentsAroundOpenings(span.length, span.startHeight, span.endHeight, local) };
  });
}

export function roomCeilingHeight(wallIds: string[], walls: Wall[]): number | undefined {
  const boundary = wallIds.map(id => walls.find(w => w.id === id));
  if (!boundary.length || boundary.some(w => !w)) return undefined;
  const height = getWallStartHeight(boundary[0]!);
  return height > 0 && boundary.every(w => Math.abs(getWallStartHeight(w!) - height) < 0.01 && Math.abs(getWallEndHeight(w!) - height) < 0.01) ? height : undefined;
}

/** Pose for the slightly open 3D door leaf, in world X/Z coordinates. */
export function doorPanelPose(wall: Wall, door: Door): { x: number; z: number; yaw: number } {
  const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
  const hingeSide = door.swingDirection === 'left' ? 1 : -1;
  const face = door.flipSide ? -1 : 1;
  const hinge = hingeSide * door.width / 2;
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * door.position + hinge * Math.cos(angle) - Math.sin(angle) * face * 2,
    z: wall.start.y + (wall.end.y - wall.start.y) * door.position + hinge * Math.sin(angle) + Math.cos(angle) * face * 2,
    yaw: angle + (hingeSide === 1 ? Math.PI : 0) - hingeSide * face * 0.26,
  };
}
