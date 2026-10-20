import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { pointerAxisValue, pointerAngleDeg } from '$lib/utils/threeGizmo';

function topDownCamera() {
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 20000);
  camera.position.set(0, 1000, 0);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  return camera;
}

function ndcFor(point: THREE.Vector3, camera: THREE.Camera) {
  const ndc = point.clone().project(camera);
  return new THREE.Vector2(ndc.x, ndc.y);
}

describe('gizmo pointer math', () => {
  it('reads a scalar world coordinate along a translate axis', () => {
    const camera = topDownCamera();
    const raycaster = new THREE.Raycaster();
    const axis = new THREE.Vector3(1, 0, 0);
    const origin = new THREE.Vector3(0, 0, 0);
    const value = pointerAxisValue(axis, origin, ndcFor(new THREE.Vector3(100, 0, 0), camera), camera, raycaster);
    expect(value).toBeCloseTo(100, 6);
    const zero = pointerAxisValue(axis, origin, ndcFor(origin, camera), camera, raycaster);
    expect(zero).toBeCloseTo(0, 6);
  });

  it('reads a scalar coordinate for the elevation axis', () => {
    // A camera looking horizontally makes the vertical axis draggable.
    const camera = new THREE.PerspectiveCamera(50, 1, 1, 20000);
    camera.position.set(0, 0, 1000);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster();
    const axis = new THREE.Vector3(0, 1, 0);
    const origin = new THREE.Vector3(0, 0, 0);
    const value = pointerAxisValue(axis, origin, ndcFor(new THREE.Vector3(0, 120, 0), camera), camera, raycaster);
    expect(value).toBeCloseTo(120, 6);
  });

  it('maps a floor-plane pointer to the same angle convention as 2D', () => {
    const camera = topDownCamera();
    const raycaster = new THREE.Raycaster();
    const origin = new THREE.Vector3(0, 0, 0);
    const angle = (x: number, z: number) =>
      pointerAngleDeg(origin, ndcFor(new THREE.Vector3(x, 0, z), camera), camera, raycaster)!;
    expect(angle(0, -100)).toBeCloseTo(0, 6);
    expect(angle(100, 0)).toBeCloseTo(90, 6);
    expect(angle(0, 100)).toBeCloseTo(180, 6);
    expect(angle(100, 100)).toBeCloseTo(135, 6);
  });
});
