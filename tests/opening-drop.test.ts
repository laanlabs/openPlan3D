import { expect, it } from 'vitest';
import type { Wall } from '$lib/models/types';
import { openingDropTarget } from '$lib/utils/openingDrop';

const wall: Wall = { id: 'curve', start: { x: -300, y: 0 }, end: { x: 300, y: 0 }, curvePoint: { x: 0, y: 600 }, thickness: 20, height: 250, color: '#fff' };
it.each([.05, .137, .237, .5, .683, .95])('projects onto the quadratic at parameter %s without a sampling grid', t => {
  const point = { x: -300 + 600 * t, y: 1200 * t * (1 - t) };
  expect(openingDropTarget(point, [wall])?.position).toBeCloseTo(t, 10);
});
it('chooses the curve over an endpoint chord and rejects distant drops', () => {
  const straight = { ...wall, id: 'straight', curvePoint: undefined };
  const target = openingDropTarget({ x: 0, y: 300 }, [straight, wall]);
  expect(target?.wallId).toBe('curve');
  expect(target?.position).toBeCloseTo(.5, 10);
  expect(openingDropTarget({ x: 0, y: 450 }, [wall])).toBeNull();
});
it('retains straight-wall projection, endpoint margins and strict drop radius', () => {
  const straight = { ...wall, curvePoint: undefined };
  expect(openingDropTarget({ x: 0, y: 20 }, [straight])).toEqual({ wallId: wall.id, position: .5 });
  expect(openingDropTarget({ x: -300, y: 0 }, [straight])?.position).toBe(.05);
  expect(openingDropTarget({ x: 300, y: 0 }, [straight])?.position).toBe(.95);
  expect(openingDropTarget({ x: 0, y: 100 }, [straight])).toBeNull();
});
it('handles degenerate curves and competing distance minima', () => {
  expect(openingDropTarget({ x: 0, y: 0 }, [{ ...wall, start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, curvePoint: undefined }])).toBeNull();
  const loop = { ...wall, start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, curvePoint: { x: 0, y: 600 } };
  const target = openingDropTarget({ x: 0, y: 200 }, [loop])!;
  expect(1200 * target.position * (1 - target.position)).toBeCloseTo(200, 8);
});
