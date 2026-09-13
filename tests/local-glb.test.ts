import { expect, it } from 'vitest';
import { readLocalGLB, LOCAL_GLB_FILE_LIMIT, LOCAL_GLB_JSON_LIMIT } from '$lib/utils/localGLB';

function glb(json: string = '{"asset":{"version":"2.0"}}', chunks: [number, Uint8Array][] = []) {
  const encoded = new TextEncoder().encode(json);
  const padded = new Uint8Array(Math.ceil(encoded.length / 4) * 4).fill(32); padded.set(encoded);
  const all: [number, Uint8Array][] = [[0x4e4f534a, padded], ...chunks];
  const result = new Uint8Array(12 + all.reduce((size, [, bytes]) => size + 8 + bytes.length, 0));
  const view = new DataView(result.buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, result.length, true);
  let offset = 12;
  for (const [type, bytes] of all) {
    view.setUint32(offset, bytes.length, true); view.setUint32(offset + 4, type, true);
    result.set(bytes, offset + 8); offset += 8 + bytes.length;
  }
  return result;
}

it('reads JSON and exact binary bytes from a subarray without modifying the source', () => {
  const model = glb(undefined, [[0x004e4942, new Uint8Array([1, 2, 3, 0])]]);
  const backing = new Uint8Array(model.length + 16).fill(77); backing.set(model, 8);
  const before = backing.slice();
  const result = readLocalGLB(backing.subarray(8, 8 + model.length));
  expect(result.document.asset.version).toBe('2.0');
  expect([...result.binary!]).toEqual([1, 2, 3, 0]);
  expect(backing).toEqual(before);
});

it('allows JSON-only documents and ignores bounded unknown trailing chunks', () => {
  expect(readLocalGLB(glb()).binary).toBeUndefined();
  expect(readLocalGLB(glb(undefined, [[123, new Uint8Array(4)]]))).toHaveProperty('document.asset.version', '2.0');
});

it('rejects truncation, wrong magic/version and inconsistent length before chunk reads', () => {
  for (const [offset, value] of [[0, 0], [4, 1], [8, 12], [12, 0xfffffff0]]) {
    const bytes = glb(); new DataView(bytes.buffer).setUint32(offset, value, true);
    expect(() => readLocalGLB(bytes)).toThrow('Invalid GLB:');
  }
  expect(() => readLocalGLB(new Uint8Array(19))).toThrow('Invalid GLB:');
  expect(() => readLocalGLB(new Uint8Array(LOCAL_GLB_FILE_LIMIT + 1))).toThrow('16 MiB');
});

it('rejects duplicate and reordered standard chunks and unaligned binary payloads', () => {
  const bin: [number, Uint8Array] = [0x004e4942, new Uint8Array(4)];
  for (const chunks of [[bin, bin], [[123, new Uint8Array(4)] as [number, Uint8Array], bin],
    [[0x4e4f534a, new Uint8Array(4)] as [number, Uint8Array]],
    [[0x004e4942, new Uint8Array(3)] as [number, Uint8Array]]]) {
    expect(() => readLocalGLB(glb(undefined, chunks))).toThrow('Invalid GLB:');
  }
});

it('checks JSON asset version independently of the binary header', () => {
  for (const asset of [{}, { version: '1.0' }, { version: '2.0', minVersion: '2.1' }]) {
    expect(() => readLocalGLB(glb(JSON.stringify({ asset })))).toThrow('asset version');
  }
});

it('rejects oversized, duplicate-key, malformed and excessively nested JSON', () => {
  for (const json of ['{"asset":{"version":"2.0","version":"2.0"}}', '{', '[]',
    '{"x":' + '['.repeat(101) + '0' + ']'.repeat(101) + '}',
    '{"padding":"' + 'a'.repeat(LOCAL_GLB_JSON_LIMIT) + '"}']) {
    expect(() => readLocalGLB(glb(json))).toThrow('Invalid GLB:');
  }
});
