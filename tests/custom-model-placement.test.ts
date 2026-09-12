import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { roomProject } from './fixtures/project';
import { webToNative } from '$lib/utils/projectPackageBridge';
import { acquireCustomModel } from '$lib/services/customModelResources';
import { disposeModel, releaseWithModel } from '$lib/utils/furnitureModelResources';
import { createPlacedFurnitureModel } from '$lib/utils/furnitureModelLoader';
import { sceneSignature } from '$lib/utils/sceneSignature';

const bytes = readFileSync('tests/fixtures/local-model-textured-box.glb');
const sha256 = createHash('sha256').update(bytes).digest('hex');
function project() {
  const value = roomProject(), { plan, mapping } = webToNative(value, undefined);
  value.customModels = [{ id: 'box', name: 'Box', assetName: 'box.glb', sourceFilename: 'box.glb', sha256,
    byteLength: bytes.length, width: 100, depth: 75, height: 50 }];
  value.projectPackage = { version: 1, native: plan, mapping, assets: { 'assets/box.glb': bytes.toString('base64') } };
  return value;
}
const item = () => ({ id: 'placed', catalogId: 'custom-fallback', customModelId: 'box', width: 100, depth: 75, height: 50,
  position: { x: 250, y: 300 }, rotation: 90, scale: { x: 2, y: 3, z: 4 } });
let close: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto); close = vi.fn();
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 32, height: 24, close }));
});
afterEach(() => vi.unstubAllGlobals());

it('shares decoded images until both independent instances and their GPU resources are released', async () => {
  const value = project(), first = acquireCustomModel(value, 'box'), second = acquireCustomModel(value, 'box');
  const a = (await first.model)!, b = (await second.model)!;
  const meshA = a.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  const meshB = b.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  expect(createImageBitmap).toHaveBeenCalledTimes(1);
  expect(meshA.geometry).not.toBe(meshB.geometry);
  expect(meshA.material.map).not.toBe(meshB.material.map);
  expect(meshA.material.map!.image).toBe(meshB.material.map!.image);
  const textureDisposed = vi.fn(); meshB.material.map!.addEventListener('dispose', textureDisposed);
  close.mockImplementation(() => expect(textureDisposed).toHaveBeenCalledTimes(1));
  releaseWithModel(a, first.release); releaseWithModel(b, second.release);
  const scene = new THREE.Group(); scene.add(a, b);
  disposeModel(a); expect(close).not.toHaveBeenCalled();
  disposeModel(scene); disposeModel(scene);
  expect(close).toHaveBeenCalledTimes(1);
});
it('fits original geometry in centimeters and preserves saved position, rotation and axis scales', async () => {
  const saved = item(), before = structuredClone(saved), loaded = vi.fn();
  const model = createPlacedFurnitureModel(saved, loaded, project())!;
  const fallback = model.children[0];
  await vi.waitFor(() => expect(loaded).toHaveBeenCalledTimes(1));
  expect(model.children[0]).not.toBe(fallback);
  expect(model.position.toArray()).toEqual([250, 1.5, 300]);
  expect(model.rotation.y).toBe(-Math.PI / 2);
  expect(model.scale.toArray()).toEqual([2, 4, 3]);
  const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
  expect(size.x).toBeCloseTo(225); expect(size.y).toBeCloseTo(200); expect(size.z).toBeCloseTo(200);
  expect(bounds.min.y).toBeCloseTo(1.5);
  expect(saved).toEqual(before);
  disposeModel(model); expect(close).toHaveBeenCalledTimes(1);
});
it('removal during decoding closes the late bitmap and cannot revive a disposed container', async () => {
  let finish!: (bitmap: unknown) => void;
  vi.stubGlobal('createImageBitmap', vi.fn(() => new Promise(resolve => { finish = resolve; })));
  const loaded = vi.fn(), model = createPlacedFurnitureModel(item(), loaded, project())!;
  await vi.waitFor(() => expect(createImageBitmap).toHaveBeenCalledTimes(1));
  const children = [...model.children]; disposeModel(model);
  finish({ width: 32, height: 24, close });
  await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(loaded).not.toHaveBeenCalled(); expect(model.children).toEqual(children);
});
it('invalidates rendered definitions without serializing retained source bytes', () => {
  const value = project(), signature = sceneSignature(value, value.floors[0], false, 'metric');
  expect(signature).not.toContain(bytes.toString('base64'));
  value.customModels![0].sha256 = '0'.repeat(64);
  expect(sceneSignature(value, value.floors[0], false, 'metric')).not.toBe(signature);
});

it('uses definition dimensions when saved furniture omits size overrides', async () => {
  const { width, depth, height, ...saved } = item();
  saved.rotation = 0; saved.scale = { x: 1, y: 1, z: 1 };
  const loaded = vi.fn(), model = createPlacedFurnitureModel(saved, loaded, project())!;
  await vi.waitFor(() => expect(loaded).toHaveBeenCalledTimes(1));
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  expect(size.toArray()).toEqual([100, 50, 75]);
  disposeModel(model);
});

it('keeps a shared pending decode alive when only one consumer releases', async () => {
  let finish!: (bitmap: unknown) => void;
  vi.stubGlobal('createImageBitmap', vi.fn(() => new Promise(resolve => { finish = resolve; })));
  const value = project(), a = acquireCustomModel(value, 'box'), b = acquireCustomModel(value, 'box');
  await vi.waitFor(() => expect(createImageBitmap).toHaveBeenCalledTimes(1));
  a.release(); finish({ width: 32, height: 24, close });
  expect(await a.model).toBeNull();
  const model = (await b.model)!;
  expect(model).toBeInstanceOf(THREE.Group); expect(close).not.toHaveBeenCalled();
  releaseWithModel(model, b.release); disposeModel(model);
  expect(close).toHaveBeenCalledTimes(1);
});
it('does not reuse an active verified source after same-project attachment corruption', async () => {
  const value = project(), first = acquireCustomModel(value, 'box'), original = (await first.model)!;
  value.projectPackage!.assets['assets/box.glb'] = 'AAAA' + value.projectPackage!.assets['assets/box.glb'].slice(4);
  const changed = acquireCustomModel(value, 'box');
  await expect(changed.model).rejects.toThrow('damaged'); changed.release();
  expect(close).not.toHaveBeenCalled();
  releaseWithModel(original, first.release); disposeModel(original);
  expect(close).toHaveBeenCalledTimes(1);
});
