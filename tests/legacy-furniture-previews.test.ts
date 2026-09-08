import { beforeEach, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createLocalStore, ProjectConflictError } from '$lib/services/datastore';
import { readProject } from '$lib/utils/projectValidation';
import { projectPackageBytes, readProjectPackage } from '$lib/services/projectPackage';
import { packageJSON, readPackageZip } from '$lib/utils/projectPackageZip';
import { currentProject, loadProject } from '$lib/stores/project';
import { getSnapshots, restoreSnapshot } from '$lib/stores/versionHistory';
import { get } from 'svelte/store';
import { mockStorage, putRaw, rawRecords, failWrites } from './fixtures/indexeddb';

const legacy = () => JSON.parse(readFileSync('tests/fixtures/legacy-furniture-previews.openplan.json', 'utf8'));
beforeEach(() => { mockStorage(); });

it('refreshes legacy furniture when opening without writing stored project or history bytes', async () => {
  const project = legacy(), raw = JSON.stringify(project);
  await putRaw('projects', project.id, raw);
  await putRaw('history', project.id, JSON.stringify([{ timestamp: 1, description: 'Original', data: raw }]));
  const stored = await rawRecords(), history = await rawRecords('history');
  const loaded = (await createLocalStore().load(project.id))!;
  expect(loaded.floors[0].furniture.map(item => item.catalogId)).toEqual(['sofa', 'stairs', 'bed_queen', 'desk', 'sink_b', 'washer_dryer', 'washer_dryer', 'imported_object']);
  expect(await rawRecords()).toEqual(stored);
  expect(await rawRecords('history')).toEqual(history);
});

it('changes only fallback presentation and its contract marker on an independent clone', async () => {
  const project = legacy(), before = JSON.stringify(project), loaded = readProject(project);
  const expected = legacy();
  const categories = ['sofa', 'stairs', 'bed_queen', 'desk', 'sink_b', 'washer_dryer', 'washer_dryer', 'imported_object'];
  expected.floors[0].furniture.forEach((item: any, i: number) => { item.catalogId = categories[i]; });
  expected.floors[0].furniture.at(-1).sourceCategory = 'future-appliance';
  expected.projectPackage.furnitureCategoriesVersion = 1;
  expect(JSON.stringify(loaded)).toBe(JSON.stringify(expected));
  expect(JSON.stringify(project)).toBe(before);
  expect(readProject(loaded)).toEqual(loaded);
});

it('preserves deliberate chair choices after normalization and a subsequent save/reload', async () => {
  const project = legacy(), store = createLocalStore();
  await putRaw('projects', project.id, JSON.stringify(project));
  const loaded = (await store.load(project.id))!;
  loaded.floors[0].furniture[2].catalogId = 'chair';
  await store.save(loaded);
  const again = (await store.load(project.id))!;
  expect(again.floors[0].furniture[2].catalogId).toBe('chair');
  expect(packageJSON(readPackageZip(projectPackageBytes(again))['plan.json']).furniture[2].category).toBe('chair');
});

it('retains edited dimensions, mirrors, attachments, original native categories and explicit replacements on export', () => {
  const project = readProject(legacy());
  const files = readPackageZip(projectPackageBytes(project)), plan = packageJSON(files['plan.json']);
  expect(plan.furniture.map((item: any) => item.category)).toEqual(['sofa', 'stairs', 'bed', 'desk', 'sink', 'washerDryer', 'washerdryer', 'future-appliance']);
  expect(plan.furniture[2]).toMatchObject({ width: 1.5234375, depth: 0.93515625, note: 'Edited locally before preview refresh', price: 123.456, photos: ['legacy-photo.png'], future: { retain: 2 } });
  expect(files['assets/legacy-photo.png']).toEqual(new Uint8Array(readFileSync('tests/fixtures/item-photo.png')));
  const returned = readProjectPackage(projectPackageBytes(project)).project;
  expect(returned.floors[0].furniture[2]).toEqual(project.floors[0].furniture[2]);
});

