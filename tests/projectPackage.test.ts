import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { get } from 'svelte/store';
import { projectPackageBytes, readProjectPackage, prepareProjectPackage } from '$lib/services/projectPackage';
import { readPackageZip, writePackageZip, jsonBytes, packageJSON, crc32 } from '$lib/utils/projectPackageZip';
import { validatePackagePlan } from '$lib/utils/projectPackageBridge';
import { roomProject } from './fixtures/project';
import { mockStorage, rawRecords, failWrites } from './fixtures/indexeddb';
import { createLocalStore } from '$lib/services/datastore';
import { currentProject, loadProject, updateProjectName } from '$lib/stores/project';

const pixel = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6WQAAAAASUVORK5CYII=', 'base64'));
const native = () => JSON.parse(readFileSync('tests/fixtures/handoff-plan.json', 'utf8'));
function nativeFiles() {
  const plan = native();
  plan.planNotes = 'Keep the complete plan notes';
  plan.furniture[0].photos = ['chair.png']; plan.furniture[0].note = 'Keep furniture note'; plan.furniture[0].price = 456.75;
  plan.rooms[0].photos = ['chair.png']; plan.rooms[0].note = 'Keep room note';
  plan.walls[0].material = 'future-material'; plan.walls[0].extension = { future: true };
  plan.notes = [{ id: '00000000-0000-4000-8000-000000000080', text: 'Pinned note', position: { x: 1, y: 2 } }];
  plan.underlay = { imageFilename: 'chair.png', center: { x: 3, y: 2 }, widthMeters: 6 };
  plan.vendor = { original: 'Keep me' };
  return { 'manifest.json': jsonBytes({ format: 'openplan3d-project', version: 1, producer: 'ios', title: 'QA Project Package' }), 'plan.json': jsonBytes(plan), 'assets/chair.png': pixel, 'assets/orphan.png': pixel };
}
function webFixture() {
  const project: any = roomProject();
  project.id = 'qa-project-package-web'; project.name = 'QA Web Package';
  const floor = project.floors[0]; floor.elevation = 47.25;
  floor.walls[0].startHeight = 273.5; floor.walls[0].endHeight = 123.75; floor.walls[0].texture = 'future-texture';
  floor.furniture = [{ id: 'chair-short-id', catalogId: 'chair', position: { x: 100.5, y: 120.25 }, width: 65, depth: 55, height: 91, rotation: 37.5, scale: { x: -2, y: 1.5, z: 1 }, future: 'furniture extension' }];
  floor.textAnnotations = [{ id: 'note-short-id', text: 'Web note', x: 200, y: 100, fontSize: 18, color: '#123456', rotation: 12 }];
  floor.backgroundImage = { dataUrl: `data:image/png;base64,${Buffer.from(pixel).toString('base64')}`, position: { x: 120, y: 90 }, scale: 600, rotation: 0, opacity: 0.25, locked: false };
  project.vendor = { preserve: ['all', 'web', 'extensions'] };
  return project;
}
beforeEach(() => { mockStorage(); });

