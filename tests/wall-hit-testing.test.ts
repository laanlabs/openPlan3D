import { describe, expect, it } from 'vitest';
import type { Wall } from '$lib/models/types';
import { findWallAt } from '$lib/utils/hitTesting';
import { rectangleWalls } from './fixtures/project';

const wall = (id: string, y: number, thickness = 20, extra: Partial<Wall> = {}): Wall =>
  ({ id, start: { x: 0, y }, end: { x: 600, y }, thickness, height: 250, color: '#fff', ...extra });

describe.each([3, 4, 10])('straight wall picking at zoom %s', zoom => {
  it('selects a click inside the painted body and keeps the screen-space band beyond its edge', () => {
    const thick = wall('thick', 0);
    expect(findWallAt({ x: 300, y: 8 }, [thick], zoom)).toBe(thick);
    expect(findWallAt({ x: 300, y: 10 + 14 / zoom }, [thick], zoom)).toBe(thick);
    expect(findWallAt({ x: 300, y: 10 + 16 / zoom }, [thick], zoom)).toBeNull();
  });
});

it('selects the room wall under a high-zoom click instead of falling through to the room', () => {
  const walls = rectangleWalls();
  expect(findWallAt({ x: 200, y: 6 }, walls, 4)?.id).toBe('a-0');
  expect(findWallAt({ x: 200, y: -6 }, walls, 4)?.id).toBe('a-0');
});

describe('nearest wall wins within the pick band', () => {
  const a = wall('a', 0, 15), b = wall('b', 50, 15);
  it('picks the wall under the pointer at low zoom regardless of array order', () => {
    for (const walls of [[a, b], [b, a]]) {
      expect(findWallAt({ x: 300, y: 50 }, walls, .25)?.id).toBe('b');
      expect(findWallAt({ x: 300, y: 0 }, walls, .25)?.id).toBe('a');
      expect(findWallAt({ x: 300, y: 20 }, walls, .25)?.id).toBe('a');
      expect(findWallAt({ x: 300, y: 30 }, walls, .25)?.id).toBe('b');
    }
  });
  it('ranks straight and curved walls alike', () => {
    const curved = wall('curved', 100, 15, { curvePoint: { x: 300, y: 200 } });
    expect(findWallAt({ x: 300, y: 150 }, [a, curved], .1)?.id).toBe('curved');
    expect(findWallAt({ x: 300, y: 10 }, [curved, a], .1)?.id).toBe('a');
  });
  it('prefers the wall whose painted body is under the pointer over a nearer thin centreline', () => {
    const thick = wall('thick', 0, 30), thin = wall('thin', 25, 10);
    expect(findWallAt({ x: 300, y: 14 }, [thin, thick], 1)?.id).toBe('thick');
    expect(findWallAt({ x: 300, y: 21 }, [thick, thin], 1)?.id).toBe('thin');
  });
});
