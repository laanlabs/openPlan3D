import { afterEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { randomId } from '$lib/utils/randomId';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe('randomId', () => {
  it('uses crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', webcrypto);
    expect(randomId()).toMatch(UUID);
  });

  it('builds a v4 UUID from getRandomValues when randomUUID is missing', () => {
    vi.stubGlobal('crypto', { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
    const ids = new Set(Array.from({ length: 100 }, () => randomId()));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(id).toMatch(UUID);
  });

  it('still returns a UUID when no crypto API is present', () => {
    vi.stubGlobal('crypto', undefined);
    expect(randomId()).toMatch(UUID);
  });
});