it('uses interoperable CRC32 and a strict stored ZIP profile', () => {
  expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  const files = nativeFiles(); const bytes = writePackageZip(files);
  expect(readPackageZip(bytes)).toEqual(files);
  expect(() => writePackageZip({ 'a.json': pixel, 'A.json': pixel })).toThrow(/Duplicate/);
  expect(() => writePackageZip({ '../plan.json': pixel })).toThrow(/unsafe/);
  for (const offset of [0, 6, 8, 14, 18, bytes.length - 2, bytes.length - 6]) {
    const damaged = bytes.slice(); damaged[offset] ^= 1;
    expect(() => readPackageZip(damaged)).toThrow();
  }
});
it('imports native edits, notes and photos without losing unknown native data on export', () => {
  const files = nativeFiles(), preview = readProjectPackage(writePackageZip(files)), plan = packageJSON(files['plan.json']);
  expect(preview.assets).toBe(2); expect(preview.project.floors.map(f => f.name)).toEqual(['Entry', 'Loft', 'Future Floor']);
  expect(preview.project.floors[0].walls[0].thickness).toBe(27.5);
  expect(preview.project.floors[0].textAnnotations[0].text).toBe('Pinned note');
  expect(preview.project.floors[0].backgroundImage?.scale).toBe(600);
  expect(preview.project.description).toBe(plan.planNotes);
  const exported = readPackageZip(projectPackageBytes(preview.project)), again = packageJSON(exported['plan.json']);
  expect(again).toEqual(plan);
  expect(exported['assets/chair.png']).toEqual(pixel); expect(exported['assets/orphan.png']).toEqual(pixel);
  const after = readProjectPackage(projectPackageBytes(preview.project));
  expect(after.project.floors[0].walls[0].thickness).toBe(27.5);
});
it('unchanged web → native → web preserves richer web fields and short IDs exactly', () => {
  const source = webFixture(), files = readPackageZip(projectPackageBytes(source));
  const imported = readProjectPackage(writePackageZip(files)).project as any;
  delete imported.projectPackage;
  expect(imported).toEqual(source);
  expect(packageJSON(files['plan.json']).walls[0].id).toMatch(/^[\da-f-]{36}$/i);
});
it('applies native geometry edits and retains sloped walls until the height changes', () => {
  const source = webFixture(), files = readPackageZip(projectPackageBytes(source)), plan = packageJSON(files['plan.json']);
  plan.walls[0].thickness = 0.3725;
  plan.furniture[0].width = 1.575; plan.furniture[0].angle = Math.PI / 3;
  plan.notes[0].text = 'Updated on iPhone';
  files['plan.json'] = jsonBytes(plan);
  const result = readProjectPackage(writePackageZip(files)).project;
  expect(result.floors[0].walls[0]).toMatchObject({ thickness: 37.25, startHeight: 273.5, endHeight: 123.75 });
  expect(result.floors[0].furniture[0]).toMatchObject({ width: 78.75, scale: { x: -2, y: 1.5, z: 1 } });
  expect(result.floors[0].furniture[0].rotation).toBeCloseTo(60, 10);
  expect(result.floors[0].textAnnotations[0].text).toBe('Updated on iPhone');
  plan.walls[0].height = 2.875; files['plan.json'] = jsonBytes(plan);
  expect(readProjectPackage(writePackageZip(files)).project.floors[0].walls[0]).toMatchObject({ height: 287.5, startHeight: 287.5, endHeight: 287.5 });
});
it('transfers web edits back to the native plan while preserving costs, notes and attachments', () => {
  const project = readProjectPackage(writePackageZip(nativeFiles())).project;
  project.floors[0].walls[0].thickness = 33.75;
  project.floors[0].textAnnotations[0].text = 'Edited on the web';
  const files = readPackageZip(projectPackageBytes(project)), plan = packageJSON(files['plan.json']);
  expect(plan.walls[0]).toMatchObject({ thickness: 0.3375, material: 'future-material', extension: { future: true } });
  expect(plan.furniture[0]).toMatchObject({ price: 456.75, note: 'Keep furniture note', photos: ['chair.png'] });
  expect(plan.notes[0]).toMatchObject({ text: 'Edited on the web' }); expect(plan.notes[0].fontSize).toBeUndefined();
  expect(plan.vendor).toEqual({ original: 'Keep me' });
});
it('preserves web-only fields while applying native element additions and deletions', () => {
  const source = webFixture(), files = readPackageZip(projectPackageBytes(source)), plan = packageJSON(files['plan.json']);
  plan.notes = [];
  plan.furniture.push({ id: '10000000-0000-4000-8000-000000000099', category: 'table', center: { x: 2, y: 3 }, angle: 0, width: 1, depth: 1, level: 0 });
  files['plan.json'] = jsonBytes(plan);
  const after: any = readProjectPackage(writePackageZip(files)).project;
  expect(after.floors[0].textAnnotations).toEqual([]); expect(after.floors[0].furniture).toHaveLength(2);
  expect(after.vendor).toEqual(source.vendor); expect(after.floors[0].elevation).toBe(47.25);
});
it('updates tracing-image placement without resetting web opacity and locking', () => {
  const files = readPackageZip(projectPackageBytes(webFixture())), plan = packageJSON(files['plan.json']);
  plan.underlay.center = { x: 2.25, y: 3.5 }; plan.underlay.widthMeters = 8.25;
  files['plan.json'] = jsonBytes(plan);
  expect(readProjectPackage(writePackageZip(files)).project.floors[0].backgroundImage).toMatchObject({ position: { x: 225, y: 350 }, scale: 825, opacity: 0.25, locked: false });
});
it('reads actual Swift import/edit/export output and preserves the original web representation', () => {
  const result: any = readProjectPackage(new Uint8Array(readFileSync('tests/fixtures/swift-return-project-package.zip'))).project;
  expect(result.floors[0].walls[0]).toMatchObject({ thickness: 37.25, startHeight: 273.5, endHeight: 123.75, texture: 'future-texture' });
  expect(result.floors[0].furniture[0]).toMatchObject({ width: 78.75, scale: { x: -2, y: 1.5, z: 1 }, future: 'furniture extension' });
  expect(result.floors[0].textAnnotations[0].text).toBe('Edited in Swift');
  expect(result.floors[0].elevation).toBe(47.25);
  expect(result.vendor).toEqual({ preserve: ['all', 'web', 'extensions'] });
});
it('keeps object metadata and identities when native edits move an object to another floor', () => {
  const project = readProjectPackage(writePackageZip(nativeFiles())).project;
  const files = readPackageZip(projectPackageBytes(project)), plan = packageJSON(files['plan.json']);
  plan.furniture[0].level = 2; files['plan.json'] = jsonBytes(plan);
  const result = readProjectPackage(writePackageZip(files)).project;
  expect(result.floors[0].furniture).toHaveLength(0); expect(result.floors[1].furniture).toHaveLength(1);
  const returned = packageJSON(readPackageZip(projectPackageBytes(result))['plan.json']);
  expect(returned.furniture[0]).toMatchObject({ id: plan.furniture[0].id, level: 2, price: 456.75, note: 'Keep furniture note', photos: ['chair.png'] });
});
it('does not fetch or activate external project images through package exchange', () => {
  const project = webFixture(); project.floors[0].backgroundImage.dataUrl = 'https://example.invalid/remote.png';
  expect(() => projectPackageBytes(project)).toThrow(/embedded raster images/);
  const files = readPackageZip(projectPackageBytes(webFixture())); files['web.json'] = jsonBytes(project);
  expect(() => readProjectPackage(writePackageZip(files))).toThrow(/embedded raster images/);
});
it('rejects extreme finite coordinates, dimensions and angles before rendering', () => {
  for (const damage of [
    (plan: any) => { plan.walls[0].start.x = 1e200; },
    (plan: any) => { plan.walls[0].thickness = 20; },
    (plan: any) => { plan.furniture[0].angle = 1e200; },
    (plan: any) => { plan.openings[0].sillHeight = 1e200; },
    (plan: any) => { plan.levels[0].index = 10000000; },
  ]) {
    const plan = native(); damage(plan);
    expect(() => validatePackagePlan(plan)).toThrow(/invalid geometry/);
  }
});
it('rejects attachment directories that collide with native session files', () => {
  const files: Record<string, Uint8Array> = nativeFiles(); files['assets/plan-json/photo.png'] = pixel;
  const bytes = writePackageZip(files);
  // Model an external archive: alter both filename headers without changing file CRCs.
  for (const offset of [...Buffer.from(bytes).toString('latin1').matchAll(/assets\/plan-json\/photo.png/g)].map(match => match.index!)) bytes[offset + 11] = 46;
  expect(() => readProjectPackage(bytes)).toThrow(/unsafe file path/);
});
it.each(['missing-photo', 'duplicate-key', 'future-version', 'damaged-geometry', 'incomplete-return', 'reserved-attachment'])('rejects %s before importing anything', async kind => {
  const files: Record<string, Uint8Array> = nativeFiles();
  if (kind === 'missing-photo') delete files['assets/chair.png'];
  if (kind === 'duplicate-key') files['manifest.json'] = new TextEncoder().encode('{"format":"openplan3d-project","version":1,"version":1}');
  if (kind === 'future-version') files['manifest.json'] = jsonBytes({ ...packageJSON(files['manifest.json']), version: 2 });
  if (kind === 'damaged-geometry') { const p = packageJSON(files['plan.json']); p.walls[0].thickness = -1; files['plan.json'] = jsonBytes(p); }
  if (kind === 'incomplete-return') files['web.json'] = jsonBytes(webFixture());
  if (kind === 'reserved-attachment') files['assets/plan.json'] = pixel;
  const open = vi.spyOn(indexedDB, 'open');
  await expect(prepareProjectPackage(new File([writePackageZip(files)], 'bad.zip'))).rejects.toThrow();
  expect(open).not.toHaveBeenCalled();
});
it('preview is read-only, quota rollback retains existing work, and retry commits one independent copy', async () => {
  const store = createLocalStore(), source = roomProject(); await store.save(source);
  loadProject(source); updateProjectName('Pending work');
  const active = get(currentProject), before = await rawRecords();
  const preview = await prepareProjectPackage(new File([writePackageZip(nativeFiles())], 'native.zip'));
  expect(await rawRecords()).toEqual(before); expect(get(currentProject)).toBe(active);
  const failure = failWrites('projects');
  await expect(preview.restore()).rejects.toThrow(); expect(await rawRecords()).toEqual(before);
  failure();
  const restored = await preview.restore(); await preview.restore();
  expect(await store.list()).toHaveLength(2); expect(get(currentProject)).toBe(active);
  expect(restored.projects[0].name).toBe('QA Project Package (Imported copy)');
});
it('emits shared contract fixtures when explicitly requested', () => {
  if (!process.env.OPENPLAN_PACKAGE_FIXTURES) return;
  mkdirSync(process.env.OPENPLAN_PACKAGE_FIXTURES, { recursive: true });
  writeFileSync(`${process.env.OPENPLAN_PACKAGE_FIXTURES}/native-project-package.zip`, writePackageZip(nativeFiles()));
  writeFileSync(`${process.env.OPENPLAN_PACKAGE_FIXTURES}/web-project-package.zip`, projectPackageBytes(webFixture()));
});

