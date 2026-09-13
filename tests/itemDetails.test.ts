import { beforeEach, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { get } from 'svelte/store';
import type { DetailTarget, Project } from '$lib/models/types';
import { readProjectPackage, projectPackageBytes } from '$lib/services/projectPackage';
import { readPackageZip, writePackageZip, packageJSON, jsonBytes } from '$lib/utils/projectPackageZip';
import { itemDetails } from '$lib/utils/itemDetails';
import { readProject } from '$lib/utils/projectValidation';
import { attachItemPhoto, checkPhotoStorage, deleteUnusedPhoto, photoHeader, photoStorageBytes } from '$lib/services/itemPhotos';
import { currentProject, loadProject, updateItemDetails, commitItemDetails, undo, redo, updateWall, undoHistoryStore } from '$lib/stores/project';
import { saveSnapshot, getSnapshots, snapshotError } from '$lib/stores/versionHistory';
import { readSnapshotStorage, writeSnapshotStorage } from '$lib/utils/snapshotStorage';
import { libraryBackup } from '$lib/services/localDatabase';
import { createLocalStore } from '$lib/services/datastore';
import { prepareLibraryRestore } from '$lib/services/libraryRestore';
import { mockStorage, rawRecords, putRaw, failWrites } from './fixtures/indexeddb';

const fixture = () => readProjectPackage(new Uint8Array(readFileSync('tests/fixtures/native-project-package.zip'))).project;
const target = (p: Project, kind: DetailTarget['kind'], index = 0): DetailTarget => ({ floorId: p.floors[0].id, kind, id: p.floors[0][kind][index].id });
const photo = { name: 'new-photo.png', data: readFileSync('tests/fixtures/item-photo.png').toString('base64') };
const state = () => get(currentProject)!;
const native = (p: Project) => packageJSON(readPackageZip(projectPackageBytes(p))['plan.json']);
beforeEach(() => { mockStorage(); loadProject(fixture()); });

it('edits and clears native metadata without changing geometry, unknown fields or attachments', () => {
  const p = state(), furniture = target(p, 'furniture'), wall = target(p, 'walls'), room = target(p, 'rooms');
  updateItemDetails(furniture, { note: 'Chosen on web', price: 12.345 });
  updateItemDetails(wall, { note: 'Construction note', material: 'brick' });
  updateItemDetails(room, { note: null, ceilingHeight: 287.625, roomType: 'office' });
  updateItemDetails(target(p, 'doors'), { price: 0 });
  updateItemDetails(target(p, 'windows'), { price: 45.675 });
  const exported = native(state());
  expect(exported.furniture[0]).toMatchObject({ note: 'Chosen on web', price: 12.345, photos: ['chair.png'] });
  expect(exported.walls[0]).toMatchObject({ note: 'Construction note', material: 'brick', thickness: 0.275, extension: { future: true } });
  expect(exported.rooms[0]).toMatchObject({ ceilingHeight: 2.87625, type: 'office' });
  expect(exported.rooms[0].note).toBeUndefined();
  expect(exported.openings.find((o: any) => o.kind === 'door').price).toBe(0);
  expect(exported.openings.find((o: any) => o.kind === 'window').price).toBe(45.675);
  updateItemDetails(furniture, { note: null, price: null, photos: [] });
  const cleared = native(state());
  expect(cleared.furniture[0].note).toBeUndefined(); expect(cleared.furniture[0].price).toBeUndefined();
  expect(cleared.furniture[0].photos).toEqual([]);
  expect(readPackageZip(projectPackageBytes(state()))['assets/chair.png']).toBeDefined();
  undo(); expect(itemDetails(state(), furniture).price).toBe(12.345);
  redo(); expect(itemDetails(state(), furniture).price).toBeNull();
});
it('applies returned iPhone metadata deletions and preserves unrelated web details', () => {
  const p = state(), ref = target(p, 'furniture');
  updateItemDetails(ref, { note: 'To be cleared', price: 50 });
  (state().floors[0].furniture[0].details as any).future = { retained: true };
  const files = readPackageZip(projectPackageBytes(state())), edited = packageJSON(files['plan.json']);
  delete edited.furniture[0].note; delete edited.furniture[0].price; edited.furniture[0].photos = [];
  files['plan.json'] = jsonBytes(edited);
  const returned = readProjectPackage(writePackageZip(files)).project;
  expect(returned.floors[0].furniture[0].details).toMatchObject({ note: null, price: null, photos: [], future: { retained: true } });
  expect(native(returned).furniture[0].note).toBeUndefined();
  expect(native(returned).furniture[0].price).toBeUndefined();
});
it('resolves old saved packages without details and preserves identities across floor moves', () => {
  const p = state(), ref = target(p, 'furniture');
  delete p.floors[0].furniture[0].details;
  const before = JSON.stringify(p);
  expect(itemDetails(p, ref)).toMatchObject({ note: 'Keep furniture note', price: 456.75, photos: ['chair.png'] });
  expect(JSON.stringify(p)).toBe(before);
  const item = p.floors[0].furniture.shift()!; p.floors[1].furniture.push(item); p.activeFloorId = p.floors[1].id;
  const moved = { ...ref, floorId: p.floors[1].id };
  updateItemDetails(moved, { note: 'Moved and edited' });
  expect(native(state()).furniture[0]).toMatchObject({ id: item.id, note: 'Moved and edited', price: 456.75, photos: ['chair.png'], level: 2 });
});
it('reuses identical attachments, shares references and explicitly deletes only unused files', () => {
  const p = state(), furniture = target(p, 'furniture'), room = target(p, 'rooms');
  const added = attachItemPhoto(p, furniture, photo);
  const shared = attachItemPhoto(added, room, { ...photo, name: 'duplicate.png' });
  expect(Object.keys(shared.projectPackage!.assets)).toHaveLength(3);
  expect(shared.floors[0].rooms[0].details!.photos).toContain(photo.name);
  expect(() => deleteUnusedPhoto(shared, photo.name)).toThrow(/still used/);
  loadProject(shared); updateItemDetails(furniture, { photos: [] });
  expect(() => deleteUnusedPhoto(state(), photo.name)).toThrow(/still used/);
  updateItemDetails(room, { photos: [] });
  const cleared = deleteUnusedPhoto(state(), photo.name);
  expect(readPackageZip(projectPackageBytes(cleared))[`assets/${photo.name}`]).toBeUndefined();
  expect(() => deleteUnusedPhoto(cleared, 'chair.png')).toThrow(/tracing image/);
  const noOrphan = deleteUnusedPhoto(cleared, 'orphan.png');
  expect(readPackageZip(projectPackageBytes(noOrphan))['assets/orphan.png']).toBeUndefined();
  expect(readPackageZip(projectPackageBytes(noOrphan))['assets/chair.png']).toBeDefined();
  commitItemDetails(state(), noOrphan, 'Delete attachment'); undo();
  expect(state().projectPackage!.assets[`assets/${photo.name}`]).toBe(photo.data);
  redo(); expect(state().projectPackage!.assets[`assets/${photo.name}`]).toBeUndefined();
});
it('never commits an async result to a changed or replaced project', () => {
  const p = state(), next = attachItemPhoto(p, target(p, 'furniture'), photo);
  updateItemDetails(target(p, 'furniture'), { note: 'Later work' });
  const before = JSON.stringify(state());
  expect(() => commitItemDetails(p, next, 'Stale photo')).toThrow(/project changed/);
  expect(JSON.stringify(state())).toBe(before);
});
it('uses native metadata from older web exporters instead of their stale retained detail fields', () => {
  const files = readPackageZip(projectPackageBytes(state()));
  const plan = packageJSON(files['plan.json']), baseline = packageJSON(files['baseline.json']);
  plan.furniture[0].price = baseline.furniture[0].price = 9.125;
  delete plan.furniture[0].note; delete baseline.furniture[0].note;
  delete baseline.openplanItemDetailsVersion;
  files['plan.json'] = jsonBytes(plan); files['baseline.json'] = jsonBytes(baseline);
  const returned = readProjectPackage(writePackageZip(files)).project;
  expect(returned.floors[0].furniture[0].details).toMatchObject({ price: 9.125, note: null });
  expect(native(returned).furniture[0].price).toBe(9.125);
});
it('rejects missing attachments hidden in retained web metadata before import', () => {
  const files = readPackageZip(projectPackageBytes(state())), web = packageJSON(files['web.json']);
  web.floors[0].furniture[0].details.photos = ['missing.png']; files['web.json'] = jsonBytes(web);
  expect(() => readProjectPackage(writePackageZip(files))).toThrow(/Missing attachment/);
});
it.each([{ price: -1 }, { price: Infinity }, { photos: ['../private.png'] }, { photos: null }])('rejects malformed metadata before changing the editor: %j', patch => {
  const before = JSON.stringify(state());
  expect(() => updateItemDetails(target(state(), 'furniture'), patch as any)).toThrow(/Invalid item details/);
  expect(JSON.stringify(state())).toBe(before);
  const bad = fixture(); bad.floors[0].furniture[0].details = patch as any;
  expect(() => readProject(bad)).toThrow(/Invalid item details/);
});
it('checks image dimensions and accounts for a project and its deduplicated saved versions', () => {
  expect(photoHeader(new Uint8Array(readFileSync('tests/fixtures/item-photo.png')))).toEqual({ width: 32, height: 24, mime: 'image/png' });
  expect(photoHeader(new Uint8Array([1, 2, 3]))).toBeNull();
  const p = state(), next = attachItemPhoto(p, target(p, 'furniture'), photo);
  expect(photoStorageBytes(next)).toBeGreaterThan(photoStorageBytes(p));
  expect(() => checkPhotoStorage(p, next, [], { usage: 100, quota: 100 })).toThrow(/too little space/);
  expect(() => checkPhotoStorage(p, next, [], { usage: 0, quota: 100_000_000 })).not.toThrow();
  next.description = 'x'.repeat(7 * 1024 * 1024);
  expect(() => checkPhotoStorage(p, next, [])).toThrow(/64 MiB/);
}, 15_000); // Exercises multi-megabyte serialization; this is a quota check, not a speed benchmark.
it('stores a photo once across saved versions and restores independent copies through library backups', async () => {
  const p = attachItemPhoto(state(), target(state(), 'furniture'), photo); loadProject(p);
  const store = createLocalStore(); await store.save(p);
  for (let i = 0; i < 10; i++) {
    updateItemDetails(target(p, 'furniture'), { note: `Version ${i}` });
    await saveSnapshot(state(), `Version ${i}`);
  }
  await store.save(state());
  const raw = (await rawRecords('history'))[p.id], stored = JSON.parse(raw);
  expect(stored.format).toBe('openplan3d-history'); expect(stored.version).toBe(2);
  expect(Object.values(stored.assets)).toHaveLength(2); // chair/orphan share bytes
  expect(raw.split(photo.data)).toHaveLength(2);
  expect((await getSnapshots(p.id))).toHaveLength(10);
  const preview = prepareLibraryRestore(await libraryBackup());
  expect(preview.entries[0].versions).toBe(10);
  const result = await preview.restore(), copy = await store.load(result.projects[0].id);
  expect(copy!.id).not.toBe(p.id);
  expect(copy!.projectPackage!.assets).toEqual(state().projectPackage!.assets);
  const restored = await getSnapshots(copy!.id);
  expect(JSON.parse(restored[0].data).id).toBe(copy!.id);
  expect(JSON.parse(restored[0].data).floors[0].furniture[0].details.note).toBe('Version 0');
  expect(JSON.parse(restored[9].data).projectPackage.assets[`assets/${photo.name}`]).toBe(photo.data);
});
it('retains original versions after a quota failure and never drops a missing pooled attachment', async () => {
  const p = state(); await saveSnapshot(p, 'Original');
  const before = await rawRecords('history'), stopFailure = failWrites('history');
  expect(await saveSnapshot(p, 'Cannot save')).toBe(false); expect(await rawRecords('history')).toEqual(before);
  stopFailure();
  const damaged = JSON.parse(before[p.id]); delete damaged.assets.a0;
  const raw = JSON.stringify(damaged); await putRaw('history', p.id, raw);
  await expect(getSnapshots(p.id)).rejects.toThrow(/could not be read/);
  expect(await saveSnapshot(p, 'Cannot repair by omission')).toBe(false);
  expect((await rawRecords('history'))[p.id]).toBe(raw); expect(get(snapshotError)).toContain('Download a backup');
});
it('preserves legacy and unknown snapshot fields in the shared-attachment codec', () => {
  const legacy = { timestamp: 1, description: 'Old version', data: JSON.stringify(state()), assetRefs: { future: true } };
  const raw = writeSnapshotStorage([legacy]);
  expect(readSnapshotStorage(raw)).toEqual([legacy]);
  const noPhotos = { ...legacy, data: '{damaged project' };
  expect(readSnapshotStorage(JSON.stringify([noPhotos]))).toEqual([noPhotos]);
  expect(readSnapshotStorage(writeSnapshotStorage([legacy, noPhotos]))).toEqual([legacy, noPhotos]);
});
it('bounds attachment expansion before hydrating a crafted pooled history', () => {
  const project = state(); project.projectPackage!.assets = {};
  const packed = { format: 'openplan3d-history', version: 2, assets: { a0: 'A'.repeat(2 * 1024 * 1024) },
    snapshots: [{ snapshot: { timestamp: 1, description: 'Unsafe fanout', data: JSON.stringify(project) },
      assetRefs: Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`assets/${i}.png`, 'a0'])) }] };
  expect(() => readSnapshotStorage(JSON.stringify(packed))).toThrow(/could not be read/);
});
it('reads actual Swift changes and clears back into the web metadata controls', () => {
  const returned = readProjectPackage(new Uint8Array(readFileSync('tests/fixtures/swift-metadata-return.zip'))).project;
  expect(returned.floors[0].furniture[0].details).toMatchObject({ note: 'Native follow-up', price: null, photos: [] });
  expect(returned.floors[0].rooms[0].details).toMatchObject({ note: null, roomType: null, ceilingHeight: null });
  expect(returned.floors[0].walls[0].details).toMatchObject({ material: 'concrete', note: null });
  const again = native(returned);
  expect(again.furniture[0].price).toBeUndefined(); expect(again.rooms[0].ceilingHeight).toBeUndefined();
  expect(again.walls[0].extension.future).toBe(true);
  expect(readPackageZip(projectPackageBytes(returned))['assets/new-photo.png']).toEqual(new Uint8Array(readFileSync('tests/fixtures/item-photo.png')));
});
it('bounds undo memory for large attachment projects while retaining recent undo/redo', () => {
  const p = state(); p.description = 'x'.repeat(5 * 1024 * 1024);
  const id = p.floors[0].walls[0].id;
  for (let i = 0; i < 6; i++) updateWall(id, i % 2 ? { endHeight: 210 + i } : { thickness: 30 + i });
  expect(get(undoHistoryStore).entries.length).toBeLessThan(6);
  undo(); expect(state().floors[0].walls[0].endHeight).toBe(213);
  redo(); expect(state().floors[0].walls[0].endHeight).toBe(215);
});

it('exports the web metadata fixture for native contract tests only when requested', () => {
  updateItemDetails(target(state(), 'furniture'), { note: null, price: 123.456, photos: [] });
  updateItemDetails(target(state(), 'rooms'), { note: 'Web room notes', ceilingHeight: 287.625, roomType: 'office' });
  updateItemDetails(target(state(), 'walls'), { note: 'Web construction notes', material: null });
  updateItemDetails(target(state(), 'doors'), { price: 0 });
  const result = attachItemPhoto(state(), target(state(), 'furniture'), photo);
  const bytes = projectPackageBytes(result);
  expect(native(result).furniture[0].price).toBe(123.456);
  if (process.env.OPENPLAN_METADATA_FIXTURES) writeFileSync(`${process.env.OPENPLAN_METADATA_FIXTURES}/web-metadata-package.zip`, bytes);
});
