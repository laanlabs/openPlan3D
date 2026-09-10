import { expect, it } from 'vitest';
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { createRoomSlabGeometry } from '$lib/utils/roomSlabGeometry';

const outline = [{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 200 },
  { x: 200, y: 200 }, { x: 200, y: 600 }, { x: 0, y: 600 }];

it('extrudes a closed concave slab down from zero, leaving its recess empty', () => {
  for (const polygon of [outline, [...outline].reverse()]) {
    const before = JSON.stringify(polygon), geometry = createRoomSlabGeometry(polygon)!;
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.min.y).toBeCloseTo(-5);
    expect(geometry.boundingBox!.max.y).toBeCloseTo(0);
    const material = new MeshBasicMaterial({ side: DoubleSide }), mesh = new Mesh(geometry, material);
    const probe = (x: number, z: number) => new Raycaster(new Vector3(x, 10, z), new Vector3(0, -1, 0), 0, 20).intersectObject(mesh);
    expect(probe(100, 400).length).toBeGreaterThan(0);
    expect(probe(400, 100).length).toBeGreaterThan(0);
    expect(probe(400, 400)).toHaveLength(0);
    // Signed tetrahedron volume also checks outward face winding.
    const positions = geometry.getAttribute('position');
    let volume = 0;
    const edges = new Map<string, number>();
    for (let i = 0; i < positions.count; i += 3) {
      const v = [0, 1, 2].map(j => new Vector3().fromBufferAttribute(positions, i + j));
      volume += v[0].dot(v[1].clone().cross(v[2])) / 6;
      const keys = v.map(p => p.toArray().map(n => n.toFixed(6)).join(','));
      for (let j = 0; j < 3; j++) {
        const key = [keys[j], keys[(j + 1) % 3]].sort().join('|');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect(volume).toBeCloseTo(200000 * 5);
    for (const count of edges.values()) expect(count).toBe(2);
    expect(JSON.stringify(polygon)).toBe(before);
    geometry.dispose(); material.dispose();
  }
});

it('rejects empty, degenerate and nonfinite outlines and invalid thickness', () => {
  for (const polygon of [[], outline.slice(0, 2), [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], [...outline, { x: NaN, y: 0 }]]) {
    expect(createRoomSlabGeometry(polygon)).toBeNull();
  }
  for (const depth of [0, -5, NaN, Infinity]) expect(createRoomSlabGeometry(outline, depth)).toBeNull();
});


it('preserves custom slab depth on import and extrudes below an unchanged surface', async () => {
  const { readProject } = await import('$lib/utils/projectValidation');
  const { roomProject } = await import('./fixtures/project');
  const project = roomProject();
  project.floors[0].slabThickness = 32.5;
  const restored = readProject(JSON.parse(JSON.stringify(project)));
  const geometry = createRoomSlabGeometry(outline, restored.floors[0].slabThickness)!;
  geometry.computeBoundingBox();
  expect(geometry.boundingBox!.min.y).toBeCloseTo(-32.5);
  expect(geometry.boundingBox!.max.y).toBeCloseTo(0);
  geometry.dispose();
  for (const value of [0, -1, Infinity, NaN, '20', null]) {
    project.floors[0].slabThickness = value as number;
    expect(() => readProject(project)).toThrow(/slabThickness/);
  }
  delete project.floors[0].slabThickness;
  expect(readProject(project).floors[0]).not.toHaveProperty('slabThickness');
});
