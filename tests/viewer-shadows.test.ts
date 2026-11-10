import { describe, expect, it } from 'vitest';
import {
  EARLY_LOSS_MS, REPEAT_LOSS_MS, SHADOWS_OFF_FOR_MS, SHADOWS_OFF_KEY, gpuName, rememberShadowsLost, shadowsSupported
} from '$lib/utils/viewerShadows';

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
const ADRENO = 'ANGLE (Qualcomm, Adreno (TM) 740, OpenGL ES 3.2)';
const NOW = 1_800_000_000_000;

describe('viewer shadows', () => {
  it('turns shadows off on the Pixel 10 PowerVR D-Series and keeps them elsewhere', () => {
    expect(shadowsSupported('ANGLE (Imagination Technologies, PowerVR D-Series DXT-48-1536, OpenGL ES 3.2)', memory())).toBe(false);
    expect(shadowsSupported(ADRENO, memory())).toBe(true);
    expect(shadowsSupported('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', memory())).toBe(true);
  });

  it('turns shadows off for a while after a context lost soon after shadows start', () => {
    const storage = memory();
    expect(rememberShadowsLost(EARLY_LOSS_MS - 1, storage, NOW)).toBe(true);
    expect(shadowsSupported(ADRENO, storage, NOW + 1)).toBe(false);
    expect(shadowsSupported(ADRENO, storage, NOW + SHADOWS_OFF_FOR_MS - 1)).toBe(false);
    expect(shadowsSupported(ADRENO, storage, NOW + SHADOWS_OFF_FOR_MS)).toBe(true);
  });

  it('only notes a lone late loss, and turns shadows off when another follows within a day', () => {
    const storage = memory();
    expect(rememberShadowsLost(EARLY_LOSS_MS * 6, storage, NOW)).toBe(false);
    expect(shadowsSupported(ADRENO, storage, NOW + 1)).toBe(true);
    expect(rememberShadowsLost(EARLY_LOSS_MS * 6, storage, NOW + REPEAT_LOSS_MS - 1)).toBe(true);
    expect(shadowsSupported(ADRENO, storage, NOW + REPEAT_LOSS_MS)).toBe(false);
  });

  it('forgets a late loss once a day has passed', () => {
    const storage = memory();
    rememberShadowsLost(EARLY_LOSS_MS * 6, storage, NOW);
    expect(rememberShadowsLost(EARLY_LOSS_MS * 6, storage, NOW + REPEAT_LOSS_MS)).toBe(false);
    expect(shadowsSupported(ADRENO, storage, NOW + REPEAT_LOSS_MS + 1)).toBe(true);
  });

  it('ignores memory it cannot read', () => {
    for (const value of ['true', 'not json', '[]', '{"offUntil":"soon"}', 'null']) {
      const storage = memory();
      storage.setItem(SHADOWS_OFF_KEY, value);
      expect(shadowsSupported(ADRENO, storage, NOW)).toBe(true);
    }
  });

  it('keeps shadows when storage is blocked or missing', () => {
    expect(() => rememberShadowsLost(0, blocked)).not.toThrow();
    expect(shadowsSupported('Adreno', blocked)).toBe(true);
    expect(shadowsSupported('Adreno', null)).toBe(true);
  });

  it('asks the debug extension for the GPU only when RENDERER is generic', () => {
    const context = (renderer: string) => {
      const asked: string[] = [];
      const gl = {
        RENDERER: 1, getParameter: (p: number) => (p === 1 ? renderer : 'ANGLE (Apple, Apple M2)'),
        getExtension: (name: string) => { asked.push(name); return { UNMASKED_RENDERER_WEBGL: 2 }; }
      } as unknown as WebGL2RenderingContext;
      return { gl, asked };
    };
    const firefox = context('Apple M2');
    expect(gpuName(firefox.gl)).toBe('Apple M2');
    expect(firefox.asked).toEqual([]);
    const chrome = context('WebKit WebGL');
    expect(gpuName(chrome.gl)).toBe('ANGLE (Apple, Apple M2)');
    expect(chrome.asked).toEqual(['WEBGL_debug_renderer_info']);
  });
});
