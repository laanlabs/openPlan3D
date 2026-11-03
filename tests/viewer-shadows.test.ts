import { describe, expect, it } from 'vitest';
import { SHADOWS_OFF_KEY, rememberShadowsLost, shadowsSupported } from '$lib/utils/viewerShadows';

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };

describe('viewer shadows', () => {
  it('turns shadows off on the Pixel 10 PowerVR D-Series and keeps them elsewhere', () => {
    expect(shadowsSupported('ANGLE (Imagination Technologies, PowerVR D-Series DXT-48-1536, OpenGL ES 3.2)', memory())).toBe(false);
    expect(shadowsSupported('ANGLE (Qualcomm, Adreno (TM) 740, OpenGL ES 3.2)', memory())).toBe(true);
    expect(shadowsSupported('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', memory())).toBe(true);
  });

  it('remembers a context lost while drawing shadows', () => {
    const storage = memory();
    rememberShadowsLost(storage);
    expect(storage.getItem(SHADOWS_OFF_KEY)).toBe('true');
    expect(shadowsSupported('ANGLE (Qualcomm, Adreno (TM) 740, OpenGL ES 3.2)', storage)).toBe(false);
  });

  it('keeps shadows when storage is blocked or missing', () => {
    expect(() => rememberShadowsLost(blocked)).not.toThrow();
    expect(shadowsSupported('Adreno', blocked)).toBe(true);
    expect(shadowsSupported('Adreno', null)).toBe(true);
  });
});
