import { describe, expect, it } from 'vitest';
import { Euler, PerspectiveCamera } from 'three';
import { WalkthroughMotion, type WalkthroughSettings } from '../src/lib/utils/walkthroughMotion';

const settings: WalkthroughSettings = { moveSpeed: 800, sprintSpeed: 1600, eyeHeight: 160, floorElevation: 425.5 };
function run(hz: number, keys: string[], coast = false) {
  const motion = new WalkthroughMotion(), camera = new PerspectiveCamera();
  keys.forEach(key => motion.setKey(key, true));
  motion.advance(0, camera, settings);
  for (let frame = 1; frame <= hz; frame++) motion.advance(frame * 1000 / hz, camera, settings);
  if (coast) {
    keys.forEach(key => motion.setKey(key, false));
    for (let frame = 1; frame <= hz; frame++) motion.advance(1000 + frame * 1000 / hz, camera, settings);
  }
  return camera;
}

describe('walkthrough cadence', () => {
  for (const [name, keys, coast] of [
    ['walking', ['ArrowUp'], false],
    ['diagonal sprint', ['ArrowUp', 'ArrowRight', 'ShiftLeft'], false],
    ['turning while walking', ['ArrowUp', 'KeyA'], false],
    ['released momentum', ['ArrowUp'], true],
  ] as const) {
    it.each([30, 120])(`${name} travels the same path at %s Hz as at 60 Hz`, hz => {
      const actual = run(hz, [...keys], coast), reference = run(60, [...keys], coast);
      expect(actual.position.distanceTo(reference.position)).toBeLessThan(1e-7);
      expect(1 - Math.abs(actual.quaternion.dot(reference.quaternion))).toBeLessThan(1e-10);
    });
  }

  it('keeps the established walking pace without multiplying the speed slider by ten', () => {
    // dv/dt = 800 - 10v, so from rest the first second covers about 72 cm.
    expect(-run(60, ['ArrowUp']).position.z).toBeCloseTo(72.0003632, 6);
  });

  it('handles uneven callback timing without accumulating simulation drift', () => {
    const motion = new WalkthroughMotion(), camera = new PerspectiveCamera();
    ['ArrowUp', 'KeyA'].forEach(key => motion.setKey(key, true));
    motion.advance(0, camera, settings);
    let time = 0, frame = 0;
    while (time < 1000) {
      time = Math.min(1000, time + [7, 19, 31, 12, 9][frame++ % 5]);
      motion.advance(time, camera, settings);
    }
    const reference = run(60, ['ArrowUp', 'KeyA']);
    expect(camera.position.distanceTo(reference.position)).toBeLessThan(0.001);
    expect(1 - Math.abs(camera.quaternion.dot(reference.quaternion))).toBeLessThan(1e-10);
  });

  it('does not move faster diagonally and keeps height relative to the active floor', () => {
    const straight = run(60, ['ArrowUp']), diagonal = run(60, ['ArrowUp', 'ArrowRight']);
    expect(Math.hypot(diagonal.position.x, diagonal.position.z)).toBeCloseTo(-straight.position.z, 8);
    expect(diagonal.position.y).toBe(585.5);
  });

  it('bounds catch-up after a long stall and does not integrate duplicate timestamps', () => {
    const motion = new WalkthroughMotion(), camera = new PerspectiveCamera();
    motion.setKey('ArrowUp', true);
    motion.advance(0, camera, settings);
    motion.advance(10_000, camera, settings);
    expect(-camera.position.z).toBeGreaterThan(0);
    expect(-camera.position.z).toBeLessThanOrEqual(20);
    const before = camera.position.clone();
    motion.advance(10_000, camera, settings);
    expect(camera.position.equals(before)).toBe(true);
  });

  it('reset discards held movement, turning, sprint and momentum across a pause', () => {
    const motion = new WalkthroughMotion(), camera = new PerspectiveCamera();
    ['ArrowUp', 'KeyA', 'ShiftLeft'].forEach(key => motion.setKey(key, true));
    motion.advance(0, camera, settings); motion.advance(100, camera, settings);
    const position = camera.position.clone(), rotation = camera.quaternion.clone();
    motion.reset();
    motion.advance(60_000, camera, settings); motion.advance(60_100, camera, settings);
    expect(camera.position.equals(position)).toBe(true);
    expect(1 - Math.abs(camera.quaternion.dot(rotation))).toBeLessThan(1e-12);
    motion.setKey('ArrowUp', true);
    motion.advance(60_200, camera, settings);
    expect(camera.position.distanceTo(position)).toBeLessThan(4); // walking, not stuck sprint
  });

  it('releasing one Shift key retains sprint while the other is held', () => {
    const motion = new WalkthroughMotion(), camera = new PerspectiveCamera();
    ['ArrowUp', 'ShiftLeft', 'ShiftRight'].forEach(key => motion.setKey(key, true));
    motion.setKey('ShiftLeft', false);
    motion.advance(0, camera, settings);
    for (let frame = 1; frame <= 60; frame++) motion.advance(frame * 1000 / 60, camera, settings);
    expect(camera.position.z).toBeCloseTo(run(60, ['ArrowUp']).position.z * 2, 8);
  });

  it('ignores old key repeats after reset until a fresh press arrives', () => {
    const motion = new WalkthroughMotion(), camera = new PerspectiveCamera();
    motion.setKey('ArrowUp', true);
    motion.reset();
    motion.setKey('ArrowUp', true, true);
    motion.setKey('KeyA', true, true);
    motion.advance(0, camera, settings); motion.advance(100, camera, settings);
    expect(camera.position.z).toBe(0);
    expect(camera.rotation.y).toBe(0);
    motion.setKey('ArrowUp', false);
    motion.setKey('ArrowUp', true);
    motion.advance(200, camera, settings);
    expect(camera.position.z).toBeLessThan(-2);
  });

  it('turns at two radians per second and clamps pitch without changing eye height', () => {
    const yaw = new Euler().setFromQuaternion(run(120, ['KeyA']).quaternion, 'YXZ');
    expect(yaw.y).toBeCloseTo(2, 8);
    const camera = run(30, ['KeyW']);
    const pitch = new Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    expect(pitch.x).toBeCloseTo(Math.PI / 2, 8);
    expect(camera.position.y).toBe(585.5);
  });
});
