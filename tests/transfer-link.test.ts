import { describe, expect, it, vi } from 'vitest';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { sortedJson } from '$lib/utils/interchange';
import { MAX_TRANSFER_INFLATED_BYTES, MAX_TRANSFER_PAYLOAD_CHARS, OPENKITCHEN3D_WEB_ORIGIN, SIBLING_PLANNERS, TRANSFER_VERSION, TransferLinkError, decodeTransferPayload, encodeTransferPayload, siblingImportUrl } from '$lib/utils/transferLink';

const sample = { openplanPrepared: true, openplanHandoffVersion: 1, walls: [{ identifier: 'w', dimensions: [4, 2.5, 0.15], transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 1.25, 0, 1], category: { wall: {} }, story: 0 }], planNotes: 'Açaí — “quotes” & ampersands / slashes + plus' };

/** Deterministic incompressible hex text (mulberry32), so the size test needs no randomness. */
function noise(chars: number): string {
  let a = 0x9e3779b9;
  const out: string[] = [];
  for (let i = 0; i < chars; i++) {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out.push(((t ^ (t >>> 14)) >>> 28).toString(16));
  }
  return out.join('');
}

describe('sibling transfer links', () => {
  it('runs on the built-in compression streams of the test runtime', () => {
    expect(typeof CompressionStream).toBe('function');
    expect(typeof DecompressionStream).toBe('function');
  });

  it('encodes compact key-sorted JSON as unpadded base64url raw DEFLATE and decodes it back', async () => {
    const payload = await encodeTransferPayload(sample);
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(payload).not.toContain('=');
    expect(await decodeTransferPayload(payload)).toEqual(sample);
    expect(await decodeTransferPayload(` ${encodeURIComponent(payload)} `)).toEqual(sample);
    // Raw DEFLATE (RFC 1951): what Apple's COMPRESSION_ZLIB and the siblings' codecs read.
    expect(inflateRawSync(Buffer.from(payload, 'base64url')).toString('utf8')).toBe(sortedJson(sample));
    const fromNode = deflateRawSync(Buffer.from(JSON.stringify(sample), 'utf8')).toString('base64url');
    expect(await decodeTransferPayload(fromNode)).toEqual(sample);
  });

  it('builds the documented import link for every planner', async () => {
    expect(SIBLING_PLANNERS.map(p => p.id)).toEqual(['openlandscape3d', 'openkitchen3d', 'opencatio3d']);
    expect(SIBLING_PLANNERS.find(p => p.id === 'openkitchen3d')!.origin).toBe(OPENKITCHEN3D_WEB_ORIGIN);
    expect(OPENKITCHEN3D_WEB_ORIGIN).toBe('https://openkitchen3d-cloud.web.app');
    expect(TRANSFER_VERSION).toBe('v1');
    for (const planner of SIBLING_PLANNERS) {
      const url = await siblingImportUrl(planner.id, sample), prefix = `${planner.origin}/#/import/v1/`;
      expect(url.startsWith(prefix)).toBe(true);
      const payload = url.slice(prefix.length);
      expect(payload).toBe(await encodeTransferPayload(sample));
      expect(new URL(url).search).toBe('');
      expect(await decodeTransferPayload(new URL(url).hash.replace('#/import/v1/', ''))).toEqual(sample);
    }
    expect(await siblingImportUrl('openlandscape3d', sample)).toMatch(/^https:\/\/app\.openlandscape3d\.com\/#\/import\/v1\/[A-Za-z0-9_-]+$/);
    expect(await siblingImportUrl('opencatio3d', sample)).toMatch(/^https:\/\/app\.opencatio3d\.com\/#\/import\/v1\//);
    await expect(siblingImportUrl('openpool3d' as any, sample)).rejects.toThrow('Unknown planner');
  });

  it('refuses links the siblings would reject as too large', async () => {
    expect(MAX_TRANSFER_PAYLOAD_CHARS).toBe(262144);
    const big = { ...sample, padding: noise(800_000) };
    const payload = await encodeTransferPayload(big);
    expect(payload.length).toBeGreaterThan(MAX_TRANSFER_PAYLOAD_CHARS);
    const failure = await siblingImportUrl('openlandscape3d', big).catch(error => error);
    expect(failure).toBeInstanceOf(TransferLinkError);
    expect(failure).toMatchObject({ name: 'TransferLinkError', reason: 'too-large' });
    expect(failure.message).toContain('OpenLandscape3D');
    await expect(decodeTransferPayload(payload)).rejects.toMatchObject({ reason: 'too-large' });
    await expect(decodeTransferPayload('A'.repeat(MAX_TRANSFER_PAYLOAD_CHARS + 1))).rejects.toMatchObject({ reason: 'too-large' });
    expect(await decodeTransferPayload(await encodeTransferPayload({ ...sample, padding: noise(100_000) }))).toMatchObject({ padding: noise(100_000) });
  });

  it('caps inflated bytes while decoding', async () => {
    expect(MAX_TRANSFER_INFLATED_BYTES).toBe(16 * 1024 * 1024);
    const bomb = await encodeTransferPayload({ text: 'a'.repeat(200_000) });
    expect(bomb.length).toBeLessThan(2000);
    await expect(decodeTransferPayload(bomb, 1024)).rejects.toMatchObject({ reason: 'too-large' });
    expect(await decodeTransferPayload(bomb)).toEqual({ text: 'a'.repeat(200_000) });
  });

  it('reports a missing CompressionStream as unsupported', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    await expect(encodeTransferPayload(sample)).rejects.toMatchObject({ reason: 'unsupported' });
    await expect(siblingImportUrl('opencatio3d', sample)).rejects.toBeInstanceOf(TransferLinkError);
    vi.stubGlobal('DecompressionStream', undefined);
    await expect(decodeTransferPayload('eJyrVkrLz1eyUkpKLFKqBQAcwAQE')).rejects.toMatchObject({ reason: 'unsupported' });
  });
});
