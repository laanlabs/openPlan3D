import { wallEdgeInsets } from './canvasRenderer';
import { wallPlanDimension } from './wallPlanGeometry';
import type { Point, Wall } from '$lib/models/types';

/** Wall length label for plan exports, following the editor's "Measure walls"
 * setting (issue #106). Edge mode shortens a straight wall by the half-thickness
 * of abutting walls and centres the label on that clear span; curved walls and
 * centreline mode keep the faceted centreline dimension.
 */
export function wallDimensionLabel(wall: Wall, walls: Wall[], mode: 'centerline' | 'edge'): { length: number; point: Point } {
  if (mode !== 'edge' || wall.curvePoint) return wallPlanDimension(wall);
  const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y, length = Math.hypot(dx, dy);
  const inset = wallEdgeInsets(wall, walls), ux = length ? dx / length : 0, uy = length ? dy / length : 0;
  const start = { x: wall.start.x + ux * inset.start, y: wall.start.y + uy * inset.start };
  const end = { x: wall.end.x - ux * inset.end, y: wall.end.y - uy * inset.end };
  return { length: Math.round(Math.max(0, length - inset.start - inset.end)),
    point: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 8 } };
}
