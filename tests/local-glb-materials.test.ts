import { expect, it } from 'vitest';
import { validateLocalGLBMaterials as validate } from '$lib/utils/localGLBMaterials';

function model() {
  const binary = new Uint8Array(24), view = new DataView(binary.buffer);
  view.setUint32(0, 0x89504e47); view.setUint32(4, 0x0d0a1a0a); view.setUint32(12, 0x49484452);
  view.setUint32(16, 8); view.setUint32(20, 8);
  return { binary, document: {
    buffers: [{ byteLength: 24 }], bufferViews: [{ buffer: 0, byteLength: 24 }], images: [{ bufferView: 0, mimeType: 'image/png' }],
    textures: [{ source: 0 }], materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 0.5, 0, 1], baseColorTexture: { index: 0 } } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }],
  } as Record<string, any> };
}
it('accepts core textured materials and absent material defaults without mutation', () => {
  const candidate = model(), before = structuredClone(candidate);
  expect(validate(candidate)).toEqual({ materials: 1, textures: 1, materialUVs: [[0]] });
  expect(candidate).toEqual(before);
  expect(validate({ document: {} })).toEqual({ materials: 0, textures: 0, materialUVs: [] });
});
it('rejects invalid image, sampler, texture and material references', () => {
  for (const mutate of [
    (d: any) => d.textures[0].source = 1,
    (d: any) => d.textures[0].sampler = 0,
    (d: any) => d.materials[0].pbrMetallicRoughness.baseColorTexture.index = '0',
    (d: any) => d.meshes[0].primitives[0].material = -1,
  ]) { const candidate = model(); mutate(candidate.document); expect(() => validate(candidate)).toThrow('reference'); }
});
it('checks sampler enums and allows all core filtering and wrap modes', () => {
  const candidate = model(); candidate.document.samplers = [{ magFilter: 9728, minFilter: 9987, wrapS: 33071, wrapT: 33648 }];
  candidate.document.textures[0].sampler = 0;
  expect(() => validate(candidate)).not.toThrow();
  candidate.document.samplers[0].magFilter = 9987;
  expect(() => validate(candidate)).toThrow('magnification');
});
it('rejects malformed and out-of-range material factors', () => {
  for (const material of [
    { pbrMetallicRoughness: null }, { pbrMetallicRoughness: { baseColorFactor: [1, 1, 1] } },
    { pbrMetallicRoughness: { metallicFactor: 2 } }, { pbrMetallicRoughness: { roughnessFactor: NaN } },
    { emissiveFactor: [0, -1, 0] }, { alphaMode: 'transparent' }, { alphaCutoff: -1 }, { doubleSided: 1 },
    { normalTexture: { index: 0, scale: Infinity } }, { occlusionTexture: { index: 0, strength: 2 } },
  ]) { const candidate = model(); candidate.document.materials = [material]; expect(() => validate(candidate)).toThrow('Invalid GLB material'); }
});
it('requires the UV channel referenced by each textured material', () => {
  const candidate = model(); candidate.document.materials[0].pbrMetallicRoughness.baseColorTexture.texCoord = 1;
  expect(() => validate(candidate)).toThrow('missing its texture coordinates');
  candidate.document.meshes[0].primitives[0].attributes.TEXCOORD_1 = 2;
  expect(validate(candidate).materialUVs).toEqual([[1]]);
  candidate.document.materials[0].pbrMetallicRoughness.baseColorTexture.texCoord = 4;
  expect(() => validate(candidate)).toThrow('sets 0 through 3');
});
it('bounds tables and rejects external images before material handling', () => {
  const candidate = model(); candidate.document.textures = Array.from({ length: 65 }, () => ({ source: 0 }));
  expect(() => validate(candidate)).toThrow('texture table');
  candidate.document.textures = [{ source: 0 }]; candidate.document.images[0].uri = 'https://example.com/image.png';
  expect(() => validate(candidate)).toThrow('Embed all');
});
