/** Lazy GLB furniture with an immediate procedural fallback. */
import * as THREE from 'three';
import { createFurnitureModel } from './furnitureModels3d';
import { getCatalogItem, type FurnitureDef } from './furnitureCatalog';
import type { FurnitureItem } from '$lib/models/types';
import { getModelFile } from './furnitureModelFiles';
import { furnitureFinishes } from './furnitureFinishes';
import { disposeModel, isModelDisposed, loadCatalogModel } from './furnitureModelResources';

export interface FurnitureAppearance { color?: string; material?: string; ghost?: boolean }

function applyAppearance(model: THREE.Group, appearance: FurnitureAppearance, tint: boolean) {
  const seen = new Set<THREE.Material>();
  model.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (seen.has(material)) continue;
      seen.add(material);
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      // A tint keeps the source model's texture and contrasting material detail.
      if (tint && appearance.color) material.color.multiply(new THREE.Color(appearance.color));
      const finish = appearance.material && Object.hasOwn(furnitureFinishes, appearance.material) ? furnitureFinishes[appearance.material] : undefined;
      if (finish) {
        material.roughness = finish.roughness; material.metalness = finish.metalness;
        if (finish.opacity !== undefined) {
          material.opacity *= finish.opacity; material.transparent = true; material.depthWrite = false;
        }
      }
      if (appearance.ghost) {
        material.transparent = true; material.opacity *= 0.5; material.depthWrite = false;
        material.emissive.set(0x4488ff); material.emissiveIntensity = 0.3;
      }
    }
  });
}

/** Match the complete model's footprint, center it, and place its bottom at zero. */
export function fitFurnitureModel(model: THREE.Group, def: FurnitureDef) {
  const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
  if ([size.x, size.y, size.z, def.width, def.height, def.depth].some(value => !Number.isFinite(value) || value <= 0)) {
    throw new Error('Furniture model has invalid dimensions.');
  }
  model.scale.multiply(new THREE.Vector3(def.width / size.x, def.height / size.y, def.depth / size.z));
  model.updateMatrixWorld(true);
  bounds.setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
  model.updateMatrixWorld(true);
}

export function createFurnitureModelWithGLB(
  catalogId: string, def: FurnitureDef, onLoaded?: (model: THREE.Group) => void,
  appearance: FurnitureAppearance = {},
): THREE.Group {
  const container = new THREE.Group();
  container.name = `furniture_${catalogId}`;
  const procedural = createFurnitureModel(catalogId, def);
  applyAppearance(procedural, appearance, false);
  container.add(procedural);
  const file = getModelFile(catalogId);
  if (file) void loadCatalogModel(file).then(model => {
    if (!model) return;
    if (isModelDisposed(container)) { disposeModel(model); return; }
    try {
      fitFurnitureModel(model, def);
      applyAppearance(model, appearance, true);
    } catch {
      disposeModel(model);
      return; // The original fallback remains intact and usable.
    }
    container.remove(procedural); disposeModel(procedural);
    container.add(model);
    onLoaded?.(container);
  }).catch(error => { console.warn(`[FurnitureLoader] Model unavailable for ${catalogId}:`, error); });
  return container;
}


/** Build a saved item even when its original catalog is unavailable. */
export function createPlacedFurnitureModel(item: FurnitureItem, onLoaded?: (model: THREE.Group) => void): THREE.Group | null {
  const catalog = getCatalogItem(item.catalogId);
  if (catalog?.symbol) return null;
  const definition: FurnitureDef = {
    id: item.catalogId, name: 'Unknown furniture', category: 'Unknown', icon: '🪑',
    ...catalog,
    width: item.width ?? catalog?.width ?? 50,
    depth: item.depth ?? catalog?.depth ?? 50,
    height: item.height ?? catalog?.height ?? 50,
    color: item.color ?? catalog?.color ?? '#888888',
  };
  const model = createFurnitureModelWithGLB(item.catalogId, definition, onLoaded, {
    color: item.color, material: item.material,
  });
  model.position.set(item.position.x, 1.5, item.position.y);
  model.rotation.y = -item.rotation * Math.PI / 180;
  // The plan's Y scale is world Z; height uses the saved Z magnitude.
  model.scale.set(item.scale?.x ?? 1, Math.abs(item.scale?.z ?? 1), item.scale?.y ?? 1);
  return model;
}
