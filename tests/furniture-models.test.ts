import { beforeEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { existsSync } from 'node:fs';
import { furnitureCatalog, getCatalogItem } from '$lib/utils/furnitureCatalog';
import { getModelFile } from '$lib/utils/furnitureModelFiles';

beforeEach(() => vi.resetModules());
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
function template() {
  const group = new THREE.Group();
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ color: '#dddddd', map: texture, roughness: 0.8 });
  const geometry = new THREE.BoxGeometry(2, 3, 4);
  const first = new THREE.Mesh(geometry, [material, material]); first.position.set(5, 8, -4);
  const second = new THREE.Mesh(geometry, material); second.position.set(-2, 4, 3);
  group.add(first, second);
  return { group, texture, material, geometry };
}
const firstMesh = (root: THREE.Object3D) => { let result: THREE.Mesh | undefined; root.traverse(child => { if (!result && child instanceof THREE.Mesh) result = child; }); return result!; };
const firstMaterial = (root: THREE.Object3D) => { const mat = firstMesh(root).material; return (Array.isArray(mat) ? mat[0] : mat) as THREE.MeshStandardMaterial; };

it('shares one lazy request while isolating geometry, materials and textures for every consumer', async () => {
  const source = template();
  const load = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue({ scene: source.group } as any);
  const { loadCatalogModel, disposeModel } = await import('$lib/utils/furnitureModelResources');
  expect(load).not.toHaveBeenCalled();
  const [thumbnail, placed] = await Promise.all([loadCatalogModel('loungeChair'), loadCatalogModel('loungeChair')]);
  expect(load).toHaveBeenCalledTimes(1);
  expect(firstMesh(thumbnail!).geometry).not.toBe(firstMesh(placed!).geometry);
  expect(firstMaterial(thumbnail!)).not.toBe(firstMaterial(placed!));
  expect(firstMaterial(thumbnail!).map).not.toBe(firstMaterial(placed!).map);
  firstMaterial(thumbnail!).color.set('#ff0000');
  expect(firstMaterial(placed!).color.getHexString()).toBe('dddddd');
  const sharedMaterial = firstMaterial(thumbnail!), sharedGeometry = firstMesh(thumbnail!).geometry;
  const materialDisposed = vi.spyOn(sharedMaterial, 'dispose'), geometryDisposed = vi.spyOn(sharedGeometry, 'dispose');
  const textureDisposed = vi.spyOn(sharedMaterial.map!, 'dispose'), sourceDisposed = vi.spyOn(source.geometry, 'dispose');
  disposeModel(thumbnail!); disposeModel(thumbnail!);
  expect(materialDisposed).toHaveBeenCalledTimes(1); expect(geometryDisposed).toHaveBeenCalledTimes(1); expect(textureDisposed).toHaveBeenCalledTimes(1);
  expect(sourceDisposed).not.toHaveBeenCalled();
  const later = await loadCatalogModel('loungeChair');
  expect(firstMaterial(later!).color.getHexString()).toBe('dddddd');
  expect(load).toHaveBeenCalledTimes(1);
  disposeModel(placed!); disposeModel(later!);
});

it('fits off-center nested models to fractional dimensions without changing the cached source', async () => {
  const { fitFurnitureModel } = await import('$lib/utils/furnitureModelLoader');
  const { cloneModel } = await import('$lib/utils/furnitureModelResources');
  const source = template().group, model = cloneModel(source);
  const before = new THREE.Box3().setFromObject(source);
  const def = { ...getCatalogItem('chair')!, width: 87.125, depth: 123.75, height: 95.5 };
  fitFurnitureModel(model, def);
  const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  expect(size.x).toBeCloseTo(def.width); expect(size.y).toBeCloseTo(def.height); expect(size.z).toBeCloseTo(def.depth);
  expect(center.x).toBeCloseTo(0); expect(center.z).toBeCloseTo(0); expect(bounds.min.y).toBeCloseTo(0);
  expect(new THREE.Box3().setFromObject(source)).toEqual(before);
});

