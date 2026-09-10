import type { Point, Wall } from '$lib/models/types';
import { wallPointAt } from './canvasRenderer';
import { positionOnWall } from './hitTesting';

/** Translate an opening's original center, then constrain it to its host wall. */
export function translatedOpeningPosition(wall: Wall, position: number, delta: Point): number {
  if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y) || (delta.x === 0 && delta.y === 0)) return position;
  const center = wallPointAt(wall, position);
  return positionOnWall({ x:center.x+delta.x, y:center.y+delta.y }, wall);
}
