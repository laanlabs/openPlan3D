import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { catalogAssetUrl } from './catalogAssetUrl';

const loader = new GLTFLoader();
// Only bundled catalog filenames reach this cache. Templates live for the page session;
// thumbnails and placed instances own their disposable geometry, materials and textures.
const sources = new Map<string, Promise<THREE.Group | null>>();
const retryAfter = new Map<string, number>();
const MODEL_RETRY_DELAY_MS = 30_000;
const disposed = new WeakSet<THREE.Object3D>();
const ownedTextures = new WeakSet<THREE.Texture>();
const releases = new WeakMap<THREE.Object3D, Set<() => void>>();

/** Attach source-lifetime cleanup to the same disposal path as scene resources. */
export function releaseWithModel(root: THREE.Object3D, release: () => void) {
  if (disposed.has(root)) { release(); return; }
  let callbacks = releases.get(root);
  if (!callbacks) { callbacks = new Set(); releases.set(root, callbacks); }
  callbacks.add(release);
}

/** Register an instance-owned texture wrapper. Its image/canvas may still be
 * shared; disposing a THREE.Texture releases GPU state without destroying it. */
export function ownTexture<T extends THREE.Texture>(texture: T): T {
  ownedTextures.add(texture);
  return texture;
}

export function cloneModel(source: THREE.Group): THREE.Group {
  const clone = source.clone(true);
  const geometries = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  const materials = new Map<THREE.Material, THREE.Material>();
  const textures = new Map<THREE.Texture, THREE.Texture>();
  const material = (original: THREE.Material) => {
    if (materials.has(original)) return materials.get(original)!;
    const result = original.clone();
    for (const [key, value] of Object.entries(result)) if (value instanceof THREE.Texture) {
      if (!textures.has(value)) { const copy = ownTexture(value.clone()); textures.set(value, copy); }
      (result as any)[key] = textures.get(value);
    }
    materials.set(original, result);
    return result;
  };
  clone.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    const original = child.geometry;
    if (!geometries.has(original)) geometries.set(original, original.clone());
    child.geometry = geometries.get(original)!;
    child.material = Array.isArray(child.material) ? child.material.map(material) : material(child.material);
    child.castShadow = true; child.receiveShadow = true;
  });
  return clone;
}

/** Failed files retain a fallback during cooldown; a later request may retry. */
export async function loadCatalogModel(file: string): Promise<THREE.Group | null> {
  const retryAt = retryAfter.get(file);
  if (retryAt !== undefined && Date.now() >= retryAt) {
    retryAfter.delete(file);
    sources.delete(file);
  }
  if (!sources.has(file)) sources.set(file, loader.loadAsync(catalogAssetUrl(`/models/${file}.glb`))
    .then(gltf => gltf.scene).catch(() => {
      retryAfter.set(file, Date.now() + MODEL_RETRY_DELAY_MS);
      return null;
    }));
  const source = await sources.get(file)!;
  return source ? cloneModel(source) : null;
}

export function isModelDisposed(root: THREE.Object3D) { return disposed.has(root); }

/** Also marks pending furniture containers so late model loads cannot revive them.
 * Unregistered shared textures retain their original owner. */
export function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const callbacks = new Set<() => void>();
  root.traverse(child => {
    if (disposed.has(child)) return;
    disposed.add(child);
    for (const release of releases.get(child) ?? []) callbacks.add(release);
    releases.delete(child);
    const renderable = child as THREE.Mesh;
    if (renderable.geometry) geometries.add(renderable.geometry);
    if (renderable.material) for (const material of Array.isArray(renderable.material) ? renderable.material : [renderable.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture && ownedTextures.has(value)) textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) { ownedTextures.delete(texture); texture.dispose(); }
  for (const release of callbacks) release();
}
