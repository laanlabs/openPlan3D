import { expect, it } from 'vitest';
import { validateLocalGLBGeometry as validate } from '$lib/utils/localGLBGeometry';
import { validateLocalGLBAccessors, visitValidatedLocalGLBAccessor } from '$lib/utils/localGLBAccessors';

function triangle() {
  const binary = new Uint8Array(40);
  const floats = new DataView(binary.buffer);
  [0, 0, 0, 2, 0, 0, 0, 3, 0].forEach((value, i) => floats.setFloat32(i * 4, value, true));
  binary.set([0, 1, 2], 36);
  return { binary, document: {
    buffers: [{ byteLength: 40 }], bufferViews: [{ buffer: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 3 }],
    accessors: [{ bufferView: 0, componentType: 5126, type: 'VEC3', count: 3 }, { bufferView: 1, componentType: 5121, type: 'SCALAR', count: 3 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }], nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }],
  } as Record<string, any> };
}
it('computes bounds from actual indexed and non-indexed position bytes', () => {
  const candidate = triangle();
  expect(validate(candidate).meshes[0][0]).toEqual({ mode: 4, count: 3, bounds: { min: [0, 0, 0], max: [2, 3, 0] } });
  delete candidate.document.meshes[0].primitives[0].indices;
  expect(validate(candidate).meshes[0][0].count).toBe(3);
});
it('rejects out-of-range indices, primitive restart and invalid draw counts', () => {
  for (const index of [3, 255]) {
    const candidate = triangle(); candidate.binary[38] = index;
    expect(() => validate(candidate)).toThrow('index points outside');
  }
  for (const mode of [1, -1, 7, null]) {
    const candidate = triangle(); candidate.document.meshes[0].primitives[0].mode = mode;
    expect(() => validate(candidate)).toThrow('draw mode');
  }
});
it('rejects mismatched attribute counts and invalid semantic formats', () => {
  const candidate = triangle(); candidate.document.meshes[0].primitives[0].attributes.NORMAL = 1;
  expect(() => validate(candidate)).toThrow('NORMAL');
  candidate.document.accessors[1].count = 2;
  expect(() => validate(candidate)).toThrow('counts do not match');
  delete candidate.document.meshes[0].primitives[0].attributes.NORMAL;
  candidate.document.accessors[0].type = 'VEC4';
  expect(() => validate(candidate)).toThrow();
});
it('reads sparse overrides and zero initialization without allocating full arrays', () => {
  const candidate = triangle();
  candidate.document.accessors[0] = { componentType: 5126, type: 'VEC3', count: 3,
    sparse: { count: 1, indices: { bufferView: 1, componentType: 5121 }, values: { bufferView: 0 } } };
  candidate.binary[36] = 2;
  new DataView(candidate.binary.buffer).setFloat32(0, 5, true);
  delete candidate.document.meshes[0].primitives[0].indices;
  expect(validate(candidate).meshes[0][0].bounds.max).toEqual([5, 0, 0]);
  const collected: number[][] = [];
  validateLocalGLBAccessors(candidate);
  visitValidatedLocalGLBAccessor(candidate, 0, values => collected.push([...values]));
  expect(collected).toEqual([[0, 0, 0], [0, 0, 0], [5, 0, 0]]);
});
it('checks morph target consistency and weights', () => {
  const candidate = triangle(); candidate.document.meshes[0].primitives[0].targets = [{ POSITION: 0 }];
  candidate.document.meshes[0].weights = [0.5];
  expect(() => validate(candidate)).not.toThrow();
  candidate.document.meshes[0].weights = [0.5, 1];
  expect(() => validate(candidate)).toThrow('morph weights');
  delete candidate.document.meshes[0].weights;
  candidate.document.meshes[0].primitives.push({ attributes: { POSITION: 0 } });
  expect(() => validate(candidate)).toThrow('Morph target counts');
});
it('rejects excessive coordinates even when JSON bounds claim small values', () => {
  const candidate = triangle(); candidate.document.accessors[0].min = [0, 0, 0]; candidate.document.accessors[0].max = [1, 1, 1];
  new DataView(candidate.binary.buffer).setFloat32(0, 2_000_000, true);
  expect(() => validate(candidate)).toThrow('coordinate range');
});