it('retains tint and finish after GLB load without changing another instance or its original materials', async () => {
  const source = template(); vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue({ scene: source.group } as any);
  const { createFurnitureModelWithGLB } = await import('$lib/utils/furnitureModelLoader');
  const def = getCatalogItem('chair')!, loaded = vi.fn();
  const tinted = createFurnitureModelWithGLB('chair', { ...def, color: '#00ff00' }, loaded, { color: '#00ff00', material: 'Metal' });
  const original = createFurnitureModelWithGLB('chair', def);
  await settle();
  expect(loaded).toHaveBeenCalledTimes(1);
  expect(firstMaterial(tinted).color.getHexString()).toBe('00dd00');
  expect(firstMaterial(tinted).metalness).toBe(0.85); expect(firstMaterial(tinted).roughness).toBe(0.25);
  expect(firstMaterial(original).color.getHexString()).toBe('dddddd'); expect(firstMaterial(original).metalness).toBe(0);
  expect(source.material.color.getHexString()).toBe('dddddd');
});

it('keeps ghost and glass opacity through async replacement and for later cached instances', async () => {
  const source = template(); vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue({ scene: source.group } as any);
  const { createFurnitureModelWithGLB } = await import('$lib/utils/furnitureModelLoader');
  const ghost = createFurnitureModelWithGLB('chair', getCatalogItem('chair')!, undefined, { ghost: true, material: 'Glass' });
  expect(firstMaterial(ghost).opacity).toBeCloseTo(0.175);
  await settle();
  expect(firstMaterial(ghost).opacity).toBeCloseTo(0.175); expect(firstMaterial(ghost).depthWrite).toBe(false);
  expect(firstMaterial(ghost).emissive.getHexString()).toBe('4488ff');
  const normal = createFurnitureModelWithGLB('chair', getCatalogItem('chair')!);
  await settle(); expect(firstMaterial(normal).opacity).toBe(1); expect(firstMaterial(normal).transparent).toBe(false);
});

it('cannot revive a disposed scene when a shared model request finishes late', async () => {
  let finish!: (value: any) => void;
  vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { createFurnitureModelWithGLB } = await import('$lib/utils/furnitureModelLoader');
  const { disposeModel } = await import('$lib/utils/furnitureModelResources');
  const callback = vi.fn(), model = createFurnitureModelWithGLB('chair', getCatalogItem('chair')!, callback);
  const fallback = model.children[0], dispose = vi.spyOn(firstMesh(fallback).geometry, 'dispose');
  const scene = new THREE.Group(); scene.add(model); disposeModel(scene);
  finish({ scene: template().group }); await settle();
  expect(model.children).toEqual([fallback]); expect(callback).not.toHaveBeenCalled(); expect(dispose).toHaveBeenCalledTimes(1);
  const current = createFurnitureModelWithGLB('chair', getCatalogItem('chair')!, callback);
  await settle(); expect(callback).toHaveBeenCalledExactlyOnceWith(current);
});

it('keeps a valid fallback when a downloaded model has no usable dimensions', async () => {
  vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue({ scene: new THREE.Group() } as any);
  const { createFurnitureModelWithGLB } = await import('$lib/utils/furnitureModelLoader');
  const callback = vi.fn(), model = createFurnitureModelWithGLB('chair', getCatalogItem('chair')!, callback);
  const fallback = model.children[0], dispose = vi.spyOn(firstMesh(fallback).geometry, 'dispose');
  await settle(); expect(model.children).toEqual([fallback]); expect(dispose).not.toHaveBeenCalled(); expect(callback).not.toHaveBeenCalled();
});

it('does not retry failed assets on every scene edit', async () => {
  const load = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockRejectedValue(new Error('offline'));
  const { createFurnitureModelWithGLB } = await import('$lib/utils/furnitureModelLoader');
  for (let i = 0; i < 3; i++) { const model = createFurnitureModelWithGLB('chair', getCatalogItem('chair')!); await settle(); expect(model.children).toHaveLength(1); }
  expect(load).toHaveBeenCalledTimes(1);
});

