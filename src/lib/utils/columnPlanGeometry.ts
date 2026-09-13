import type { Column } from '$lib/models/types';

/** Plan corners also locate the diagonal column marker endpoints. */
export function columnPlanCorners(column: Column) {
  const angle = column.shape === 'square' ? column.rotation * Math.PI / 180 : 0;
  const c = Math.cos(angle), s = Math.sin(angle), r = column.diameter / 2;
  return [[-r, -r], [r, -r], [r, r], [-r, r]].map(([x, y]) => ({
    x: column.position.x + x * c - y * s,
    y: column.position.y + x * s + y * c,
  }));
}

export function columnPlanBounds(column: Column) {
  const points = columnPlanCorners(column);
  return { minX: Math.min(...points.map(p => p.x)) - .5,
    minY: Math.min(...points.map(p => p.y)) - .5,
    maxX: Math.max(...points.map(p => p.x)) + .5,
    maxY: Math.max(...points.map(p => p.y)) + .5 };
}
