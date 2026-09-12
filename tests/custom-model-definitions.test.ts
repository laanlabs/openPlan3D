import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { roomProject } from './fixtures/project';
import { readProject } from '$lib/utils/projectValidation';
import { webToNative } from '$lib/utils/projectPackageBridge';
import { projectPackageBytes, readProjectPackage } from '$lib/services/projectPackage';
import { usedPhotoNames, deleteUnusedPhoto } from '$lib/services/itemPhotos';
import type { CustomModelDef } from '$lib/models/types';

const bytes = readFileSync('tests/fixtures/local-model-textured-box.glb');
const definition: CustomModelDef = { id: 'fixture-model', name: 'Fixture box', assetName: 'fixture-box.glb',
  sourceFilename: 'local-model-textured-box.glb', sha256: createHash('sha256').update(bytes).digest('hex'),
  byteLength: bytes.length, width: 100, depth: 75, height: 50, attribution: 'Generated test geometry',
  sourceUrl: 'https://example.com/model-source' };
function modelProject() {
  const project = roomProject();
  project.customModels = [structuredClone(definition)];
  project.floors[0].furniture.push({ id: 'fixture-instance', catalogId: 'imported_object', customModelId: definition.id,
    sourceCategory: 'Fixture box', position: { x: 200, y: 100 }, rotation: 0, scale: { x: 1, y: 1, z: 1 },
    width: 100, depth: 75, height: 50 });
  const { plan, mapping } = webToNative(project, undefined);
  project.projectPackage = { version: 1, furnitureCategoriesVersion: 1, native: plan, mapping,
    assets: { [`assets/${definition.assetName}`]: bytes.toString('base64') } };
  return project;
}

it('preserves definitions, provenance, dimensions and furniture references through a package return', () => {
  const project = modelProject(), before = structuredClone(project);
  const reopened = readProjectPackage(projectPackageBytes(project)).project;
  expect(reopened.customModels).toEqual([definition]);
  expect(reopened.floors[0].furniture.find(item => item.id === 'fixture-instance')).toMatchObject({
    customModelId: definition.id, width: 100, depth: 75, height: 50,
  });
  expect(reopened.projectPackage!.assets[`assets/${definition.assetName}`]).toBe(bytes.toString('base64'));
  expect(project).toEqual(before);
});
it('does not add model fields to legacy projects and allows detached package definitions', () => {
  expect(readProject(roomProject())).not.toHaveProperty('customModels');
  const detached = modelProject(); delete detached.projectPackage;
  expect(readProject(detached).customModels).toEqual([definition]);
});
it('rejects malformed definitions, unsafe provenance URLs and unresolved references', () => {
  for (const change of [
    { id: '' }, { assetName: '../model.glb' }, { sha256: 'invalid' }, { name: [] },
    { byteLength: bytes.length + 3 }, { width: 0 }, { depth: Infinity },
    { sourceUrl: 'javascript:alert(1)' }, { sourceUrl: 'https://user:secret@example.com/model' },
  ]) {
    const project = modelProject(); Object.assign(project.customModels![0], change);
    expect(() => readProject(project)).toThrow('custom model');
  }
  const duplicate = modelProject(); duplicate.customModels!.push(structuredClone(definition));
  expect(() => readProject(duplicate)).toThrow('unique');
  const missing = modelProject(); missing.projectPackage!.assets = {};
  expect(() => readProject(missing)).toThrow('attachment is missing');
  const dangling = modelProject(); dangling.floors[0].furniture.at(-1)!.customModelId = 'missing';
  expect(() => readProject(dangling)).toThrow('must refer to a model');
});
it('protects original bytes while a model definition exists, including unplaced library models', () => {
  const project = modelProject();
  expect(usedPhotoNames(project).has(definition.assetName)).toBe(true);
  expect(() => deleteUnusedPhoto(project, definition.assetName)).toThrow('custom model');
  project.floors[0].furniture = project.floors[0].furniture.filter(item => !item.customModelId);
  expect(usedPhotoNames(project).has(definition.assetName)).toBe(true);
  expect(() => deleteUnusedPhoto(project, definition.assetName)).toThrow('custom model');
  project.customModels = [];
  expect(deleteUnusedPhoto(project, definition.assetName).projectPackage!.assets).not.toHaveProperty(`assets/${definition.assetName}`);
  expect(project.projectPackage!.assets).toHaveProperty(`assets/${definition.assetName}`);
});
