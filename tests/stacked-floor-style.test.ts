import { expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { pickedWallId, stackedFloorMaterial, stackedFloorOccludes, STACKED_FLOOR_OPACITY } from '$lib/utils/floorStack';

// Issue #130: "Show All Floors Stacked" can draw the other floors like the active one.
it('takes solid stacked floors out of the transparent pass instead of only raising opacity', () => {
  expect(stackedFloorMaterial('solid')).toEqual({ transparent: false, opacity: 1, depthWrite: true });
  // Translucent floors stay out of the depth buffer, so overlapping storeys blend rather than hide each other (#122).
  expect(stackedFloorMaterial('translucent')).toEqual({ transparent: true, opacity: STACKED_FLOOR_OPACITY, depthWrite: false });
  const material = new MeshStandardMaterial({ color: 0xffffff, ...stackedFloorMaterial('solid') });
  expect([material.transparent, material.opacity, material.depthWrite]).toEqual([false, 1, true]);
  material.dispose();
});

const hit = (distance: number, userData: Record<string, unknown>) => ({ distance, object: { userData } });

it('lets clicks reach the active floor through translucent floors but not through solid ones', () => {
  const upperSlab = hit(200, { stackedFloor: true }), activeWall = hit(500, { wallId: 'w1' });
  const hits = [upperSlab, activeWall];
  expect(pickedWallId(hits, 'translucent')).toBe('w1');
  expect(pickedWallId(hits, 'solid')).toBeNull();
  // A solid floor behind the wall (a lower storey) never hides it.
  expect(pickedWallId([activeWall, hit(900, { stackedFloor: true })], 'solid')).toBe('w1');
  // Unflagged meshes (furniture, active-floor slabs) keep their current pass-through behaviour.
  expect(pickedWallId([hit(100, {}), activeWall], 'solid')).toBe('w1');
  expect(pickedWallId([upperSlab], 'translucent')).toBeNull();
  expect(stackedFloorOccludes(hits, 400, 'solid')).toBe(true);
  expect(stackedFloorOccludes(hits, 150, 'solid')).toBe(false);
  expect(stackedFloorOccludes(hits, 400, 'translucent')).toBe(false);
});

it('applies to real raycasts: a solid upper floor above the active wall blocks a top-down click', () => {
  const root = new Group();
  const wall = new Mesh(new BoxGeometry(400, 280, 20), new MeshStandardMaterial());
  wall.position.y = 140; wall.userData.wallId = 'active-wall';
  const slab = new Mesh(new BoxGeometry(600, 10, 600), new MeshStandardMaterial(stackedFloorMaterial('solid')));
  slab.position.y = 295; slab.userData.stackedFloor = true;
  root.add(wall, slab); root.updateMatrixWorld(true);
  const camera = new PerspectiveCamera(50, 1, 1, 20000);
  camera.position.set(0, 1500, 0.01); camera.lookAt(new Vector3()); camera.updateMatrixWorld(true);
  const raycaster = new Raycaster(); raycaster.setFromCamera(new Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(root.children, false);
  expect(pickedWallId(hits, 'translucent')).toBe('active-wall');
  expect(pickedWallId(hits, 'solid')).toBeNull();
  for (const mesh of [wall, slab]) { mesh.geometry.dispose(); (mesh.material as MeshStandardMaterial).dispose(); }
});
