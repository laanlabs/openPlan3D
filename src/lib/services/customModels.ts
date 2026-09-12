import type { Project } from '$lib/models/types';
import { readProject } from '$lib/utils/projectValidation';
import { deleteUnusedPhoto, usedPhotoNames } from './itemPhotos';

/** Remove an unused model definition and its otherwise unreferenced source.
 * The input and existing saved snapshots are untouched. The caller must commit
 * the returned project through the normal undo/save/storage transaction. */
export function removeCustomModel(project: Project, id: string): Project {
  const next = readProject(project);
  const model = next.customModels?.find(model => model.id === id);
  if (!model) throw new Error('This custom model is no longer defined in the project.');
  if (next.floors.some(floor => floor.furniture.some(item => item.customModelId === id))) {
    throw new Error('Remove this model’s placed furniture before removing its definition.');
  }
  next.customModels = next.customModels!.filter(model => model.id !== id);
  if (!next.customModels.length) delete next.customModels;
  if (next.projectPackage?.assets[`assets/${model.assetName}`] !== undefined && !usedPhotoNames(next).has(model.assetName)) {
    return deleteUnusedPhoto(next, model.assetName);
  }
  return next;
}

/** Place a retained model using a portable procedural fallback and explicit sizes. */
export function placeCustomModel(project: Project, id: string, position: { x: number; y: number }): Project {
  const next = readProject(project);
  const model = next.customModels?.find(model => model.id === id);
  const floor = next.floors.find(floor => floor.id === next.activeFloorId);
  if (!model || !floor) throw new Error('This custom model or floor is no longer available.');
  if (![position.x, position.y].every(value => Number.isFinite(value) && Math.abs(value) <= 1_000_000)) throw new Error('Choose a position inside the supported plan area.');
  floor.furniture.push({ id: crypto.randomUUID(), catalogId: 'custom-model', customModelId: id,
    position: { ...position }, rotation: 0, scale: { x: 1, y: 1, z: 1 },
    width: model.width, depth: model.depth, height: model.height });
  return readProject(next);
}
