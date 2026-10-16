// Regression for issue #104: dragging a wall endpoint sideways jumped by ~0.17 x the wall length
// (1 m -> ~17 cm, 5 m -> ~87 cm) because the endpoint angle snap used a 10 degree threshold.
import { describe, expect, it } from 'vitest';
import { angleSnap, angleSnapWithin, MAGNETIC_SNAP } from '$lib/utils/canvasInteraction';
import type { Point } from '$lib/models/types';

const origin = { x: 0, y: 0 };
const lengths = [100, 500, 5000];

/** Largest move of the snapped point while the pointer drags sideways in 2 cm steps. */
function maxJump(snapFn: (end: Point) => Point, len: number): number {
  let previous = snapFn({ x: len, y: 0 }), jump = 0;
  for (let y = 2; y <= 100; y += 2) {
    const next = snapFn({ x: len, y });
    jump = Math.max(jump, Math.hypot(next.x - previous.x, next.y - previous.y));
    previous = next;
  }
  return jump;
}

describe('angleSnapWithin', () => {
  it.each(lengths)('%i cm wall: lateral pointer beyond the tolerance stays, within it lands on the axis', (len) => {
    expect(angleSnapWithin(origin, { x: len, y: 30 }, 15)).toEqual({ x: len, y: 30 });
    expect(angleSnapWithin(origin, { x: len, y: -30 }, 15)).toEqual({ x: len, y: -30 });
    expect(angleSnapWithin(origin, { x: len, y: 5 }, 15)).toEqual({ x: len, y: 0 });
    expect(angleSnapWithin(origin, { x: len, y: -15 }, 15)).toEqual({ x: len, y: 0 });
    expect(angleSnapWithin(origin, { x: len, y: 15.5 }, 15)).toEqual({ x: len, y: 15.5 });
  });

  it.each(lengths)('%i cm wall: a sideways drag never jumps further than the tolerance', (len) => {
    expect(maxJump(end => angleSnapWithin(origin, end, 15), len)).toBeLessThanOrEqual(15 + 2);
  });

  it('documents the defect: the angular threshold scaled the jump with the wall length', () => {
    expect(maxJump(end => angleSnap(origin, end, true), 500)).toBeGreaterThan(80);
    // and a 50 m wall stayed pinned to its axis even 1 m away from it, before releasing in one step
    expect(angleSnap(origin, { x: 5000, y: 100 }, true)).toEqual({ x: Math.hypot(5000, 100), y: 0 });
    expect(angleSnapWithin(origin, { x: 5000, y: 100 }, 15)).toEqual({ x: 5000, y: 100 });
  });

  it('snaps near 45 degrees onto the diagonal keeping the projected length, not the hypotenuse', () => {
    const snapped = angleSnapWithin(origin, { x: 300, y: 320 }, 15);
    expect(snapped.x).toBeCloseTo(310, 9);
    expect(snapped.y).toBeCloseTo(310, 9);
    expect(Math.hypot(snapped.x, snapped.y)).toBeCloseTo((300 + 320) * Math.SQRT1_2, 9);
    expect(Math.hypot(snapped.x, snapped.y)).toBeLessThan(Math.hypot(300, 320));
    // 30 cm off the diagonal is ~21 cm perpendicular, beyond the tolerance
    expect(angleSnapWithin(origin, { x: 300, y: 330 }, 15)).toEqual({ x: 300, y: 330 });
  });

  it('works on every 45 degree ray around a fixed endpoint away from the origin', () => {
    const start = { x: 100, y: 100 };
    expect(angleSnapWithin(start, { x: -400, y: 105 }, 15)).toEqual({ x: -400, y: 100 });
    expect(angleSnapWithin(start, { x: 95, y: -400 }, 15)).toEqual({ x: 100, y: -400 });
    expect(angleSnapWithin(start, { x: 105, y: 600 }, 15)).toEqual({ x: 100, y: 600 });
    const diagonal = angleSnapWithin(start, { x: -200, y: -220 }, 15);
    expect(diagonal.x).toBeCloseTo(-210, 9);
    expect(diagonal.y).toBeCloseTo(-210, 9);
  });

  it('leaves a pointer that is exactly on the axis untouched', () => {
    const horizontal = { x: 500, y: 0 };
    expect(angleSnapWithin(origin, horizontal, 15)).toBe(horizontal);
    const vertical = { x: 0.1, y: 300.3 };
    expect(angleSnapWithin({ x: 0.1, y: 0.1 }, vertical, 15)).toBe(vertical);
  });

  it('ignores pointers closer than 5 cm to the fixed endpoint', () => {
    const tiny = { x: 3, y: 1 };
    expect(angleSnapWithin(origin, tiny, 15)).toBe(tiny);
    expect(angleSnapWithin(origin, { x: 6, y: 1 }, 15)).toEqual({ x: 6, y: 0 });
  });

  it('tolerance follows the magnet: MAGNETIC_SNAP screen pixels whatever the zoom', () => {
    expect(MAGNETIC_SNAP / 2).toBe(7.5);
    expect(MAGNETIC_SNAP / 0.5).toBe(30);
    // zoomed in 2x: 10 cm is 20 px away, kept; 7 cm is 14 px, snapped
    expect(angleSnapWithin(origin, { x: 500, y: 10 }, MAGNETIC_SNAP / 2)).toEqual({ x: 500, y: 10 });
    expect(angleSnapWithin(origin, { x: 500, y: 7 }, MAGNETIC_SNAP / 2)).toEqual({ x: 500, y: 0 });
    // zoomed out 0.5x: 25 cm is 12.5 px, snapped; 31 cm is 15.5 px, kept
    expect(angleSnapWithin(origin, { x: 500, y: 25 }, MAGNETIC_SNAP / 0.5)).toEqual({ x: 500, y: 0 });
    expect(angleSnapWithin(origin, { x: 500, y: 31 }, MAGNETIC_SNAP / 0.5)).toEqual({ x: 500, y: 31 });
  });

  it('Infinity forces the nearest ray regardless of distance (Shift during an endpoint drag)', () => {
    expect(angleSnapWithin(origin, { x: 500, y: 200 }, Infinity)).toEqual({ x: 500, y: 0 });
    const diagonal = angleSnapWithin(origin, { x: 500, y: 300 }, Infinity);
    expect(diagonal.x).toBeCloseTo(400, 9);
    expect(diagonal.y).toBeCloseTo(400, 9);
  });
});
