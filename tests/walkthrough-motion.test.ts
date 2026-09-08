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
  it('stays inactive for sprint alone and opposing input, then wakes when one direction is released', () => {
    const motion = new WalkthroughMotion();
    expect(motion.active).toBe(false);
    motion.setKey('ShiftLeft', true);
    expect(motion.active).toBe(false);
    for (const key of ['ArrowUp', 'ArrowDown', 'KeyA', 'KeyD']) motion.setKey(key, true);
    expect(motion.active).toBe(false);
    motion.setKey('ArrowDown', false);
    expect(motion.active).toBe(true);
  });

  it('finishes coasting within two seconds while preserving the full straight-line travel', () => {
    const motion = new WalkthroughMotion(), camera = new PerspectiveCamera();
    motion.setKey('ArrowUp', true);
    motion.advance(0, camera, settings); motion.advance(250, camera, settings);
    motion.setKey('ArrowUp', false);
    expect(motion.active).toBe(true);
    for (let time = 500; time <= 2250; time += 250) motion.advance(time, camera, settings);
    expect(motion.active).toBe(false);
    expect(-camera.position.z).toBeCloseTo(20, 9); // acceleration impulse / drag
    const settled = camera.position.clone();
    motion.advance(2500, camera, settings);
    expect(camera.position.equals(settled)).toBe(true);
  });

  it('wakes from the fresh input timestamp without integrating time spent stationary', () => {
    const motion = new WalkthroughMotion(), camera = new PerspectiveCamera();
    motion.advance(0, camera, settings); motion.stopClock();
    motion.setKey('ArrowUp', true); motion.startClock(60_000);
    motion.advance(60_100, camera, settings);
    expect(-camera.position.z).toBeCloseTo(2.9430355, 6);
  });

  it('does not restart an active clock when another input or key repeat arrives', () => {
    const motion = new WalkthroughMotion(), camera = new PerspectiveCamera();
    motion.setKey('ArrowUp', true); motion.startClock(0);
    motion.advance(100, camera, settings);
    motion.setKey('ArrowUp', true, true); motion.startClock(150);
    motion.advance(200, camera, settings);
    expect(-camera.position.z).toBeCloseTo(9.0826823, 6);
  });

  it('keeps fresh input when the first RAF timestamp precedes its event handler', () => {
    const motion = new WalkthroughMotion(), camera = new PerspectiveCamera();
    motion.setKey('ArrowUp', true); motion.startClock(100);
    // RAF carries the frame's start time; input can arrive later in that frame.
    motion.advance(96, camera, settings);
    expect(motion.active).toBe(true);
    expect(camera.position.z).toBe(0);
    motion.advance(116, camera, settings);
    expect(-camera.position.z).toBeCloseTo(80 * (0.016 + Math.expm1(-0.16) / 10), 10);
    expect(motion.active).toBe(true);
    // A genuinely backwards timestamp after animation starts still resets input.
    motion.advance(110, camera, settings);
    expect(motion.active).toBe(false);
  });

  it('stops keyboard look immediately on release without inventing look momentum', () => {
    const motion = new WalkthroughMotion(), camera = new PerspectiveCamera();
    motion.setKey('KeyA', true); motion.startClock(0);
    motion.advance(100, camera, settings);
    expect(motion.active).toBe(true);
    motion.setKey('KeyA', false);
    expect(motion.active).toBe(false);
    const rotation = camera.quaternion.clone();
    motion.stopClock(); motion.advance(60_000, camera, settings);
    expect(camera.quaternion.equals(rotation)).toBe(true);
  });

  it('reset drops all animation demand and ignores repeats after focus loss', () => {
    const motion = new WalkthroughMotion(), camera = new PerspectiveCamera();
    motion.setKey('ArrowUp', true); motion.startClock(0);
    motion.advance(100, camera, settings); motion.reset();
    motion.setKey('ArrowUp', true, true);
    expect(motion.active).toBe(false);
    motion.setKey('ArrowUp', false); motion.setKey('ArrowUp', true);
    expect(motion.active).toBe(true);
  });

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
