import { expect, it } from 'vitest';
import { columnPlanBounds, columnPlanCorners } from '$lib/utils/columnPlanGeometry';
import type { Column } from '$lib/models/types';
const column: Column = { id: 'column', position: { x: 5000, y: -8000 }, shape: 'square', rotation: 45, diameter: 100, height: 300, color: '#cc22cc' };
it('bounds rotated square columns and preserves the source', () => {
  const before = structuredClone(column), b = columnPlanBounds(column);
  expect(b.maxX - b.minX).toBeCloseTo(Math.sqrt(2) * 100 + 1);
  expect((b.maxY + b.minY) / 2).toBe(-8000);
  expect(columnPlanCorners(column)[0].x).toBeCloseTo(5000);
  expect(column).toEqual(before);
});
it('round columns ignore rotation and include the diagonal markers', () => {
  const round = { ...column, shape: 'round' as const };
  expect(columnPlanBounds(round)).toEqual({ minX: 4949.5, maxX: 5050.5, minY: -8050.5, maxY: -7949.5 });
  expect(columnPlanCorners(round)).toEqual(columnPlanCorners({ ...round, rotation: 0 }));
});
