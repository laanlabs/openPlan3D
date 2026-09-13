import { expect, it } from 'vitest';
import { DoubleSide, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import type { Door, Wall, Window } from '$lib/models/types';
import { buildWallSegments, pathOpening, wallPathProfile, wallPathSpans, wallProfileSpans } from '$lib/utils/wallProfiles';
import { createSlopedBoxGeometry } from '$lib/utils/slopedWallGeometry';

const wall: Wall = { id: 'curve', start: { x: 0, y: 0 }, end: { x: 800, y: 0 },
  curvePoint: { x: 100, y: 600 }, height: 300, thickness: 20, color: '#fff' };
const door: Door = { id: 'door', wallId: 'curve', position: 0.5, width: 100, height: 210, type: 'opening', swingDirection: 'left', flipSide: false };
const window: Window = { id: 'window', wallId: 'curve', position: 0.5, width: 150, sillHeight: 100, height: 150, type: 'fixed' };
const area = (pieces: ReturnType<typeof wallProfileSpans>) => pieces.reduce((sum, span) => sum + span.segments.reduce((sum, p) => sum + p.width * ((p.topYLeft + p.topYRight) / 2 - p.bottomY), 0), 0);

it('converts the saved quadratic parameter before measuring opening widths', () => {
  const path = wallPathProfile(wall), at = path.sample(path.distanceAt(0.25));
  expect(at.point.x).toBeCloseTo(87.5); expect(at.point.y).toBeCloseTo(225);
  expect(Math.abs(path.distanceAt(0.25) - path.length * 0.25)).toBeGreaterThan(5);
  const straight = { ...wall, curvePoint: undefined, startHeight: 200, endHeight: 400 };
  expect(wallProfileSpans(straight, [door], [window])[0].segments).toEqual(buildWallSegments(800, 200, 400, [door], [window]));
  expect(pathOpening(path, path.distanceAt(NaN), 100, 0, 200)).toBeNull();
});

it('subtracts the union across facet joins and clips end openings without mutating dimensions', () => {
  const before = JSON.stringify({ wall, door, window }), path = wallPathProfile(wall);
  expect(area(wallProfileSpans(wall, [door], [window]))).toBeCloseTo(path.length * 300 - 32500); // 21,000 + 22,500 - 11,000 overlap
  expect(area(wallProfileSpans(wall, [{ ...door, position: 0, height: 200 }], []))).toBeCloseTo(path.length * 300 - 10000);
  expect(JSON.stringify({ wall, door, window })).toBe(before);
});

it('keeps one level aperture head beneath a sloped curve and preserves the cut on reversal', () => {
  const sloped = { ...wall, startHeight: 150, endHeight: 450 };
  const path = wallPathProfile(sloped), opening = pathOpening(path, path.distanceAt(0.5), 300, 50, 350)!;
  expect(opening.top).toBeLessThan(300);
  const cuts = wallProfileSpans(sloped, [], [{ ...window, width: 300, sillHeight: 50, height: 350 }]);
  const headers = cuts.flatMap(span => span.segments).filter(segment => segment.bottomY > 50);
  expect(headers.length).toBeGreaterThan(2);
  for (const segment of headers) expect(segment.bottomY).toBeCloseTo(opening.top);
  const reversed = { ...sloped, start: sloped.end, end: sloped.start, startHeight: 450, endHeight: 150 };
  expect(area(wallProfileSpans(reversed, [], [{ ...window, width: 300, sillHeight: 50, height: 350 }]))).toBeCloseTo(area(cuts));
});

it('opens actual triangle meshes where the former solid curve blocked windows and doors', () => {
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const make = (cut: boolean, height = 300) => {
    const source = { ...wall, height }, group = new Group();
    const spans = cut ? wallProfileSpans(source, [door], [window]) : wallPathSpans(source).map(span => ({ ...span,
      segments: buildWallSegments(Math.hypot(span.end.x - span.start.x, span.end.y - span.start.y), height, height, [], []) }));
    for (const span of spans) {
      const angle = Math.atan2(span.end.y - span.start.y, span.end.x - span.start.x);
      for (const segment of span.segments) {
        const mesh = new Mesh(createSlopedBoxGeometry(segment.width, 20, segment.bottomY, segment.topYLeft, segment.topYRight), material);
        mesh.position.set(span.start.x + segment.offsetX * Math.cos(angle), 0, span.start.y + segment.offsetX * Math.sin(angle));
        mesh.rotation.y = -angle; group.add(mesh);
      }
    }
    group.updateMatrixWorld(true); return group;
  };
  const path = wallPathProfile(wall), distance = path.distanceAt(0.5), center = path.sample(distance).point;
  const a = path.sample(distance - 1).point, b = path.sample(distance + 1).point;
  const outward = new Vector3(-(b.y - a.y), 0, b.x - a.x).normalize();
  const solids = [make(false), make(true), make(true, 8)];
  for (const y of [4, 150, 230]) {
    const ray = new Raycaster(new Vector3(center.x, y, center.y).addScaledVector(outward, 100), outward.clone().negate(), 0, 200);
    expect(ray.intersectObject(solids[0], true).length).toBeGreaterThan(0);
    expect(ray.intersectObject(solids[1], true)).toHaveLength(0);
    expect(ray.intersectObject(solids[2], true)).toHaveLength(0);
  }
  for (const root of solids) root.traverse(node => { if (node instanceof Mesh) node.geometry.dispose(); });
  material.dispose();
});

it('does not leave blocking slivers at a full-facet window edge', () => {
  const curve = { ...wall, start: { x: -300, y: 0 }, end: { x: 300, y: 0 },
    curvePoint: { x: 0, y: 300 }, startHeight: 240, endHeight: 320 };
  const spans = wallProfileSpans(curve, [], [{ ...window, position: .75, width: 100, sillHeight: 90, height: 100 }]);
  for (const span of spans) for (const segment of span.segments) expect(segment.width).toBeGreaterThan(1e-9);
  const joined = spans[11];
  expect(joined.segments.every(segment => segment.topYLeft <= 90 || segment.bottomY >= 190)).toBe(true);
});
