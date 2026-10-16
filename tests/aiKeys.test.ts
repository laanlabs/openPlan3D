import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';

beforeEach(() => {
  vi.resetModules();
  const data = new Map<string, string>();
  vi.stubGlobal('window', { location: { origin: 'https://app.example' } });
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { data.set(key, value); }),
    removeItem: vi.fn((key: string) => { data.delete(key); }),
  });
});

describe('provider settings', () => {
  it('migrates legacy keys only after an explicit successful save', async () => {
    localStorage.setItem('o3d_openai_key', 'legacy-key');
    const settings = await import('../src/lib/stores/aiKeys');
    expect(get(settings.openAISettings)).toEqual({ apiKey: 'legacy-key', baseUrl: '', model: '' });
    settings.saveOpenAISettings({ apiKey: ' new-key ', baseUrl: ' https://provider.example/v1/ ', model: ' custom ' });
    expect(get(settings.openAISettings)).toEqual({ apiKey: 'new-key', baseUrl: 'https://provider.example/v1', model: 'custom' });
    expect(localStorage.getItem('o3d_openai_key')).toBeNull();
    vi.resetModules();
    expect(get((await import('../src/lib/stores/aiKeys')).openAISettings)).toEqual(get(settings.openAISettings));
  });
  it('keeps the original credential/destination together when a save fails', async () => {
    const settings = await import('../src/lib/stores/aiKeys');
    settings.saveOpenAISettings({ apiKey: 'original', baseUrl: 'https://first.example' });
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    expect(() => settings.saveOpenAISettings({ apiKey: 'new', baseUrl: 'https://second.example' })).toThrow();
    expect(get(settings.openAISettings)).toMatchObject({ apiKey: 'original', baseUrl: 'https://first.example' });
  });
  it('removes every legacy key so credentials cannot reappear on reload', async () => {
    for (const key of ['o3d_openai_key', 'o3d_openai_base_url', 'o3d_openai_model']) localStorage.setItem(key, 'legacy');
    const settings = await import('../src/lib/stores/aiKeys');
    settings.removeOpenAISettings(); vi.resetModules();
    expect(get((await import('../src/lib/stores/aiKeys')).openAISettings)).toEqual({ apiKey: '', baseUrl: '', model: '' });
    expect(localStorage.getItem('o3d_openai_key')).toBeNull();
  });
  it('loads safely when local storage is corrupt or unavailable', async () => {
    localStorage.setItem('o3d_openai_settings', 'bad-json');
    expect(get((await import('../src/lib/stores/aiKeys')).openAISettings).apiKey).toBe('');
    vi.resetModules();
    vi.mocked(localStorage.getItem).mockImplementation(() => { throw new Error('blocked'); });
    expect(get((await import('../src/lib/stores/aiKeys')).openAISettings).apiKey).toBe('');
  });
  it('stores a trimmed Gemini key, removes a blank one, and reports storage that refuses either', async () => {
    const keys = await import('../src/lib/stores/aiKeys');
    keys.setGeminiKey(' AIza-key ');
    expect(keys.getGeminiKey()).toBe('AIza-key');
    keys.setGeminiKey(' ');
    expect(keys.getGeminiKey()).toBeNull();
    // Settings > AI shows its failure message instead of "Saved" when these throw.
    const denied = () => { throw new DOMException('Access is denied for this document.', 'SecurityError'); };
    vi.mocked(localStorage.setItem).mockImplementation(denied);
    vi.mocked(localStorage.removeItem).mockImplementation(denied);
    expect(() => keys.setGeminiKey('AIza-new')).toThrow(/denied/);
    expect(() => keys.setGeminiKey('')).toThrow(/denied/);
    expect(keys.getGeminiKey()).toBeNull();
  });
});
