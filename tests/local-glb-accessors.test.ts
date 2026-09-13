import { expect, it } from 'vitest';
import { validateLocalGLBAccessors as validate } from '$lib/utils/localGLBAccessors';

function model() {
  return { document: {
    buffers: [{ byteLength: 32 }], bufferViews: [{ buffer: 0, byteLength: 32, byteStride: 16 }],
    accessors: [{ bufferView: 0, componentType: 5126, type: 'VEC3', count: 2 }],
  } as Record<string, any>, binary: new Uint8Array(32) };
}
it('accepts interleaved floats, honors byte-array offsets and preserves input', () => {
  const candidate = model(); candidate.binary = new Uint8Array(40).subarray(4, 36);
  new DataView(candidate.binary.buffer).setFloat32(4, 12.5, true);
  const before = candidate.binary.slice();
  expect(validate(candidate)).toEqual([{ count: 2, components: 3, elementSize: 12 }]);
  expect(candidate.binary).toEqual(before);
});
it('rejects out-of-range, misaligned and undersized strided storage', () => {
  for (const change of [{ count: 3 }, { byteOffset: 2 }, { bufferView: 1 }, { byteOffset: null }, { componentType: '5126' }, { type: 'toString' }]) {
    const candidate = model(); Object.assign(candidate.document.accessors[0], change);
    expect(() => validate(candidate)).toThrow('Invalid GLB accessor');
  }
  const candidate = model(); candidate.document.bufferViews[0].byteStride = 4;
  expect(() => validate(candidate)).toThrow('stride');
});
it('bounds zero-initialized accessors and aggregate decoded allocation', () => {
  const candidate = model(); delete candidate.document.accessors[0].bufferView;
  candidate.document.accessors[0].count = 6_000_000;
  expect(() => validate(candidate)).toThrow('memory budget');
  candidate.document.accessors[0].count = 1_000_000;
  candidate.document.accessors = Array.from({ length: 6 }, () => ({ ...candidate.document.accessors[0] }));
  expect(() => validate(candidate)).toThrow('memory budget');
});
it('rejects non-finite float storage and invalid normalization', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    const candidate = model(); new DataView(candidate.binary.buffer).setFloat32(16, value, true);
    expect(() => validate(candidate)).toThrow('Non-finite');
  }
  const candidate = model(); candidate.document.accessors[0].normalized = true;
  expect(() => validate(candidate)).toThrow('normalization');
});
it('validates sparse indices, replacement ranges and floating-point values', () => {
  function sparseModel() {
    const candidate = model();
    candidate.document.bufferViews = [{ buffer: 0, byteLength: 2 }, { buffer: 0, byteOffset: 4, byteLength: 24 }];
    candidate.document.accessors = [{ componentType: 5126, type: 'VEC3', count: 3,
      sparse: { count: 2, indices: { bufferView: 0, componentType: 5121 }, values: { bufferView: 1 } } }];
    candidate.binary[0] = 0; candidate.binary[1] = 2; return candidate;
  }
  expect(validate(sparseModel())[0].count).toBe(3);
  for (const index of [0, 3]) {
    const candidate = sparseModel(); candidate.binary[1] = index;
    expect(() => validate(candidate)).toThrow('Sparse indices');
  }
  const candidate = sparseModel(); new DataView(candidate.binary.buffer).setFloat32(4, NaN, true);
  expect(() => validate(candidate)).toThrow('Non-finite');
  candidate.binary.fill(0, 4); candidate.document.bufferViews[1].byteLength = 20;
  expect(() => validate(candidate)).toThrow('beyond');
});
it('accounts for padded matrix columns without requiring trailing padding', () => {
  const candidate = model(); candidate.document.bufferViews = [{ buffer: 0, byteLength: 11 }];
  candidate.document.accessors = [{ bufferView: 0, componentType: 5121, type: 'MAT3', count: 1 }];
  expect(validate(candidate)).toEqual([{ count: 1, components: 9, elementSize: 12 }]);
  candidate.document.bufferViews[0].byteLength = 10;
  expect(() => validate(candidate)).toThrow('beyond');
});
