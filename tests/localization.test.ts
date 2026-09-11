import { afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { initializeLocale, locale, t, translate, type Locale } from '../src/lib/i18n';
import { en } from '../src/lib/i18n/locales/en';
import { pt } from '../src/lib/i18n/locales/pt';

afterEach(() => { vi.unstubAllGlobals(); locale.set('en'); });

describe('locale preferences', () => {
  it('preserves user content and substitutes numbers without recursively translating values', () => {
    expect(translate('pt', 'floors.elevation', { name: 'My {value} floor' })).toBe('Elevação de My {value} floor (cm)');
    expect(translate('pt', 'floors.default', { value: 125.5 })).toBe('Usar padrão (125.5 cm)');
    expect(translate('en', 'floors.default', { value: 125.5 })).toBe('Use default (125.5 cm)');
  });
  it('keeps dictionary keys and substitution tokens in agreement', () => {
    expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(pt[key].trim()).not.toBe('');
      expect(pt[key].match(/\{\w+\}/g) ?? []).toEqual(en[key].match(/\{\w+\}/g) ?? []);
    }
  });
  it('updates subscribed text, persists the choice and sets document language', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    vi.stubGlobal('document', { documentElement: { lang: 'en' } });
    const values: string[] = [];
    const unsubscribe = t.subscribe((translate) => values.push(translate('settings.title')));
    locale.set('pt');
    unsubscribe();
    expect(values).toEqual(['Settings', 'Configurações']);
    expect(setItem).toHaveBeenCalledWith('o3d_locale', 'pt');
    expect(document.documentElement.lang).toBe('pt');
  });
  it('restores valid preferences and ignores unknown persisted locales', () => {
    const getItem = vi.fn().mockReturnValue('pt');
    vi.stubGlobal('localStorage', { getItem, setItem: vi.fn() });
    initializeLocale();
    expect(get(locale)).toBe('pt');
    getItem.mockReturnValue('fr');
    initializeLocale();
    expect(get(locale)).toBe('en');
    locale.set('fr' as Locale);
    expect(get(locale)).toBe('en');
  });
  it('works in memory when storage access throws', () => {
    vi.stubGlobal('localStorage', { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } });
    expect(() => initializeLocale()).not.toThrow();
    expect(() => locale.set('pt')).not.toThrow();
    expect(get(t)('settings.title')).toBe(translate('pt', 'settings.title'));
  });
});