it('uses existing shared catalog mappings and a procedural fireplace instead of a toaster', async () => {
  for (const item of furnitureCatalog) { const file = getModelFile(item.id); if (file) expect(existsSync(`static/models/${file}.glb`), item.id).toBe(true); }
  expect(getModelFile('toString')).toBeNull(); expect(getModelFile('fireplace')).toBeNull();
  const load = vi.spyOn(GLTFLoader.prototype, 'loadAsync');
  const { createFurnitureModelWithGLB } = await import('$lib/utils/furnitureModelLoader');
  const model = createFurnitureModelWithGLB('fireplace', getCatalogItem('fireplace')!);
  await settle(); expect(load).not.toHaveBeenCalled(); expect(model.children[0].children.length).toBeGreaterThan(1);
});


it.each([false, true])('renders unknown saved furniture with exact world bounds (overrides=%s)', async overrides => {
  const load = vi.spyOn(GLTFLoader.prototype, 'loadAsync');
  const { createPlacedFurnitureModel } = await import('$lib/utils/furnitureModelLoader');
  const item = { id: 'missing', catalogId: 'unavailable-model', position: { x: 100, y: -200 },
    rotation: 30, scale: { x: -2, y: 0.5, z: 1.5 }, color: '#ff00ff',
    ...(overrides ? { width: 160, depth: 80, height: 90 } : {}) };
  const before = structuredClone(item), model = createPlacedFurnitureModel(item)!;
  const width = overrides ? 320 : 100, depth = overrides ? 40 : 25, height = overrides ? 135 : 75;
  const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
  expect(size.x).toBeCloseTo(width*Math.cos(Math.PI/6) + depth*0.5);
  expect(size.z).toBeCloseTo(width*0.5 + depth*Math.cos(Math.PI/6));
  expect(size.y).toBeCloseTo(height);
  expect(bounds.min.y).toBeCloseTo(1.5);
  expect(bounds.getCenter(new THREE.Vector3()).x).toBeCloseTo(100);
  expect(bounds.getCenter(new THREE.Vector3()).z).toBeCloseTo(-200);
  expect(firstMaterial(model).color.getHexString()).toBe('ff00ff');
  expect(firstMesh(model).castShadow).toBe(true);
  expect(load).not.toHaveBeenCalled();
  expect(item).toEqual(before);
});

it('continues omitting explicitly 2D-only catalog symbols from placed 3D furniture', async () => {
  const { createPlacedFurnitureModel } = await import('$lib/utils/furnitureModelLoader');
  const symbol = furnitureCatalog.find(item => item.symbol)!;
  expect(createPlacedFurnitureModel({ id: 'symbol', catalogId: symbol.id, position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1, z: 1 } })).toBeNull();
});

it('retries a failed model after a cooldown and shares the recovered source', async () => {
  let now = 0;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  const source = template();
  const load = vi.spyOn(GLTFLoader.prototype, 'loadAsync')
    .mockRejectedValueOnce(new Error('temporary network failure'))
    .mockResolvedValue({ scene: source.group } as any);
  const { createFurnitureModelWithGLB } = await import('$lib/utils/furnitureModelLoader');
  const originalLoaded = vi.fn();
  const original = createFurnitureModelWithGLB('chair', getCatalogItem('chair')!, originalLoaded);
  const fallback = original.children[0];
  await settle();
  now = 29_999;
  createFurnitureModelWithGLB('chair', getCatalogItem('chair')!);
  await settle();
  expect(load).toHaveBeenCalledTimes(1);
  expect(original.children).toEqual([fallback]);
  now = 30_001;
  const loaded = vi.fn();
  const a = createFurnitureModelWithGLB('chair', getCatalogItem('chair')!, loaded);
  const b = createFurnitureModelWithGLB('chair', getCatalogItem('chair')!, loaded);
  await settle();
  expect(load).toHaveBeenCalledTimes(2);
  expect(loaded).toHaveBeenCalledTimes(2);
  expect(firstMesh(a).geometry).not.toBe(firstMesh(b).geometry);
  expect(firstMesh(a).geometry).not.toBe(source.geometry);
  createFurnitureModelWithGLB('chair', getCatalogItem('chair')!);
  await settle();
  expect(load).toHaveBeenCalledTimes(2);
  expect(original.children).toEqual([fallback]);
  expect(originalLoaded).not.toHaveBeenCalled();
});
