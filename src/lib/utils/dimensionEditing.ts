import type { Annotation, Measurement, Point } from '$lib/models/types';

/** A measured line: a Measure-tool measurement or a Dimension annotation. */
type Line = Pick<Measurement, 'x1' | 'y1' | 'x2' | 'y2'>;
export type LineEnd = 'start' | 'end';

/** The end of `line` within `tolerance` of `point`; the nearer one when both are. */
export function lineEndAt(point: Point, line: Line, tolerance: number): LineEnd | null {
  const start = Math.hypot(point.x - line.x1, point.y - line.y1);
  const end = Math.hypot(point.x - line.x2, point.y - line.y2);
  if (Math.min(start, end) > tolerance) return null;
  return start <= end ? 'start' : 'end';
}

/** `line` with one end moved to `point`, or null when that would leave it with no length. */
export function moveLineEnd(line: Line, end: LineEnd, point: Point): Line | null {
  const next = end === 'start'
    ? { x1: point.x, y1: point.y, x2: line.x2, y2: line.y2 }
    : { x1: line.x1, y1: line.y1, x2: point.x, y2: point.y };
  return Math.hypot(next.x2 - next.x1, next.y2 - next.y1) < 1 ? null : next;
}

/** `line` moved by `delta` without changing its length or direction. */
export function translateLine(line: Line, delta: Point): Line {
  return { x1: line.x1 + delta.x, y1: line.y1 + delta.y, x2: line.x2 + delta.x, y2: line.y2 + delta.y };
}

/**
 * The offset that puts a dimension's line through `point`: the signed distance from the measured
 * points to it, on the side the renderer draws a positive offset.
 */
export function dimensionOffsetAt(dimension: Line, point: Point): number {
  const dx = dimension.x2 - dimension.x1, dy = dimension.y2 - dimension.y1;
  const length = Math.hypot(dx, dy);
  if (length < 1) return 0;
  return ((point.x - dimension.x1) * -dy + (point.y - dimension.y1) * dx) / length;
}

/** Middle of the drawn line: of the measurement itself, or of a dimension's offset line. */
export function lineToolbarAnchor(line: Line, offset = 0): Point {
  const dx = line.x2 - line.x1, dy = line.y2 - line.y1;
  const length = Math.hypot(dx, dy) || 1;
  return { x: (line.x1 + line.x2) / 2 + (-dy / length) * offset, y: (line.y1 + line.y2) / 2 + (dx / length) * offset };
}

export const dimensionAnchor = (dimension: Annotation) => lineToolbarAnchor(dimension, dimension.offset ?? 40);
