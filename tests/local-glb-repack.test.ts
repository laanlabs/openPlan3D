import { expect, it } from 'vitest';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Mesh, Points } from 'three';
import { repackLocalGLBGeometry } from '$lib/utils/localGLBRepack';
import { readLocalGLB } from '$lib/utils/localGLB';

function model() {
  const binary = new Uint8Array(44), view = new DataView(binary.buffer);
  [1, 2, 3].forEach((v, i) => view.setFloat32(i * 4, v, true));
  [4, 5, 6].forEach((v, i) => view.setFloat32(16 + i * 4, v, true));
  binary[28] = 1;
  [7, 8, 9].forEach((v, i) => view.setFloat32(32 + i * 4, v, true));
  return { binary, document: {
    asset: { version: '2.0' }, buffers: [{ byteLength: 44 }],
    bufferViews: [{ buffer: 0, byteLength: 28, byteStride: 16 }, { buffer: 0, byteOffset: 28, byteLength: 1 }, { buffer: 0, byteOffset: 32, byteLength: 12 }],
    accessors: [{ bufferView: 0, componentType: 5126, type: 'VEC3', count: 2, min: [-999, -999, -999], max: [999, 999, 999],
      sparse: { count: 1, indices: { bufferView: 1, componentType: 5121 }, values: { bufferView: 2 } } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, mode: 0 }] }], nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }],
  } as Record<string, any> };
}
it('loads sparse interleaved geometry with omitted trailing padding faithfully', async () => {
  const candidate = model(), before = structuredClone(candidate);
  const bytes = repackLocalGLBGeometry(candidate);
  const gltf = await new GLTFLoader().parseAsync(bytes, '');
  const points = gltf.scene.children[0] as Points;
  expect(points.isPoints).toBe(true);
  expect(Array.from(points.geometry.getAttribute('position').array)).toEqual([1, 2, 3, 7, 8, 9]);
  expect(points.geometry.boundingBox?.min.toArray()).toEqual([1, 2, 3]);
  expect(points.geometry.boundingBox?.max.toArray()).toEqual([7, 8, 9]);
  expect(candidate).toEqual(before);
  points.geometry.dispose(); (points.material as Mesh['material'] & { dispose(): void }).dispose();
});
it('preserves embedded original bytes while replacing stale accessor metadata', () => {
  const candidate = model(); const result = readLocalGLB(new Uint8Array(repackLocalGLBGeometry(candidate)));
  expect(result.binary!.subarray(0, 44)).toEqual(candidate.binary);
  expect(result.document.accessors[0]).toMatchObject({ min: [1, 2, 3], max: [7, 8, 9] });
  expect(result.document.accessors[0].sparse).toBeUndefined();
  expect(result.document.bufferViews[result.document.accessors[0].bufferView].byteStride).toBeUndefined();
});
it('converts padded integer matrices to dense float matrices without changing values', () => {
  const candidate = model();
  candidate.document.accessors.push({ bufferView: 0, componentType: 5121, type: 'MAT3', count: 1 });
  const result = readLocalGLB(new Uint8Array(repackLocalGLBGeometry(candidate)));
  const accessor = result.document.accessors[1];
  const range = result.document.bufferViews[accessor.bufferView];
  const values = new Float32Array(result.binary!.buffer, result.binary!.byteOffset + range.byteOffset, 9);
  expect(accessor.componentType).toBe(5126);
  expect(Array.from(values)).toEqual([0, 0, 128, 0, 0, 0, 0, 0, 64]);
});
