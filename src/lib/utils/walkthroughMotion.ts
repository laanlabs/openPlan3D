import { Euler, type Camera } from 'three';

const keys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyS', 'KeyA', 'KeyD', 'ShiftLeft', 'ShiftRight']);

export interface WalkthroughSettings {
  moveSpeed: number;
  sprintSpeed: number;
  eyeHeight: number;
  floorElevation: number;
}

/** Local walkthrough input and motion; independent of rendering and pointer lock. */
export class WalkthroughMotion {
  private held = new Set<string>();
  private previous: number | null = null;
  private waitingForFirstFrame = false;
  private rightVelocity = 0;
  private forwardVelocity = 0;
  private rotation = new Euler(0, 0, 0, 'YXZ');

  get active() {
    const held = (code: string) => Number(this.held.has(code));
    return Boolean(this.rightVelocity || this.forwardVelocity
      || held('ArrowRight') !== held('ArrowLeft') || held('ArrowUp') !== held('ArrowDown')
      || held('KeyA') !== held('KeyD') || held('KeyW') !== held('KeyS'));
  }

  /** Wake from the input event's clock, without counting the preceding idle time. */
  startClock(timestamp: number) {
    if (this.previous === null && Number.isFinite(timestamp)) {
      this.previous = timestamp;
      this.waitingForFirstFrame = true;
    }
  }

  stopClock() { this.previous = null; this.waitingForFirstFrame = false; }

  setKey(code: string, down: boolean, repeat = false) {
    if (!keys.has(code)) return false;
    // An OS repeat after returning to the page must not revive a key that blur
    // cleared. Accept movement again on a fresh press after release.
    if (down && repeat && !this.held.has(code)) return true;
    if (down) this.held.add(code);
    else this.held.delete(code);
    return true;
  }

  reset() {
    this.held.clear();
    this.stopClock();
    this.rightVelocity = this.forwardVelocity = 0;
  }

  advance(timestamp: number, camera: Camera, settings: WalkthroughSettings) {
    camera.position.y = settings.floorElevation + settings.eyeHeight;
    if (!Number.isFinite(timestamp)) { this.reset(); return; }
    if (this.previous === null) { this.previous = timestamp; return; }
    if (timestamp <= this.previous) {
      // RAF's shared frame timestamp can precede an input handler within that
      // frame. Keep its keys and wait for a frame after the wakeup time.
      if (timestamp < this.previous && !this.waitingForFirstFrame) this.reset();
      return;
    }
    this.waitingForFirstFrame = false;
    // A delayed frame must not teleport through the plan. Blur/visibility resets
    // separately discard all held input, momentum and elapsed background time.
    const delta = Math.min((timestamp - this.previous) / 1000, 0.25);
    this.previous = timestamp;
    const held = (code: string) => Number(this.held.has(code));
    const speed = this.held.has('ShiftLeft') || this.held.has('ShiftRight')
      ? settings.sprintSpeed : settings.moveSpeed;
    const right = held('ArrowRight') - held('ArrowLeft');
    const forward = held('ArrowUp') - held('ArrowDown');
    const length = Math.hypot(right, forward) || 1;
    const yawSpeed = (held('KeyA') - held('KeyD')) * 2;
    const pitchSpeed = (held('KeyW') - held('KeyS')) * 2;
    if (!right && !forward && !yawSpeed && !pitchSpeed && !this.rightVelocity && !this.forwardVelocity) return;

    // Preserve the old slider's acceleration/drag balance (800 gives 80 cm/s
    // once settled). Integrate dv/dt = acceleration - 10v analytically, so
    // acceleration, coasting and sprint changes do not depend on frame cadence.
    const targetRight = right / length * speed / 10;
    const targetForward = forward / length * speed / 10;
    // Short substeps also keep simultaneous turning/movement consistent. They
    // update only the camera pose; the scene is still drawn once per RAF.
    const steps = Math.max(1, Math.ceil(delta * 120 - 1e-8));
    const step = delta / steps;
    const decay = Math.exp(-10 * step);
    const integral = -Math.expm1(-10 * step) / 10;
    this.rotation.setFromQuaternion(camera.quaternion, 'YXZ');
    for (let i = 0; i < steps; i++) {
      const rightDistance = targetRight * step + (this.rightVelocity - targetRight) * integral;
      const forwardDistance = targetForward * step + (this.forwardVelocity - targetForward) * integral;
      this.rightVelocity = targetRight + (this.rightVelocity - targetRight) * decay;
      this.forwardVelocity = targetForward + (this.forwardVelocity - targetForward) * decay;
      const yaw = this.rotation.y + yawSpeed * step / 2;
      camera.position.x += Math.cos(yaw) * rightDistance - Math.sin(yaw) * forwardDistance;
      camera.position.z -= Math.sin(yaw) * rightDistance + Math.cos(yaw) * forwardDistance;
      this.rotation.y += yawSpeed * step;
      this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x + pitchSpeed * step));
    }
    // Finish the sub-pixel coasting tail rather than drawing forever as the
    // exponential approaches zero. Remaining travel is at most 0.001 cm.
    if (!right && !forward && Math.hypot(this.rightVelocity, this.forwardVelocity) < 0.01) {
      const yaw = this.rotation.y;
      camera.position.x += (Math.cos(yaw) * this.rightVelocity - Math.sin(yaw) * this.forwardVelocity) / 10;
      camera.position.z -= (Math.sin(yaw) * this.rightVelocity + Math.cos(yaw) * this.forwardVelocity) / 10;
      this.rightVelocity = this.forwardVelocity = 0;
    }
    camera.quaternion.setFromEuler(this.rotation);
  }
}
