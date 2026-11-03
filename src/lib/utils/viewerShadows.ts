/** Remembered once a viewer lost its WebGL context while drawing shadow maps on this device. */
export const SHADOWS_OFF_KEY = 'o3d_shadows_off';

/** GPUs whose drivers lose the context on three's depth-texture shadow maps, whatever the shadow type:
 * ANGLE fails a depth copy on the Pixel 10's PowerVR D-Series. */
const BROKEN_SHADOW_GPUS = /PowerVR D-Series/i;

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const local = (): Storage | null => (typeof localStorage === 'undefined' ? null : localStorage);

export function gpuName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
}

/** Whether a renderer on this GPU may draw shadow maps. Blocked or full storage only loses the memory of a past loss. */
export function shadowsSupported(gpu: string, storage: Storage | null = local()): boolean {
  if (BROKEN_SHADOW_GPUS.test(gpu)) return false;
  try { return storage?.getItem(SHADOWS_OFF_KEY) !== 'true'; } catch { return true; }
}

export function rememberShadowsLost(storage: Storage | null = local()) {
  try { storage?.setItem(SHADOWS_OFF_KEY, 'true'); } catch { /* Storage can be disabled or full. */ }
}
