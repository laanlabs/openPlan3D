import { it, expect } from 'vitest';
import { roomProject } from './fixtures/project';
import { placeCustomModel, removeCustomModel } from '$lib/services/customModels';

it('places an independently editable model reference and prevents definition removal while in use', () => {
  const project = roomProject();
  project.customModels = [{ id: 'box', name: 'Box', assetName: 'box.glb', sourceFilename: 'Box.glb',
    sha256: 'a'.repeat(64), byteLength: 20, width: 123.5, depth: 67, height: 89 }];
  const before = structuredClone(project);
  const next = placeCustomModel(project, 'box', { x: 20, y: -30 });
  const item = next.floors.find(f => f.id === next.activeFloorId)!.furniture.at(-1)!;
  expect(item).toMatchObject({ catalogId: 'custom-model', customModelId: 'box', width: 123.5, depth: 67, height: 89,
    position: { x: 20, y: -30 }, rotation: 0, scale: { x: 1, y: 1, z: 1 } });
  expect(project).toEqual(before);
  expect(() => removeCustomModel(next, 'box')).toThrow('placed furniture');
  const second = placeCustomModel(next, 'box', { x: 0, y: 0 });
  expect(second.floors.find(f => f.id === second.activeFloorId)!.furniture.at(-1)!.id).not.toBe(item.id);
  expect(() => placeCustomModel(project, 'box', { x: Infinity, y: 0 })).toThrow('supported plan area');
  expect(() => placeCustomModel(project, 'missing', { x: 0, y: 0 })).toThrow('no longer available');
});
