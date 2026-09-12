import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { roomProject } from './fixtures/project';
import { createDefaultFloor } from '$lib/stores/project';
import { prepareCustomModel, attachCustomModel } from '$lib/services/customModelImport';
import { placeCustomModel, removeCustomModel } from '$lib/services/customModels';
import { readCustomModelSource } from '$lib/services/customModelSource';
import { projectPackageBytes, readProjectPackage } from '$lib/services/projectPackage';
import { readPackageZip, writePackageZip, jsonBytes, packageJSON } from '$lib/utils/projectPackageZip';

const bytes = readFileSync('tests/fixtures/local-model-textured-box.glb');
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 32, height: 24, close: vi.fn() }));
});
afterEach(() => vi.unstubAllGlobals());
async function sourceProject() {
  const source = roomProject(); source.floors.push(createDefaultFloor(1));
  const prepared = await prepareCustomModel(new File([bytes], 'Original box.glb'));
  try {
    const admitted = attachCustomModel(source, prepared, { name: 'My custom box', attribution: 'User provenance' }, []);
    return { project: placeCustomModel(admitted.project, admitted.model.id, { x: 200, y: 100 }), model: admitted.model };
  } finally { prepared.dispose(); }
}

it('keeps the UI-admitted model and original source while applying native move, resize, rotation and floor edits', async () => {
  const { project, model } = await sourceProject(), before = structuredClone(project);
  const instance = project.floors[0].furniture.at(-1)!;
  expect(instance.catalogId).toBe('custom-model');
  const files = readPackageZip(projectPackageBytes(project)), native = packageJSON(files['plan.json']);
  expect(native.furniture).toHaveLength(1);
  const nativeID = native.furniture[0].id;
  Object.assign(native.furniture[0], { width: 1.75, depth: 0.625, center: { x: 3, y: 2.5 }, angle: Math.PI / 4, level: 1 });
  files['plan.json'] = jsonBytes(native);
  const returned = readProjectPackage(writePackageZip(files)).project;
  expect(returned.floors[0].furniture).toHaveLength(0);
  const moved = returned.floors.find(floor => floor.level === 1)!.furniture[0];
  expect(moved).toMatchObject({ id: instance.id, customModelId: model.id, catalogId: 'custom-model',
    width: 175, depth: 62.5, height: 50, position: { x: 300, y: 250 }, rotation: 45 });
  expect(returned.customModels).toEqual(project.customModels);
  expect(returned.attachmentNames).toEqual(project.attachmentNames);
  expect((await readCustomModelSource(returned, model.id)).bytes).toEqual(new Uint8Array(bytes));
  const exported = readPackageZip(projectPackageBytes(returned)), finalNative = packageJSON(exported['plan.json']);
  expect(finalNative.furniture[0]).toMatchObject({ id: nativeID, width: 1.75, depth: 0.625, level: 1 });
  expect(exported[`assets/${model.assetName}`]).toEqual(new Uint8Array(bytes));
  expect(project).toEqual(before);
});

it('keeps a reusable model after native instance deletion and permits explicit removal afterward', async () => {
  const { project, model } = await sourceProject();
  const files = readPackageZip(projectPackageBytes(project)), native = packageJSON(files['plan.json']);
  native.furniture = []; files['plan.json'] = jsonBytes(native);
  const returned = readProjectPackage(writePackageZip(files)).project;
  expect(returned.floors.flatMap(floor => floor.furniture)).toEqual([]);
  expect(returned.customModels).toEqual(project.customModels);
  expect((await readCustomModelSource(returned, model.id)).bytes).toEqual(new Uint8Array(bytes));
  const removed = removeCustomModel(returned, model.id);
  expect(removed.customModels).toBeUndefined();
  expect(removed.projectPackage!.assets).not.toHaveProperty(`assets/${model.assetName}`);
});


it('reads actual Swift storage import/edit/export output with intact model source and references', async () => {
  const swiftOutput = new Uint8Array(readFileSync('tests/fixtures/swift-return-custom-model-package.zip'));
  const files = readPackageZip(swiftOutput);
  const original = packageJSON(files['web.json']);
  const returned = readProjectPackage(swiftOutput).project;
  const model = returned.customModels![0];
  expect(returned.customModels).toEqual(original.customModels);
  expect(model).toMatchObject({ name: 'My custom box', sourceFilename: 'Original box.glb', attribution: 'User provenance' });
  expect(returned.floors[0].furniture).toEqual([]);
  expect(returned.floors.find(floor => floor.level === 1)!.furniture).toEqual([
    expect.objectContaining({ id: original.floors[0].furniture[0].id, customModelId: model.id,
      catalogId: 'custom-model', width: 175, depth: 62.5, height: 50,
      position: { x: 300, y: 250 }, rotation: 45 }),
  ]);
  expect((await readCustomModelSource(returned, model.id)).bytes).toEqual(new Uint8Array(bytes));
  const exported = readPackageZip(projectPackageBytes(returned));
  expect(exported[`assets/${model.assetName}`]).toEqual(new Uint8Array(bytes));
  expect(packageJSON(exported['plan.json']).furniture[0]).toMatchObject({
    // Swift prints uppercase UUIDs; the web reader normalizes their spelling.
    id: packageJSON(files['plan.json']).furniture[0].id.toLowerCase(), width: 1.75, depth: 0.625,
    center: { x: 3, y: 2.5 }, angle: Math.PI / 4, level: 1,
  });
});
