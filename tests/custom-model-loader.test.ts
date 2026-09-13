import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { Mesh, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { loadLocalGLBModel } from '$lib/services/customModelLoader';
import { readLocalGLB } from '$lib/utils/localGLB';
import { repackLocalGLBGeometry } from '$lib/utils/localGLBRepack';

const original = new Uint8Array(readFileSync('tests/fixtures/local-model-textured-box.glb'));
function variant(change: (document: Record<string, any>) => void) {
  const container = readLocalGLB(original); change(container.document);
  return new Uint8Array(repackLocalGLBGeometry(container));
}
function image() {
  const bitmap = { width: 32, height: 24, close: vi.fn() };
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
  return bitmap;
}
afterEach(() => vi.unstubAllGlobals());

it('loads embedded geometry and textures with actual world bounds and owned cleanup', async () => {
  const bitmap = image(), network = vi.fn(() => { throw new Error('Network forbidden'); });
  vi.stubGlobal('fetch', network);
  const before = original.slice(), result = await loadLocalGLBModel(original);
  expect(result.dimensions).toEqual({ width: 1, depth: 0.75, height: 0.5 });
  expect(result.bounds.min.toArray()).toEqual([-0.5, 0, -0.375]);
  const mesh = result.scene.children[0] as Mesh, material = mesh.material as MeshStandardMaterial;
  expect(mesh.geometry.index!.count).toBe(36);
  expect(material.map!.image).toBe(bitmap);
  expect(material.map!.colorSpace).toBe(SRGBColorSpace);
  expect(material.map!.flipY).toBe(false);
  const geometryDisposed = vi.fn(), materialDisposed = vi.fn(), textureDisposed = vi.fn();
  mesh.geometry.addEventListener('dispose', geometryDisposed);
  material.addEventListener('dispose', materialDisposed); material.map!.addEventListener('dispose', textureDisposed);
  result.dispose(); result.dispose();
  for (const callback of [geometryDisposed, materialDisposed, textureDisposed, bitmap.close]) expect(callback).toHaveBeenCalledTimes(1);
  expect(network).not.toHaveBeenCalled(); expect(original).toEqual(before);
});
it('rejects unsupported dynamic features before decoding any textures', async () => {
  const decoder = vi.fn(); vi.stubGlobal('createImageBitmap', decoder);
  for (const field of ['animations', 'skins', 'cameras']) {
    await expect(loadLocalGLBModel(variant(document => { document[field] = [{}]; }))).rejects.toThrow(field);
  }
  await expect(loadLocalGLBModel(variant(document => { document.extensionsUsed = ['KHR_draco_mesh_compression']; }))).rejects.toThrow('not supported');
  expect(decoder).not.toHaveBeenCalled();
});
it('rejects invalid transforms before loading and cleans up decoded images on invalid final bounds', async () => {
  image();
  await expect(loadLocalGLBModel(variant(document => { document.nodes[0].rotation = [0, 0, 0, 2]; }))).rejects.toThrow('unit quaternion');
  const bitmap = image();
  await expect(loadLocalGLBModel(variant(document => { document.nodes[0].translation = [2_000_000, 0, 0]; }))).rejects.toThrow('bounds');
  expect(bitmap.close).toHaveBeenCalledTimes(1);
});
it('supports untextured models without bitmap APIs and respects cancellation', async () => {
  vi.stubGlobal('createImageBitmap', undefined);
  const plain = variant(document => {
    delete document.images; delete document.textures; delete document.materials;
    delete document.meshes[0].primitives[0].material;
  });
  const result = await loadLocalGLBModel(plain); expect(result.dimensions.width).toBe(1); result.dispose();
  const controller = new AbortController(); controller.abort();
  await expect(loadLocalGLBModel(plain, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
});
