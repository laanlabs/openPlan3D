import { describe, expect, it } from 'vitest';
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, Mesh, SkinnedMesh, Vector3 } from 'three';
import { portableRenderScene, portableRenderSceneJSON } from '$lib/utils/portableRenderScene';
import { createSlopedBoxGeometry } from '$lib/utils/slopedWallGeometry';
import { buildWallSegments } from '$lib/utils/wallProfiles';

describe('portable Blender scene', () => {
  it('freezes nested centimetre transforms in metres without modifying geometry', () => {
    const root = new Group(); root.position.set(100, 300, -200);
    const mesh = new Mesh(new BoxGeometry(200, 100, 50)); mesh.rotation.y = Math.PI / 2;
    mesh.userData.wallId = 'private-id'; mesh.userData.sourceURL = 'private-url'; root.add(mesh);
    const before = Array.from(mesh.geometry.attributes.position.array);
    const data = portableRenderScene(root, 'stacked-floors');
    expect(data.coordinates).toBe('arkit-metres-y-up'); expect(data.scope).toBe('stacked-floors');
    const wall = data.meshes[0]; expect(wall.material).toBe('wall');
    expect(Math.min(...wall.vertices.map(v => v[0]))).toBeCloseTo(0.75);
    expect(Math.max(...wall.vertices.map(v => v[1]))).toBeCloseTo(3.5);
    expect(Math.min(...wall.vertices.map(v => v[2]))).toBeCloseTo(-3);
    expect(JSON.stringify(data)).not.toMatch(/private-id|private-url|sourceURL/);
    expect(Array.from(mesh.geometry.attributes.position.array)).toEqual(before);
    expect(portableRenderSceneJSON(root)).toBe(portableRenderSceneJSON(root));
  });
  it('keeps mirrored triangle winding outward and fits the support slab', () => {
    const root = new Group(), mesh = new Mesh(new BoxGeometry(200, 100, 50));
    mesh.scale.x = -2; root.add(mesh);
    const result = portableRenderScene(root), box = result.meshes[0], slab = result.meshes[1];
    for (const face of box.faces) {
      const [a, b, c] = face.map(i => new Vector3().fromArray(box.vertices[i]));
      expect(b.clone().sub(a).cross(c.clone().sub(a)).dot(a)).toBeGreaterThan(0);
    }
    for (const axis of [0, 2]) {
      expect(Math.min(...slab.vertices.map(v => v[axis]))).toBeCloseTo(Math.min(...box.vertices.map(v => v[axis])) - 0.2);
      expect(Math.max(...slab.vertices.map(v => v[axis]))).toBeCloseTo(Math.max(...box.vertices.map(v => v[axis])) + 0.2);
    }
  });
  it('honors hidden ancestors and excluded helper/glass subtrees', () => {
    const root = new Group(), hidden = new Group(), excluded = new Group();
    hidden.visible = false; excluded.userData.renderExclude = true;
    for (const parent of [root, hidden, excluded]) parent.add(new Mesh(new BoxGeometry()));
    root.add(hidden, excluded);
    expect(portableRenderScene(root).meshes).toHaveLength(2);
  });
  it('exports nonindexed draw ranges and excludes unused vertices', () => {
    const root = new Group(), geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute([NaN, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 100, 0], 3));
    geo.setDrawRange(3, 3); root.add(new Mesh(geo));
    expect(portableRenderScene(root).meshes[0].vertices).toEqual([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);
  });
  it('preserves the shared sloped wall opening geometry', () => {
    const root = new Group();
    const segments = buildWallSegments(400, 250, 350, [], [{ id: 'window', wallId: 'wall', position: 0.5, width: 100, height: 100, sillHeight: 100, type: 'fixed' }]);
    for (const segment of segments) {
      const mesh = new Mesh(createSlopedBoxGeometry(segment.width, 20, segment.bottomY, segment.topYLeft, segment.topYRight));
      mesh.position.x = segment.offsetX; mesh.userData.wallId = 'wall'; root.add(mesh);
    }
    const walls = portableRenderScene(root).meshes.filter(m => m.material === 'wall');
    expect(walls).toHaveLength(4);
    expect(Math.max(...walls.flatMap(m => m.vertices.map(v => v[1])))).toBeCloseTo(3.5);
    for (const wall of walls) {
      const xs = wall.vertices.map(v => v[0]), ys = wall.vertices.map(v => v[1]);
      expect(Math.min(...xs) < 2 && Math.max(...xs) > 2 && Math.min(...ys) < 1.5 && Math.max(...ys) > 1.5).toBe(false);
    }
  });
  it('rejects invalid, empty, animated and oversized inputs', () => {
    expect(() => portableRenderScene(new Group())).toThrow(/no displayed/);
    const root = new Group(), mesh = new Mesh(new BoxGeometry()); root.add(mesh);
    mesh.position.x = NaN; expect(() => portableRenderScene(root)).toThrow(/transform/);
    mesh.position.x = 1000001; expect(() => portableRenderScene(root)).toThrow(/coordinates/);
    root.clear(); root.add(new SkinnedMesh(new BoxGeometry())); expect(() => portableRenderScene(root)).toThrow(/animated/);
    root.clear(); const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(300003 * 3), 3));
    root.add(new Mesh(geo)); expect(() => portableRenderScene(root)).toThrow(/vertex budget/);
  });
});
