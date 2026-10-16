import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { mockStorage } from './fixtures/indexeddb';

const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

beforeEach(() => {
  vi.resetModules();
  // The store only touches storage in the browser.
  vi.stubGlobal('window', {});
});

afterEach(() => {
  if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

/** Blocked site data: reading localStorage itself throws, as browsers do when cookies are blocked. */
function blockStorage() {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new DOMException('Access is denied for this document.', 'SecurityError'); },
  });
}

const load = async () => (await import('../src/lib/stores/settings')).projectSettings;

/** What S and the status-bar Snap button do. */
function switchSnapStep(settings: Awaited<ReturnType<typeof load>>) {
  settings.update((s) => ({ ...s, snapToGrid: !s.snapToGrid }));
}

describe('editor settings', () => {
  it('switches the snap step for the session when site storage is blocked', async () => {
    blockStorage();
    const settings = await load();
    expect(get(settings).snapToGrid).toBe(true);
    expect(() => switchSnapStep(settings)).not.toThrow();
    expect(get(settings).snapToGrid).toBe(false);
    switchSnapStep(settings);
    expect(get(settings).snapToGrid).toBe(true);
  });

  it('applies Settings changes for the session when site storage is blocked', async () => {
    blockStorage();
    const settings = await load();
    expect(() => settings.set({ ...get(settings), units: 'imperial', showInternalDimensions: true })).not.toThrow();
    expect(get(settings)).toMatchObject({ units: 'imperial', showInternalDimensions: true });
    expect(() => settings.reset()).not.toThrow();
    expect(get(settings)).toMatchObject({ units: 'metric', showInternalDimensions: false });
  });

  it('keeps changes that full storage could not save', async () => {
    const data = mockStorage();
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    const settings = await load();
    expect(() => switchSnapStep(settings)).not.toThrow();
    expect(() => settings.set({ ...get(settings), units: 'imperial' })).not.toThrow();
    expect(get(settings)).toMatchObject({ snapToGrid: false, units: 'imperial' });
    expect(data.has('o3d_settings')).toBe(false);
  });

  it('remembers changes across reloads when storage works', async () => {
    const data = mockStorage();
    const settings = await load();
    switchSnapStep(settings);
    expect(JSON.parse(data.get('o3d_settings')!)).toMatchObject({ snapToGrid: false });
    settings.set({ ...get(settings), units: 'imperial' });
    vi.resetModules();
    expect(get(await load())).toMatchObject({ snapToGrid: false, units: 'imperial' });
  });
});
