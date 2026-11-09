/** What this device remembers about WebGL contexts lost while drawing shadow maps, as JSON:
 *  `offUntil` turns shadows off until then; `lastLoss` is a single loss that is not yet a sign on its own. */
export const SHADOWS_OFF_KEY = 'o3d_shadows_off';

/** A context lost this soon after a renderer starts drawing shadows is the broken-driver signature: the Pixel 10's
 *  PowerVR driver loses it on the first frame. */
export const EARLY_LOSS_MS = 10_000;
/** A second loss within this window of the first is no coincidence either. */
export const REPEAT_LOSS_MS = 24 * 60 * 60 * 1000;
/** How long a device draws without shadows once remembered; a browser or driver update may fix it. */
export const SHADOWS_OFF_FOR_MS = 30 * 24 * 60 * 60 * 1000;

/** GPUs whose drivers lose the context on three's depth-texture shadow maps, whatever the shadow type:
 * ANGLE fails a depth copy on the Pixel 10's PowerVR D-Series. */
const BROKEN_SHADOW_GPUS = /PowerVR D-Series/i;

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
type Memory = { offUntil?: number; lastLoss?: number };
const local = (): Storage | null => (typeof localStorage === 'undefined' ? null : localStorage);

function read(storage: Storage | null): Memory {
  try {
    const value = JSON.parse(storage?.getItem(SHADOWS_OFF_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return {};
    const time = (t: unknown) => (typeof t === 'number' && Number.isFinite(t) ? t : undefined);
    return { offUntil: time(value.offUntil), lastLoss: time(value.lastLoss) };
  } catch { return {}; }
}

function write(storage: Storage | null, memory: Memory) {
  try { storage?.setItem(SHADOWS_OFF_KEY, JSON.stringify(memory)); } catch { /* Storage can be disabled or full. */ }
}

/** The GPU's name. Firefox reports it as RENDERER and warns that the debug extension is deprecated, so ask the
 *  extension only when RENDERER is the generic name Chrome and Safari give. */
export function gpuName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const renderer = String(gl.getParameter(gl.RENDERER) ?? '');
  if (!/^WebKit WebGL$/i.test(renderer)) return renderer;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? renderer) : renderer;
}

/** Whether a renderer on this GPU may draw shadow maps. Blocked or full storage only loses the memory of a past loss. */
export function shadowsSupported(gpu: string, storage: Storage | null = local(), now = Date.now()): boolean {
  if (BROKEN_SHADOW_GPUS.test(gpu)) return false;
  const { offUntil } = read(storage);
  return offUntil === undefined || offUntil <= now;
}

/** Records a context lost while drawing shadows, `drawingFor` ms after the renderer started. An early or repeated
 *  loss turns shadows off on this device for a while; a lone late one (memory pressure, a GPU reset) is only noted.
 *  Returns whether shadows are now off on this device. */
export function rememberShadowsLost(drawingFor: number, storage: Storage | null = local(), now = Date.now()): boolean {
  const { lastLoss } = read(storage);
  const repeated = lastLoss !== undefined && now - lastLoss >= 0 && now - lastLoss < REPEAT_LOSS_MS;
  if (drawingFor < EARLY_LOSS_MS || repeated) {
    write(storage, { offUntil: now + SHADOWS_OFF_FOR_MS });
    return true;
  }
  write(storage, { lastLoss: now });
  return false;
}
