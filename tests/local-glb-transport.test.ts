import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { roomProject } from './fixtures/project';
import { webToNative } from '$lib/utils/projectPackageBridge';
import { projectPackageBytes, readProjectPackage } from '$lib/services/projectPackage';
import { readProject } from '$lib/utils/projectValidation';
import { readSnapshotStorage, writeSnapshotStorage, type StoredSnapshot } from '$lib/utils/snapshotStorage';

const name = 'fixture-box.glb', path = `assets/${name}`;
const source = readFileSync('tests/fixtures/local-model-textured-box.glb');
const encoded = source.toString('base64');
function projectWithAttachment() {
  const project = roomProject();
  const { plan, mapping } = webToNative(project, undefined);
  project.projectPackage = { version: 1, furnitureCategoriesVersion: 1, native: plan, mapping, assets: { [path]: encoded } };
  project.attachmentNames = { [name]: 'Original textured model' };
  return project;
}

it('preserves original GLB bytes and attachment labels through package and JSON round trips', () => {
  const project = projectWithAttachment(), before = structuredClone(project);
  const first = readProjectPackage(projectPackageBytes(project)).project;
  const recovered = readProject(JSON.parse(JSON.stringify(first)));
  const second = readProjectPackage(projectPackageBytes(recovered)).project;
  for (const result of [first, recovered, second]) {
    expect(Buffer.from(result.projectPackage!.assets[path], 'base64')).toEqual(source);
    expect(result.attachmentNames?.[name]).toBe('Original textured model');
  }
  expect(project).toEqual(before);
});

it('stores shared GLB bytes once in saved history and restores standalone versions', () => {
  const project = projectWithAttachment();
  const snapshots = ['First version', 'Second version'].map((description, timestamp) => ({
    description, timestamp, data: JSON.stringify({ ...project, name: description }),
  }));
  const raw = writeSnapshotStorage(snapshots), storage = JSON.parse(raw);
  expect(Object.values(storage.assets).filter(value => value === encoded)).toHaveLength(1);
  const restored = readSnapshotStorage(raw) as StoredSnapshot[];
  expect(restored).toHaveLength(2);
  restored.forEach((snapshot, index) => {
    const reopened = readProject(JSON.parse(snapshot.data));
    expect(reopened.name).toBe(snapshots[index].description);
    expect(Buffer.from(reopened.projectPackage!.assets[path], 'base64')).toEqual(source);
    expect(reopened.attachmentNames?.[name]).toBe('Original textured model');
  });
  expect(project.projectPackage!.assets[path]).toBe(encoded);
});
