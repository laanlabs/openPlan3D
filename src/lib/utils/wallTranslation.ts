import type { Point, Wall } from '$lib/models/types';

export type WallGeometry = Pick<Wall, 'start' | 'end' | 'curvePoint'>;

const moved = (p: Point, dx: number, dy: number): Point => ({ x: p.x + dx, y: p.y + dy });

/** Rigid translation of a wall: a curved wall keeps its shape because the control point moves with the endpoints. */
export function translatedWallGeometry(origin: WallGeometry, dx: number, dy: number): WallGeometry {
  return { start: moved(origin.start, dx, dy), end: moved(origin.end, dx, dy), curvePoint: origin.curvePoint && moved(origin.curvePoint, dx, dy) };
}

/** Plain copy of the geometry a drag starts from, so every frame translates the press-time wall. */
export function wallGeometryOf(wall: WallGeometry): WallGeometry {
  return translatedWallGeometry(wall, 0, 0);
}