it('resolves a uniquely moved item and uses source width at the bed threshold', () => {
  const project = legacy(), bed = project.floors[0].furniture.splice(2, 1)[0];
  project.floors[1].furniture.push(bed);
  const loaded = readProject(project);
  expect(loaded.floors[1].furniture[0]).toMatchObject({ catalogId: 'bed_queen', width: 121.875 });
  project.projectPackage.native.furniture[2].width = 1.40000000000001;
  expect(readProject(project).floors[1].furniture[0].catalogId).toBe('bed_twin');
});

it('does not guess from an ordinary RoomPlan chair or reinterpret an exact old catalog ID', () => {
  const noSource = legacy(); delete noSource.projectPackage;
  expect(readProject(noSource).floors[0].furniture[2].catalogId).toBe('chair');
  const exact = legacy(); exact.floors[0].furniture[0].catalogId = 'chair';
  expect(readProject(exact).floors[0].furniture[0].catalogId).toBe('chair');
});

it.each([2, null])('leaves an unsupported category marker %s unchanged and export still rejects it', marker => {
  const project = legacy(); project.projectPackage.furnitureCategoriesVersion = marker;
  const loaded = readProject(project);
  expect(JSON.stringify(loaded)).toBe(JSON.stringify(project));
  expect(() => projectPackageBytes(loaded)).toThrow(/furniture-category version/);
});

it.each(['duplicate-source', 'duplicate-map', 'missing-source', 'invalid-width', 'ambiguous-move', 'two-claims'])('keeps all previews and provenance intact for %s', kind => {
  const project = legacy(), state = project.projectPackage, bed = project.floors[0].furniture[2];
  const entry = state.mapping.find((m: any) => m.kind === 'furniture' && m.webId === bed.id);
  if (kind === 'duplicate-source') state.native.furniture.push({ ...state.native.furniture[2], id: bed.id.toUpperCase() });
  if (kind === 'duplicate-map') state.mapping.push({ ...entry });
  if (kind === 'missing-source') state.native.furniture.splice(2, 1);
  if (kind === 'invalid-width') state.native.furniture[2].width = 'broken';
  if (kind === 'ambiguous-move') { entry.floorId = 'missing-floor'; project.floors[1].furniture.push(structuredClone(bed)); }
  if (kind === 'two-claims') {
    state.mapping.push({ ...entry, id: '00000000-0000-4000-8000-000000009999', floorId: 'missing-floor' });
    state.native.furniture.push({ ...state.native.furniture[2], id: '00000000-0000-4000-8000-000000009999' });
  }
  expect(JSON.stringify(readProject(project))).toBe(JSON.stringify(project));
  expect(() => projectPackageBytes(project)).toThrow();
});

it('does not recreate deleted furniture and marks resolved legacy choices only once', () => {
  const project = legacy(); project.floors[0].furniture.splice(2, 1);
  const loaded = readProject(project);
  expect(loaded.floors[0].furniture).toHaveLength(7);
  expect(loaded.projectPackage?.furnitureCategoriesVersion).toBe(1);
});

it('retains raw recovery bytes on failed saves and detects another tab even after normalization', async () => {
  const project = legacy(), raw = JSON.stringify(project);
  await putRaw('projects', project.id, raw);
  const first = createLocalStore(), second = createLocalStore();
  const a = (await first.load(project.id))!, b = (await second.load(project.id))!;
  const restore = failWrites();
  await expect(first.save(a)).rejects.toMatchObject({ name: 'QuotaExceededError' });
  expect((await rawRecords())[project.id]).toBe(raw);
  restore();
  b.name = 'Saved in another tab'; await second.save(b);
  await expect(first.save(a)).rejects.toBeInstanceOf(ProjectConflictError);
  expect(JSON.parse((await rawRecords())[project.id]).name).toBe(b.name);
});

it('normalizes restored version history without rewriting the archived snapshot', async () => {
  const project = legacy(), raw = JSON.stringify(project), store = createLocalStore();
  await putRaw('projects', project.id, raw);
  await putRaw('history', project.id, JSON.stringify([{ timestamp: 1, description: 'Original', data: raw }]));
  loadProject((await store.load(project.id))!);
  expect(await restoreSnapshot(project.id, 0)).toBe(true);
  expect(get(currentProject)!.floors[0].furniture[2].catalogId).toBe('bed_queen');
  expect((await getSnapshots(project.id))[0].data).toBe(raw);
});
