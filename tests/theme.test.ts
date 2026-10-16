import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { mockStorage } from './fixtures/indexeddb';

const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
let systemDark: boolean;
let systemListeners: (() => void)[];
let storageListeners: ((event: StorageEvent) => void)[];
let toggle: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  systemDark = false;
  systemListeners = [];
  storageListeners = [];
  toggle = vi.fn();
  vi.stubGlobal('window', {
    matchMedia: () => ({
      get matches() { return systemDark; },
      addEventListener: (_type: string, listener: () => void) => { systemListeners.push(listener); },
    }),
    addEventListener: (type: string, listener: (event: StorageEvent) => void) => { if (type === 'storage') storageListeners.push(listener); },
  });
  vi.stubGlobal('document', { documentElement: { classList: { toggle } } });
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

/** The operating system switches between light and dark while the app is open, in every open tab. */
function switchSystemTheme(dark: boolean) {
  systemDark = dark;
  for (const listener of systemListeners) listener();
}

const load = () => import('../src/lib/stores/theme');

/** Another tab of the app: its own copy of the store, sharing this browser's storage. */
async function openTab() {
  vi.resetModules();
  const known = storageListeners.length;
  const { themePreference } = await load();
  const listeners = storageListeners.slice(known);
  return {
    themePreference,
    /** The browser tells this tab about a write that another tab made. */
    storageChanged(key: string | null, newValue: string | null) {
      for (const listener of listeners) listener({ key, newValue } as StorageEvent);
    },
  };
}

describe('theme preference', () => {
  it('starts with the system theme when site storage is blocked', async () => {
    blockStorage();
    systemDark = true;
    const { themePreference } = await load();
    expect(get(themePreference)).toBe('system');
    expect(toggle).toHaveBeenLastCalledWith('dark', true);
    switchSystemTheme(false);
    expect(toggle).toHaveBeenLastCalledWith('dark', false);
  });

  it('applies a choice for the rest of the session when site storage is blocked', async () => {
    blockStorage();
    const { themePreference } = await load();
    expect(() => themePreference.set('dark')).not.toThrow();
    expect(get(themePreference)).toBe('dark');
    expect(toggle).toHaveBeenLastCalledWith('dark', true);
    // The unreadable stored default must not replace the choice when the system theme changes.
    switchSystemTheme(true);
    switchSystemTheme(false);
    expect(toggle).toHaveBeenLastCalledWith('dark', true);
  });

  it('keeps a choice that full storage could not save', async () => {
    const data = mockStorage();
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    const { themePreference } = await load();
    expect(() => themePreference.set('light')).not.toThrow();
    switchSystemTheme(true);
    expect(toggle).toHaveBeenLastCalledWith('dark', false);
    expect(data.has('o3d_theme')).toBe(false);
  });

  it('remembers a choice across reloads when storage works', async () => {
    const data = mockStorage();
    (await load()).themePreference.set('dark');
    expect(data.get('o3d_theme')).toBe('dark');
    vi.resetModules();
    const { themePreference } = await load();
    expect(get(themePreference)).toBe('dark');
    switchSystemTheme(false);
    expect(toggle).toHaveBeenLastCalledWith('dark', true);
  });

  it('applies a theme chosen in another tab and keeps it when the system theme changes', async () => {
    const data = mockStorage();
    systemDark = true;
    const here = await openTab();
    const other = await openTab();
    other.themePreference.set('light');
    toggle.mockClear();
    here.storageChanged('o3d_theme', data.get('o3d_theme')!);
    expect(get(here.themePreference)).toBe('light');
    expect(toggle).toHaveBeenLastCalledWith('dark', false);
    // As after a reload, the saved Light holds when the system theme turns dark.
    switchSystemTheme(false);
    toggle.mockClear();
    switchSystemTheme(true);
    expect(toggle).not.toHaveBeenCalled();
    // System chosen in the other tab hands this one back to the system theme.
    other.themePreference.set('system');
    toggle.mockClear();
    here.storageChanged('o3d_theme', data.get('o3d_theme')!);
    expect(get(here.themePreference)).toBe('system');
    expect(toggle).toHaveBeenLastCalledWith('dark', true);
    // Writes to other keys leave the theme alone, and each tab listens once.
    here.storageChanged('o3d_locale', 'pt');
    expect(get(here.themePreference)).toBe('system');
    expect(storageListeners).toHaveLength(2);
  });

  it('loads on the server without listening for system or storage changes', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    const { themePreference } = await load();
    expect(get(themePreference)).toBe('system');
    expect(systemListeners).toHaveLength(0);
    expect(storageListeners).toHaveLength(0);
  });
});
