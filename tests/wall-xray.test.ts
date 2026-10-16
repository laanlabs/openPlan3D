import { expect, it } from 'vitest';
import * as THREE from 'three';
import { applyWallXray, XRAY_OPACITY } from '$lib/utils/wallXray';

const state = (m: THREE.Material) => ({ transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite });
const flagged = <T extends THREE.Object3D>(object: T) => { object.userData.xray = true; return object; };

/** Shaped like buildWalls: a 6-slot wall body, shared trim and glass, and unflagged contents. */
function viewerScene() {
  const interior = new THREE.MeshStandardMaterial(), exterior = new THREE.MeshStandardMaterial();
  const wall = flagged(new THREE.Mesh(new THREE.BoxGeometry(), [exterior, exterior, interior, interior, interior, exterior]));
  const baseboard = new THREE.MeshStandardMaterial();
  const boards = [0, 1].map(() => flagged(new THREE.Mesh(new THREE.BoxGeometry(), baseboard)));
  const glass = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.3 });
  const panes = [0, 1, 2, 3].map(() => flagged(new THREE.Mesh(new THREE.BoxGeometry(), glass)));
  const faint = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.05 });
  // Furniture (two parts sharing a material), a translucent room floor and a label sprite.
  const contents = [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.5 }), new THREE.SpriteMaterial()];
  const furniture = new THREE.Group();
  furniture.add(new THREE.Mesh(new THREE.BoxGeometry(), contents[0]), new THREE.Mesh(new THREE.BoxGeometry(), contents[0]));
  const root = new THREE.Group();
  root.add(wall, ...boards, ...panes, flagged(new THREE.Mesh(new THREE.BoxGeometry(), faint)), furniture,
    new THREE.Mesh(new THREE.BoxGeometry(), contents[1]), flagged(new THREE.Sprite(contents[2] as THREE.SpriteMaterial)));
  return { root, faded: [interior, exterior, baseboard, glass], faint, contents };
}

it('fades every material of flagged meshes once and restores each exactly, cycle after cycle', () => {
  const { root, faded, faint, contents } = viewerScene();
  const all = [...faded, faint, ...contents];
  const before = new Map(all.map(m => [m, state(m)]));
  for (let cycle = 0; cycle < 3; cycle++) {
    const versions = new Map(all.map(m => [m, m.version]));
    const restore = applyWallXray(root);
    for (const m of faded) {
      expect(state(m)).toEqual({ transparent: true, opacity: XRAY_OPACITY, depthWrite: false });
      expect(m.version).toBe(versions.get(m)! + 1); // shared and repeated materials change once
    }
    expect(state(faint)).toEqual({ transparent: true, opacity: 0.05, depthWrite: false }); // never made more opaque
    for (const m of contents) {
      expect(state(m)).toEqual(before.get(m));
      expect(m.version).toBe(versions.get(m));
    }
    restore();
    // Including the 0.3 glass and the shared baseboard, which the mesh-keyed
    // backup used to leave at x-ray opacity.
    for (const m of all) expect(state(m)).toEqual(before.get(m));
  }
});

it('restores only once, so later material changes survive a stale restore', () => {
  const { root, faded } = viewerScene();
  const restore = applyWallXray(root);
  restore();
  faded[0].opacity = 0.15; // e.g. "Make Walls Transparent" after the preview render
  restore();
  expect(faded[0].opacity).toBe(0.15);
  const again = applyWallXray(root);
  expect(faded[0].opacity).toBe(XRAY_OPACITY);
  again();
  expect(faded[0].opacity).toBe(0.15);
});