it.each([-90, 37.25, 180])('shares a tracing image rotated %s degrees without changing its bytes or web controls', rotation => {
  const source = webFixture();
  source.floors[0].backgroundImage!.rotation = rotation;
  const files = readPackageZip(projectPackageBytes(source));
  const plan = packageJSON(files['plan.json']);
  expect(plan.underlay.angle).toBeCloseTo(rotation * Math.PI / 180, 12);
  expect(files[`assets/${plan.underlay.imageFilename}`]).toEqual(pixel);
  expect(readProjectPackage(writePackageZip(files)).project.floors[0].backgroundImage).toEqual(source.floors[0].backgroundImage);
  plan.underlay.angle = -Math.PI / 4;
  files['plan.json'] = jsonBytes(plan);
  expect(readProjectPackage(writePackageZip(files)).project.floors[0].backgroundImage).toEqual({ ...source.floors[0].backgroundImage, rotation: -45 });
  delete plan.underlay.angle;
  files['plan.json'] = jsonBytes(plan);
  expect(readProjectPackage(writePackageZip(files)).project.floors[0].backgroundImage).toEqual({ ...source.floors[0].backgroundImage, rotation: 0 });
});
it('rejects invalid native tracing image angles', () => {
  for (const angle of ['90', 100_001, -100_001]) {
    const files = nativeFiles(), plan = packageJSON(files['plan.json']);
    plan.underlay.angle = angle;
    files['plan.json'] = jsonBytes(plan);
    expect(() => readProjectPackage(writePackageZip(files))).toThrow();
  }
});
