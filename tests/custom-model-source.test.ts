import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { roomProject } from './fixtures/project';
import { webToNative } from '$lib/utils/projectPackageBridge';
import { readCustomModelSource } from '$lib/services/customModelSource';

const original = readFileSync('tests/fixtures/local-model-textured-box.glb');
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function project() {
  const value = roomProject();
  const { plan, mapping } = webToNative(value, undefined);
  value.customModels = [{ id: 'model', name: 'Original box', assetName: 'model.glb', sourceFilename: 'box.glb',
    sha256: hash(original), byteLength: original.length, width: 100, depth: 75, height: 50 }];
  value.projectPackage = { version: 1, furnitureCategoriesVersion: 1, native: plan, mapping,
    assets: { 'assets/model.glb': original.toString('base64') } };
  return value;
}
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());

it('verifies the original digest and returns independent metadata and exact GLB bytes', async () => {
  const value = project(), before = structuredClone(value);
  const result = await readCustomModelSource(value, 'model');
  expect(result.bytes).toEqual(new Uint8Array(original));
  expect(result.container.document.asset.version).toBe('2.0');
  expect(result.model).toEqual(value.customModels![0]);
  result.model.name = 'Changed copy'; result.bytes[0] = 0;
  expect(value).toEqual(before);
});
it('rejects missing models, detached sources, malformed base64 and same-length corruption', async () => {
  await expect(readCustomModelSource(project(), 'missing')).rejects.toThrow('no longer defined');
  const missing = project(); delete missing.projectPackage;
  await expect(readCustomModelSource(missing, 'model')).rejects.toThrow('attachment is missing');
  const malformed = project(); malformed.projectPackage!.assets['assets/model.glb'] = '!' + original.toString('base64').slice(1);
  await expect(readCustomModelSource(malformed, 'model')).rejects.toThrow('base64');
  const changed = project(), corrupt = Buffer.from(original); corrupt[corrupt.length - 1] ^= 1;
  changed.projectPackage!.assets['assets/model.glb'] = corrupt.toString('base64');
  await expect(readCustomModelSource(changed, 'model')).rejects.toThrow('changed or is damaged');
});
it('still checks the GLB container when malformed bytes have a matching digest', async () => {
  const value = project(), corrupt = Buffer.from(original); corrupt[0] = 0;
  value.projectPackage!.assets['assets/model.glb'] = corrupt.toString('base64'); value.customModels![0].sha256 = hash(corrupt);
  await expect(readCustomModelSource(value, 'model')).rejects.toThrow('glTF 2.0');
});
it('cancels before work and after a pending digest completes', async () => {
  const value = project(), early = new AbortController(); early.abort();
  await expect(readCustomModelSource(value, 'model', early.signal)).rejects.toMatchObject({ name: 'AbortError' });
  let finish!: (value: ArrayBuffer) => void;
  vi.stubGlobal('crypto', { subtle: { digest: () => new Promise(resolve => { finish = resolve; }) } });
  const controller = new AbortController(), pending = readCustomModelSource(value, 'model', controller.signal);
  controller.abort(); finish(new ArrayBuffer(32));
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});
it('captures matching metadata when the project changes while hashing', async () => {
  const value = project(); let finish!: (value: ArrayBuffer) => void;
  vi.stubGlobal('crypto', { subtle: { digest: () => new Promise(resolve => { finish = resolve; }) } });
  const pending = readCustomModelSource(value, 'model'); value.customModels![0].name = 'Later name';
  finish(Uint8Array.from(Buffer.from(hash(original), 'hex')).buffer);
  expect((await pending).model.name).toBe('Original box');
});
