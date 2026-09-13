import type { Point, Wall } from '$lib/models/types';

/** Exact subdivision of a straight segment or quadratic Bézier path. */
export function splitWallGeometry(wall: Wall, t: number) {
  const lerp = (a: Point, b: Point): Point => ({ x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t });
  const firstControl = wall.curvePoint ? lerp(wall.start, wall.curvePoint) : undefined;
  const secondControl = wall.curvePoint ? lerp(wall.curvePoint, wall.end) : undefined;
  const middle = firstControl && secondControl ? lerp(firstControl, secondControl) : lerp(wall.start, wall.end);
  return {
    first: { start: wall.start, end: middle, ...(firstControl ? { curvePoint: firstControl } : {}) },
    second: { start: middle, end: wall.end, ...(secondControl ? { curvePoint: secondControl } : {}) },
  };
}
