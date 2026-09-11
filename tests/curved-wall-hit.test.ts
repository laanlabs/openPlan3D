import { expect, it } from 'vitest';
import type { Wall } from '$lib/models/types';
import { findWallAt, positionOnWall } from '$lib/utils/hitTesting';

const wall: Wall = { id: 'curve', start: { x: -3000, y: 0 }, end: { x: 3000, y: 0 }, curvePoint: { x: 0, y: 6000 }, thickness: 20, height: 250, color: '#fff' };
const point = (t: number) => ({ x: -3000 + 6000 * t, y: 12000 * t * (1 - t) });
it.each([.137, .237, .683])('selects the visible curve between old sample points at %s', t => {
  expect(findWallAt(point(t), [wall], 1)).toBe(wall);
  expect(findWallAt(point(t), [wall], 4)).toBe(wall);
});
it.each([.137, .237, .683])('positions an opening continuously along the curve at %s', t => {
  expect(positionOnWall(point(t), wall)).toBeCloseTo(t, 10);
});
it('retains endpoint limits and rejects points outside the hit radius', () => {
  expect(positionOnWall(wall.start, wall)).toBe(.1);
  expect(positionOnWall(wall.end, wall)).toBe(.9);
  expect(findWallAt({ x: 0, y: 3030 }, [wall], 1)).toBeNull();
  expect(findWallAt({ x: 0, y: 3020 }, [wall], 1)).toBe(wall);
  expect(findWallAt({ x: 0, y: 3020 }, [wall], 4)).toBeNull();
});
