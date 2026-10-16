import type { Floor, Point } from '$lib/models/types';
import { wallPointAt } from './canvasRenderer';

export interface MarqueeRect { minX: number; maxX: number; minY: number; maxY: number }
export interface MarqueeLayers { measurements: boolean; annotations: boolean; textAnnotations: boolean }

/**
 * Ids a drag-select rectangle encloses: walls, dimensions and notes by both ends, everything else by
 * its centre. Openings are tested where they are drawn, on the wall path, so a door on a curved wall
 * is not looked for on the straight chord. Hidden dimension and text layers cannot be selected.
 */
export function marqueeSelectionIds(floor: Floor, rect: MarqueeRect, layers: MarqueeLayers): string[] {
  const inside = (p: Point) => p.x >= rect.minX && p.x <= rect.maxX && p.y >= rect.minY && p.y <= rect.maxY;
  const ids: string[] = [];
  for (const wall of floor.walls) if (inside(wall.start) && inside(wall.end)) ids.push(wall.id);
  for (const opening of [...floor.doors, ...floor.windows]) {
    const wall = floor.walls.find(w => w.id === opening.wallId);
    if (wall && inside(wallPointAt(wall, opening.position))) ids.push(opening.id);
  }
  for (const item of [...floor.furniture, ...(floor.stairs ?? []), ...(floor.columns ?? []), ...(floor.entourage ?? [])]) if (inside(item.position)) ids.push(item.id);
  if (layers.textAnnotations) for (const note of floor.textAnnotations ?? []) if (inside(note)) ids.push(note.id);
  for (const line of [...(layers.measurements ? floor.measurements ?? [] : []), ...(layers.annotations ? floor.annotations ?? [] : [])]) {
    if (inside({ x: line.x1, y: line.y1 }) && inside({ x: line.x2, y: line.y2 })) ids.push(line.id);
  }
  return ids;
}
