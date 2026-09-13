import { expect, it } from 'vitest';
import { wallPlanBounds } from '$lib/utils/wallPlanGeometry';
import type { Wall } from '$lib/models/types';
const wall: Wall = { id: 'curve', start: { x: 0, y: 0 }, end: { x: 400, y: 300 }, curvePoint: { x: 800, y: -600 }, thickness: 200, height: 280, color: '#fff' };
it('bounds exact asymmetric quadratic extrema and wall thickness without using the control hull', () => {
 const before = JSON.stringify(wall), b = wallPlanBounds(wall);
 expect(b.minX).toBe(-100); expect(b.maxX).toBeCloseTo(633.3333333);
 expect(b.minY).toBeCloseTo(-340); expect(b.maxY).toBe(400);
 for (let i = 0; i <= 1000; i++) {
  const t = i / 1000, x = 2 * (1-t) * t * 800 + t*t*400, y = 2*(1-t)*t*-600+t*t*300;
  expect(x - 100).toBeGreaterThanOrEqual(b.minX - 1e-9); expect(x + 100).toBeLessThanOrEqual(b.maxX + 1e-9);
  expect(y - 100).toBeGreaterThanOrEqual(b.minY - 1e-9); expect(y + 100).toBeLessThanOrEqual(b.maxY + 1e-9);
 }
 expect(wallPlanBounds({ ...wall, start: wall.end, end: wall.start })).toEqual(b);
 expect(JSON.stringify(wall)).toBe(before);
});
it('handles straight and constant-coordinate walls without invalid extrema', () => {
 expect(wallPlanBounds({ ...wall, curvePoint: undefined })).toEqual({ minX: -100, maxX: 500, minY: -100, maxY: 400 });
 expect(wallPlanBounds({ ...wall, start: {x: 0,y:0}, end: {x:0,y:300}, curvePoint: {x:0,y:150} })).toEqual({ minX:-100,maxX:100,minY:-100,maxY:400 });
});
