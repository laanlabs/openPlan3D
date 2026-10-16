import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash, webcrypto } from 'node:crypto';
import { sha256BytesHex, sha256Hex } from '$lib/utils/sha256';

const reference = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const encode = (text: string) => new TextEncoder().encode(text);

const vectors = [
  new Uint8Array(0),
  encode('abc'),
  encode('The quick brown fox jumps over the lazy dog'),
  new Uint8Array(Array.from({ length: 1000 }, (_, index) => index % 256)),
  webcrypto.getRandomValues(new Uint8Array(4096)),
];

afterEach(() => vi.unstubAllGlobals());

describe('sha256', () => {
  it('matches Node for the pure-JS fallback', () => {
    for (const bytes of vectors) expect(sha256BytesHex(bytes)).toBe(reference(bytes));
  });

  it('matches Node via Web Crypto', async () => {
    vi.stubGlobal('crypto', webcrypto);
    for (const bytes of vectors) expect(await sha256Hex(bytes)).toBe(reference(bytes));
  });

  it('falls back when crypto.subtle is unavailable', async () => {
    vi.stubGlobal('crypto', { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
    for (const bytes of vectors) expect(await sha256Hex(bytes)).toBe(reference(bytes));
  });

  it('falls back when crypto is missing entirely', async () => {
    vi.stubGlobal('crypto', undefined);
    for (const bytes of vectors) expect(await sha256Hex(bytes)).toBe(reference(bytes));
  });

  it('hashes a subarray view without the surrounding buffer', async () => {
    const view = encode('XXabcXX').subarray(2, 5);
    expect(sha256BytesHex(view)).toBe(reference(encode('abc')));
    vi.stubGlobal('crypto', webcrypto);
    expect(await sha256Hex(view)).toBe(reference(encode('abc')));
  });
});
