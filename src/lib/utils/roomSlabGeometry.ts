import { ExtrudeGeometry, Shape } from 'three';
import type { Point } from '$lib/models/types';

/** A preview slab under the room's existing centreline polygon, in centimetres.
 * Its top is at floor elevation zero; thickness extends downwards. The caller
 * owns the returned geometry. No bounding rectangle or open-wall floor is inferred.
 */
export function createRoomSlabGeometry(polygon: Point[], thickness = 5): ExtrudeGeometry | null {
  if (polygon.length < 3 || !Number.isFinite(thickness) || thickness <= 0 ||
      polygon.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const area = polygon.reduce((sum, p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0);
  if (Math.abs(area) < 1e-6) return null;
  const shape = new Shape();
  shape.moveTo(polygon[0].x, polygon[0].y);
  for (const p of polygon.slice(1)) shape.lineTo(p.x, p.y);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geometry.rotateX(Math.PI / 2); // XY -> XZ, positive extrusion -> negative Y
  return geometry;
}
