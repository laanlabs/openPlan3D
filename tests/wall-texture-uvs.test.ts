import { expect, it } from 'vitest';
import * as THREE from 'three';
import { buildWallSegments, wallProfileSpans } from '$lib/utils/wallProfiles';
import { createSlopedBoxGeometry, mapWallUVs, WALL_TEXTURE_TILE_CM } from '$lib/utils/slopedWallGeometry';
import type { Door, Wall, Window } from '$lib/models/types';

const door: Door = { id: 'd', wallId: 'a', position: 0.5, width: 90, height: 210, type: 'single', swingDirection: 'left', flipSide: false };
const window: Window = { id: 'w', wallId: 'a', position: 0.15, width: 60, sillHeight: 90, height: 120, type: 'standard' };
const FRONT = 4, BACK = 5; // interior (+Z) and exterior (-Z) face groups, 4 vertices each

/** [along-wall x, y, u, v] for the vertices of one face group. */
function face(geometry: THREE.BufferGeometry, group: number, along: number) {
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  return [0, 1, 2, 3].map(k => {
    const i = group * 4 + k;
    return [along + position.getX(i), position.getY(i), uv.getX(i), uv.getY(i)];
  });
}

it('tiles every piece around a door and a window at 200 cm and continues the pattern across them', () => {
  const pieces = buildWallSegments(500, 280, 280, [door], [window]);
  expect(pieces.length).toBeGreaterThan(4);
  const edges = new Map<number, number[]>(); // along-wall x -> interior u at y = 0 or at a cut
  for (const piece of pieces) {
    const geometry = mapWallUVs(createSlopedBoxGeometry(piece.width, 20, piece.bottomY, piece.topYLeft, piece.topYRight), piece.offsetX);
    for (const [x, y, u, v] of face(geometry, FRONT, piece.offsetX)) {
      // Wall units: the same 200 cm tile on every piece, whatever its width or height.
      expect(u * WALL_TEXTURE_TILE_CM).toBeCloseTo(x, 3);
      expect(v * WALL_TEXTURE_TILE_CM).toBeCloseTo(y, 3);
      edges.set(Math.round(x), [...edges.get(Math.round(x)) ?? [], u]);
    }
    for (const [x, y, u, v] of face(geometry, BACK, piece.offsetX)) {
      expect(u * WALL_TEXTURE_TILE_CM).toBeCloseTo(-x, 3); // read from outside, not mirrored
      expect(v * WALL_TEXTURE_TILE_CM).toBeCloseTo(y, 3);
    }
    geometry.dispose();
  }
  // The pier beside the door and the header above it meet at the door jamb with one u.
  const jamb = Math.round(250 - 45);
  expect(new Set(edges.get(jamb)!.map(u => u.toFixed(6))).size).toBe(1);
});

it.each([[280, 280], [240, 320], [300, 100]])('keeps the BoxGeometry texture orientation on all six faces of an 80 cm piece rising %s to %s cm', (left, right) => {
  const plain = createSlopedBoxGeometry(80, 20, 0, left, right), defaults = plain.getAttribute('uv').clone();
  const mapped = mapWallUVs(createSlopedBoxGeometry(80, 20, 0, left, right), 1000).getAttribute('uv');
  for (let group = 0; group < 6; group++) for (let a = group * 4; a < group * 4 + 4; a++) for (let b = a + 1; b < group * 4 + 4; b++) {
    for (const axis of ['getX', 'getY'] as const) {
      const before = defaults[axis](b) - defaults[axis](a), after = mapped[axis](b) - mapped[axis](a);
      if (Math.abs(before) > 1e-9) expect(Math.sign(after)).toBe(Math.sign(before));
    }
  }
  plain.dispose();
});

it('runs the pattern along a curved wall by arc length, facet after facet', () => {
  const wall: Wall = { id: 'a', start: { x: 0, y: 0 }, end: { x: 400, y: 0 }, curvePoint: { x: 200, y: 200 }, height: 280, thickness: 20, color: '#cccccc' };
  const spans = wallProfileSpans(wall, [], []);
  expect(spans).toHaveLength(16);
  let previousEnd: number | null = null;
  for (const span of spans) for (const segment of span.segments) {
    const geometry = mapWallUVs(createSlopedBoxGeometry(segment.width, 20, segment.bottomY, segment.topYLeft, segment.topYRight), span.from + segment.offsetX);
    const us = face(geometry, FRONT, 0).map(([, , u]) => u * WALL_TEXTURE_TILE_CM);
    expect(Math.max(...us) - Math.min(...us)).toBeCloseTo(segment.width, 3); // not one whole tile per ~28 cm facet
    if (previousEnd !== null) expect(Math.min(...us)).toBeCloseTo(previousEnd, 3);
    previousEnd = Math.max(...us);
    geometry.dispose();
  }
  expect(previousEnd).toBeCloseTo(spans.at(-1)!.to, 3);
});
