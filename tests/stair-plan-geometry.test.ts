import { expect, it } from 'vitest';
import { stairLocalBounds, stairPlanBounds } from '$lib/utils/stairPlanGeometry';
import { findStairAt } from '$lib/utils/hitTesting';
import { drawStair } from '$lib/utils/canvasRenderer';
import type { Stair } from '$lib/models/types';
const stair: Stair = { id: 's', position: { x: 1000, y: 2000 }, rotation: 0, width: 100, depth: 300, stairType: 'l-shaped', riserCount: 14, direction: 'up' };
it('includes and selects the rotated outer L arm, excluding empty corners', () => {
  const s = { ...stair, rotation: 90 };
  expect(stairLocalBounds(s)).toEqual({ minX: -50, maxX: 200, minY: -50, maxY: 150 });
  expect(stairPlanBounds(s).minY).toBeCloseTo(1950);
  expect(stairPlanBounds(s).maxY).toBeCloseTo(2200);
  expect(findStairAt({ x: 1000, y: 2150 }, [s])).toBe(s);
  expect(findStairAt({ x: 900, y: 2150 }, [s])).toBeNull();
});
it('selects the U landing but not its central void', () => {
  const s = { ...stair, stairType: 'u-shaped' as const };
  expect(stairLocalBounds(s).minY).toBe(-160);
  expect(findStairAt({ x: 1000, y: 1845 }, [s])).toBe(s);
  expect(findStairAt({ x: 1000, y: 2000 }, [s])).toBeNull();
});
it('uses the circular spiral footprint', () => {
  const s = { ...stair, stairType: 'spiral' as const, rotation: 35 };
  expect(findStairAt({ x: 1040, y: 2040 }, [s])).toBeNull();
  expect(findStairAt({ x: 1000, y: 2040 }, [s])).toBe(s);
  expect(stairPlanBounds(s)).toEqual({ minX: 950, maxX: 1050, minY: 1950, maxY: 2050 });
});
it('keeps both straight stair arrows within the footprint', () => {
  for (const direction of ['up', 'down'] as const) {
    const points: number[][] = [];
    const ctx = { save() {}, restore() {}, translate() {}, rotate() {}, fillRect() {}, strokeRect() {}, beginPath() {}, closePath() {}, stroke() {}, fill() {}, fillText() {},
      moveTo(x: number, y: number) { points.push([x,y]); }, lineTo(x: number, y: number) { points.push([x,y]); } } as unknown as CanvasRenderingContext2D;
    drawStair({ ctx, width: 500, height: 500, camX: 0, camY: 0, zoom: 1 }, { ...stair, stairType: 'straight', direction }, false);
    expect(points.every(([x,y]) => Math.abs(x) <= 50 && Math.abs(y) <= 150)).toBe(true);
  }
});
