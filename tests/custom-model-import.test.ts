import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { prepareCustomModel, attachCustomModel } from '$lib/services/customModelImport';
import { readCustomModelSource } from '$lib/services/customModelSource';
import { roomProject } from './fixtures/project';

const bytes = readFileSync('tests/fixtures/local-model-textured-box.glb');
const file = () => new File([bytes], 'Box.glb');
let close: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  close = vi.fn();
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 32, height: 24, close }));
});
afterEach(() => vi.unstubAllGlobals());

it('admits exact original bytes with verified dimensions and user provenance without editing the input', async () => {
  const project = roomProject(), before = structuredClone(project);
  const prepared = await prepareCustomModel(file());
  try {
    prepared.dimensions.width = 999; prepared.scene.scale.setScalar(100);
    const result = attachCustomModel(project, prepared, { name: 'My box', license: 'User supplied', sourceUrl: 'https://example.com/box' }, []);
    expect(result.model).toMatchObject({ width: 100, depth: 75, height: 50, name: 'My box', sourceFilename: 'Box.glb', license: 'User supplied' });
    expect((await readCustomModelSource(result.project, result.model.id)).bytes).toEqual(new Uint8Array(bytes));
    expect(project).toEqual(before);
    const reused = attachCustomModel(result.project, prepared, { name: 'Second import' }, []);
    expect(reused.reused).toBe(true);
    expect(reused.model.name).toBe('My box');
    expect(reused.project.customModels).toHaveLength(1);
    expect(Object.keys(reused.project.projectPackage!.assets)).toHaveLength(1);
  } finally { prepared.dispose(); }
  expect(close).toHaveBeenCalledTimes(1);
});
it('rejects forged or disposed previews, invalid provenance and insufficient storage without mutation', async () => {
  const project = roomProject(), before = structuredClone(project);
  const prepared = await prepareCustomModel(file());
  try {
    expect(() => attachCustomModel(project, { ...prepared }, { name: 'Box' }, [])).toThrow('expired');
    expect(() => attachCustomModel(project, prepared, { name: 'Box', sourceUrl: 'file:///private/model.glb' }, [])).toThrow('HTTP');
    expect(() => attachCustomModel(project, prepared, { name: 'Box' }, [], { usage: 100, quota: 100 })).toThrow('too little space');
    expect(project).toEqual(before);
  } finally { prepared.dispose(); }
  prepared.dispose();
  expect(() => attachCustomModel(project, prepared, { name: 'Box' }, [])).toThrow('expired');
  expect(close).toHaveBeenCalledTimes(1);
});
it('rejects damaged existing sources and colliding attachments instead of replacing bytes', async () => {
  const prepared = await prepareCustomModel(file());
  try {
    const first = attachCustomModel(roomProject(), prepared, { name: 'Box' }, []);
    const path = `assets/${first.model.assetName}`;
    first.project.projectPackage!.assets[path] = 'AAAA' + first.project.projectPackage!.assets[path].slice(4);
    const before = structuredClone(first.project);
    expect(() => attachCustomModel(first.project, prepared, { name: 'Box' }, [])).toThrow('damaged');
    delete first.project.customModels;
    expect(() => attachCustomModel(first.project, prepared, { name: 'Box' }, [])).toThrow('same filename');
    expect(first.project.projectPackage).toEqual(before.projectPackage);
  } finally { prepared.dispose(); }
});
it('rejects invalid files and cancellation before allocating decoded images', async () => {
  await expect(prepareCustomModel(new File([bytes], 'Box.obj'))).rejects.toThrow('GLB');
  const controller = new AbortController(); controller.abort();
  await expect(prepareCustomModel(file(), controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(createImageBitmap).not.toHaveBeenCalled();
});
