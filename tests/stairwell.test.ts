import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { Floor, Stair } from '$lib/models/types';
import { groundWithOpenings, stairwellView } from '$lib/utils/stairwell';
import { sceneSignature } from '$lib/utils/sceneSignature';

function ring(prefix: string, x0: number, y0: number, x1: number, y1: number) {
  const points = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  return points.map(([x, y], i) => ({ id: `${prefix}-${i}`, start: { x, y },
    end: { x: points[(i + 1) % 4][0], y: points[(i + 1) % 4][1] }, thickness: 20, height: 280, color: '#94a3b8' }));
}
const stair = (id: string, x: number, direction: Stair['direction'] = 'up'): Stair =>
  ({ id, position: { x, y: 210 }, rotation: 0, width: 100, depth: 300, riserCount: 14, direction, stairType: 'straight' });
const floor = (id: string, level: number, elevation: number): Floor => ({ id, name: id, level, elevation,
  walls: [], rooms: [], doors: [], windows: [], furniture: [], stairs: [], columns: [] } as unknown as Floor);

function plan(opening = true) {
  const ground = floor('ground', 0, 0), first = floor('first', 1, 320);
  ground.walls = ring('g', 0, 0, 1200, 400) as Floor['walls'];
  ground.stairs = [stair('in-well', 170), stair('elsewhere', 900), stair('down-to-basement', 200, 'down')];
  first.walls = [...ring('f', 0, 0, 1200, 400), ...ring('well', 110, 50, 230, 370)] as Floor['walls'];
  first.rooms = [{ id: 'well', name: 'Stairwell', walls: first.walls.slice(4).map(w => w.id), area: 3.8, floorOpening: opening }] as Floor['rooms'];
  return { id: 'p', name: 'p', floors: [ground, first], activeFloorId: 'first', createdAt: new Date(), updatedAt: new Date() } as any;
}

describe('stairwell view', () => {
  it('shows the Up stairs below an opening, down to the floor below', () => {
    const view = stairwellView(plan().floors, 'first')!;
    expect(view.depth).toBe(320);
    expect(view.below.id).toBe('ground');
    expect(view.stairs.map(s => s.id)).toEqual(['in-well']);
    expect(view.openings).toHaveLength(1);
  });

  it('is empty without an opening or a floor below', () => {
    expect(stairwellView(plan(false).floors, 'first')).toBeNull();
    expect(stairwellView(plan().floors, 'ground')).toBeNull();
  });

  it('rebuilds the active floor alone when the stairs below change', () => {
    const before = plan(), after = plan();
    after.floors[0].stairs[0] = { ...after.floors[0].stairs[0], riserCount: 15 };
    const sign = (p: any) => sceneSignature(p, p.floors[1], false, 'metric');
    expect(sign(after)).not.toBe(sign(before));
    // Without an opening the floor below stays out of the active floor's signature.
    const closed = plan(false), closedAfter = plan(false);
    closedAfter.floors[0].stairs[0] = { ...closedAfter.floors[0].stairs[0], riserCount: 15 };
    expect(sign(closedAfter)).toBe(sign(closed));
  });
});

describe('ground with openings', () => {
  const hits = (geometry: THREE.BufferGeometry, x: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    mesh.rotation.x = -Math.PI / 2;
    mesh.updateMatrixWorld();
    return new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh).length > 0;
  };

  it('cuts each opening out of the ground and keeps the rest', () => {
    const ground = groundWithOpenings(40000, [[{ x: 110, y: 50 }, { x: 230, y: 50 }, { x: 230, y: 370 }, { x: 110, y: 370 }]]);
    expect(hits(ground, 170, 210)).toBe(false);
    expect(hits(ground, 170, 30)).toBe(true);
    expect(hits(ground, -5000, 9000)).toBe(true);
  });

  it('keeps the plain ground UVs so the texture grid does not move', () => {
    const ground = groundWithOpenings(40000, []), plane = new THREE.PlaneGeometry(40000, 40000);
    const uvAt = (g: THREE.BufferGeometry, x: number, y: number) => {
      const p = g.getAttribute('position'), uv = g.getAttribute('uv');
      for (let i = 0; i < p.count; i++) if (p.getX(i) === x && p.getY(i) === y) return [uv.getX(i), uv.getY(i)];
    };
    for (const [x, y] of [[-20000, -20000], [20000, 20000], [-20000, 20000]]) expect(uvAt(ground, x, y)).toEqual(uvAt(plane, x, y));
  });
});
