import { writable } from 'svelte/store';

export type ThemePreference = 'light' | 'dark' | 'system';

function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    return (localStorage.getItem('o3d_theme') as ThemePreference) || 'system';
  } catch {
    // Storage can be disabled (site data blocked); follow the system theme.
    return 'system';
  }
}

function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref;
}

function applyTheme(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function createThemeStore() {
  const initial = getStoredTheme();
  // This session's choice; storage may be unable to keep it.
  let preference = initial;
  const { subscribe, set } = writable<ThemePreference>(initial);

  // Apply on creation
  applyTheme(resolveTheme(initial));

  // Listen for system theme changes
  if (typeof window !== 'undefined') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      if (preference === 'system') {
        applyTheme(resolveTheme('system'));
      }
    });
    // Another tab saved a theme: apply it here as a reload would, so it also holds when the system theme changes.
    window.addEventListener('storage', (event) => {
      if (event.key !== 'o3d_theme') return;
      preference = (event.newValue as ThemePreference | null) || 'system';
      set(preference);
      applyTheme(resolveTheme(preference));
    });
  }

  return {
    subscribe,
    set(value: ThemePreference) {
      preference = value;
      set(value);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('o3d_theme', value); } catch { /* The choice still applies for this session. */ }
      }
      applyTheme(resolveTheme(value));
    },
  };
}

export const themePreference = createThemeStore();
