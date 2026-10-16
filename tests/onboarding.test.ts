import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockStorage } from './fixtures/indexeddb';

const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

beforeEach(() => {
  vi.resetModules();
  // Vitest compiles this runes module as plain TypeScript; an identity $state keeps its module-local behaviour.
  vi.stubGlobal('$state', <T>(initial: T) => initial);
});

afterEach(() => {
  if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

const load = () => import('../src/lib/stores/onboarding.svelte');

describe('onboarding tips', () => {
  it('records a dismissed tip so later sessions skip it', async () => {
    const data = mockStorage();
    const tips = await load();
    tips.triggerTip('first-export', 300, 60);
    expect(tips.getActiveTip()).toEqual({ id: 'first-export', x: 300, y: 60 });
    tips.dismissTip();
    expect(tips.getActiveTip()).toBeNull();
    expect(JSON.parse(data.get('o3d_tips_seen')!)).toEqual(['first-export']);
    vi.resetModules();
    const next = await load();
    next.triggerTip('first-export', 300, 60);
    expect(next.getActiveTip()).toBeNull();
  });

  it('closes a tip that storage cannot record and keeps it closed for the session', async () => {
    const data = mockStorage();
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    const tips = await load();
    tips.triggerTip('first-export', 300, 60);
    expect(() => tips.dismissTip()).not.toThrow();
    expect(tips.getActiveTip()).toBeNull();
    tips.triggerTip('first-export', 300, 60);
    expect(tips.getActiveTip()).toBeNull();
    // Other tips are unaffected.
    tips.triggerTip('first-3d', 200, 80);
    expect(tips.getActiveTip()).toMatchObject({ id: 'first-3d' });
    expect(data.has('o3d_tips_seen')).toBe(false);
  });

  it('shows and dismisses tips in memory when site storage is blocked', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Access is denied for this document.', 'SecurityError'); },
    });
    const tips = await load();
    tips.triggerTip('first-wall', 400, 120);
    expect(tips.getActiveTip()).toMatchObject({ id: 'first-wall' });
    expect(() => tips.dismissTip()).not.toThrow();
    expect(tips.getActiveTip()).toBeNull();
    tips.triggerTip('first-wall', 400, 120);
    expect(tips.getActiveTip()).toBeNull();
  });
});
