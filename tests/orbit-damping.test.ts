import { expect, it } from 'vitest';
import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { updateOrbitDamping } from '../src/lib/utils/orbitDamping';

function orbit() {
  const camera = new PerspectiveCamera();
  camera.position.set(8000, 6000, 8000);
  const controls = new OrbitControls(camera);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  // Seed the same gesture delta that OrbitControls' pointer handler produces.
  (controls as any)._rotateLeft(1);
  return { camera, controls };
}

it('retains the same orbit position after one second at low and high frame rates', () => {
  const reference = orbit();
  for (let i = 0; i < 60; i++) reference.controls.update();
  for (const fps of [4, 15, 30, 60, 120]) {
    const { camera, controls } = orbit();
    for (let i = 0; i < fps; i++) updateOrbitDamping(controls, 1 / fps);
    expect(camera.position.distanceTo(reference.camera.position)).toBeLessThan(1e-7);
    expect(controls.dampingFactor).toBe(0.08);
  }
});

it('settles a large-scene orbit within five seconds even at four frames per second', () => {
  for (const fps of [4, 15, 60, 120]) {
    const { controls } = orbit();
    let frames = 0;
    while (frames < fps * 5 && updateOrbitDamping(controls, 1 / fps)) frames++;
    expect(frames / fps).toBeLessThan(5);
  }
});
