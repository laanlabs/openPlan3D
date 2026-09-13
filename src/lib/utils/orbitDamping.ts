import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** Preserve the 60 Hz orbit feel while letting slow renderers settle in real time. */
export function updateOrbitDamping(controls: OrbitControls, elapsedSeconds: number) {
  const factor = controls.dampingFactor;
  const elapsed = Number.isFinite(elapsedSeconds) && elapsedSeconds > 0 ? Math.min(elapsedSeconds, 1) : 1 / 60;
  controls.dampingFactor = 1 - Math.pow(1 - factor, elapsed * 60);
  try {
    return controls.update();
  } finally {
    // Pointer events also call update(); retain their configured response.
    controls.dampingFactor = factor;
  }
}
