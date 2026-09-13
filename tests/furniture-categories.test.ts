import { beforeEach, expect, it } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as THREE from 'three';
import cases from './fixtures/furniture-categories.json';
import { importedFurnitureCategory } from '$lib/utils/furnitureCategories';
import { furnitureCatalog, getCatalogItem, getFurnitureSize } from '$lib/utils/furnitureCatalog';
import { createFurnitureModel } from '$lib/utils/furnitureModels3d';
import { getModelFile } from '$lib/utils/furnitureModelFiles';
import { disposeModel } from '$lib/utils/furnitureModelResources';
import { projectPackageBytes, readProjectPackage } from '$lib/services/projectPackage';
import { jsonBytes, packageJSON, readPackageZip, writePackageZip } from '$lib/utils/projectPackageZip';
import { createProjectFromRoomPlan } from '$lib/utils/roomplanImport';
import { createLocalStore } from '$lib/services/datastore';
import { roomProject } from './fixtures/project';
import { mockStorage } from './fixtures/indexeddb';

beforeEach(() => { mockStorage(); });

function nativeFiles(rows = cases.cases) {
  const plan = JSON.parse(readFileSync('tests/fixtures/handoff-plan.json', 'utf8'));
  plan.furniture = rows.map((row, i) => ({
    id: `00000000-0000-4000-8000-${String(1000 + i).padStart(12, '0')}`,
    category: row.category, width: row.widthCm / 100, depth: 0.83125,
    center: { x: 0.6 + i % 3 * 1.8, y: 0.7 + Math.floor(i / 3) * 1.3 }, angle: Math.PI / 7,
    note: 'Keep category notes', price: 12.345, level: 0, future: { retain: i },
  }));
  return { 'manifest.json': jsonBytes({ format: 'openplan3d-project', version: 1, producer: 'ios', title: 'QA Furniture Categories' }), 'plan.json': jsonBytes(plan) };
}
function nativeProject() {
  const selected = ['bed', 'refrigerator', 'sink', 'washerDryer', 'washerdryer', 'sofa', 'stairs', 'future-appliance'];
  return readProjectPackage(writePackageZip(nativeFiles(cases.cases.filter(row => selected.includes(row.category) && row.widthCm > 140)))).project;
}
function webProject() {
  const project = roomProject(); project.name = 'QA Web Furniture Categories';
  project.floors[0].furniture = ['bed_queen', 'fridge', 'sink_k', 'washer_dryer', 'loveseat', 'bed_twin', 'imported_object'].map((catalogId, i) => ({
    id: `web-category-${i}`, catalogId, ...(catalogId === 'imported_object' ? { sourceCategory: 'future-appliance' } : {}),
    width: 81.125, depth: 57.375, height: 94.625, position: { x: 60 + i % 3 * 180, y: 70 + Math.floor(i / 3) * 130 },
    rotation: 17.25, scale: { x: -1.25, y: 1.125, z: 1 }, color: '#245678',
  }));
  return project;
}

it.each(cases.cases)('maps $category ($widthCm cm) using the shared display contract', row => {
  const result = importedFurnitureCategory(row.category, row.widthCm);
  expect(result.catalogId).toBe(row.catalogId);
  expect(getCatalogItem(result.catalogId)).toBeDefined();
  if (row.catalogId === 'imported_object') expect(result.sourceCategory).toBe(row.category);
});
it('preserves all exact catalog IDs independently of footprint size', () => {
  for (const item of furnitureCatalog) expect(importedFurnitureCategory(item.id, 0.125)).toEqual({ catalogId: item.id });
  expect(furnitureCatalog.some(item => ['stairs', 'imported_object'].includes(item.id))).toBe(false);
});
it('retains categories, IDs, fractional geometry and unknown fields through repeated native package returns', async () => {
  const files = nativeFiles(), original = packageJSON(files['plan.json']);
  let project = readProjectPackage(writePackageZip(files)).project;
  const store = createLocalStore(); await store.save(project); project = (await store.load(project.id))!;
  for (let pass = 0; pass < 3; pass++) {
    const bytes = projectPackageBytes(project);
    expect(packageJSON(readPackageZip(bytes)['plan.json'])).toEqual(original);
    project = readProjectPackage(bytes).project;
  }
  project.floors[0].furniture.forEach(item => { item.width = 122.875; item.rotation = 32.75; item.details = { ...item.details, note: 'Web edit' }; });
  const returned = packageJSON(readPackageZip(projectPackageBytes(project))['plan.json']);
  returned.furniture.forEach((item: any, i: number) => {
    expect(item).toMatchObject({ category: original.furniture[i].category, id: original.furniture[i].id, width: 1.22875, note: 'Web edit', future: { retain: i } });
    expect(item.angle).toBeCloseTo(32.75 * Math.PI / 180);
  });
});
it('lets a deliberate catalog replacement change category without retaining stale unknown provenance', () => {
  const project = nativeProject(), item = project.floors[0].furniture.at(-1)!;
  item.catalogId = 'chair';
  const returned = packageJSON(readPackageZip(projectPackageBytes(project))['plan.json']);
  expect(returned.furniture.at(-1).category).toBe('chair');
});
it('repairs legacy package chair fallbacks without changing dimensions, metadata or explicit replacements', () => {
  const files = readPackageZip(projectPackageBytes(nativeProject()));
  const baseline = packageJSON(files['baseline.json']), source = packageJSON(files['web.json']);
  delete baseline.openplanFurnitureCategoriesVersion;
  for (const item of source.floors[0].furniture) item.catalogId = 'chair';
  source.floors[0].furniture[3].catalogId = 'desk';
  files['baseline.json'] = jsonBytes(baseline); files['web.json'] = jsonBytes(source);
  const result = readProjectPackage(writePackageZip(files)).project;
  expect(result.floors[0].furniture.map(f => f.catalogId)).toEqual(['chair', 'stairs', 'bed_queen', 'desk', 'sink_b', 'washer_dryer', 'washer_dryer', 'imported_object']);
  result.floors[0].furniture.forEach((item, i) => expect(item).toMatchObject({ width: source.floors[0].furniture[i].width, details: source.floors[0].furniture[i].details }));
});
it('rejects unknown future category contracts', () => {
  const files = readPackageZip(projectPackageBytes(nativeProject()));
  const baseline = packageJSON(files['baseline.json']); baseline.openplanFurnitureCategoriesVersion = 2;
  files['baseline.json'] = jsonBytes(baseline);
  expect(() => readProjectPackage(writePackageZip(files))).toThrow(/furniture-category baseline/);
});
it('exporting older saved projects cannot turn retained native categories into chairs', () => {
  const project = nativeProject(), state = (project as any).projectPackage;
  delete state.furnitureCategoriesVersion;
  const categories = state.native.furniture.map((f: any) => f.category);
  for (const item of project.floors[0].furniture) if (!furnitureCatalog.some(def => def.id === item.catalogId)) item.catalogId = 'chair';
  // Model the old persisted projection for aliases too.
  project.floors[0].furniture[2].catalogId = 'chair';
  project.floors[0].furniture[2].width = 121.875;
  const files = readPackageZip(projectPackageBytes(project));
  expect(packageJSON(files['plan.json']).furniture.map((f: any) => f.category)).toEqual(categories);
  expect(packageJSON(files['plan.json']).furniture[2].width).toBe(1.21875);
  expect(project.floors[0].furniture[2].catalogId).toBe('chair'); // Serialization does not mutate the open editor.
  const moved = project.floors[0].furniture.splice(2, 1)[0]; project.floors[1].furniture.push(moved);
  const movedPlan = packageJSON(readPackageZip(projectPackageBytes(project))['plan.json']);
  expect(movedPlan.furniture.find((f: any) => f.id === moved.id)).toMatchObject({ category: 'bed', width: 1.21875, level: project.floors[1].level });
});
it('uses the same mappings for RoomPlan JSON including original unknown names', () => {
  const source = JSON.parse(readFileSync('tests/fixtures/handoff-roomplan.json', 'utf8'));
  source.objects = cases.cases.filter(row => row.category).map((row, i) => ({ identifier: `category-${i}`, category: { [row.category]: {} }, dimensions: [row.widthCm / 100, 0.9, 0.83125], transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, i, 0, 0, 1] }));
  const project = createProjectFromRoomPlan(source, 'Categories');
  expect(project.floors.flatMap(f => f.furniture).map(f => f.catalogId)).toEqual(cases.cases.filter(row => row.category).map(row => row.catalogId));
});
it('renders stairs and unknown objects with bounded procedural geometry and no model files', () => {
  for (const id of ['stairs', 'imported_object']) {
    expect(getModelFile(id)).toBeNull();
    const def = { ...getCatalogItem(id)!, width: 91.125, depth: 232.875, height: 127.625 };
    const model = createFurnitureModel(id, def), bounds = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    expect(bounds.x).toBeCloseTo(def.width); expect(bounds.y).toBeCloseTo(def.height); expect(bounds.z).toBeCloseTo(def.depth);
    expect(model.children).toHaveLength(id === 'stairs' ? 10 : 1); disposeModel(model);
  }
});
it('actual Swift returns retain source identities and apply fractional edits in both directions', () => {
  for (const name of ['native', 'web']) {
    const bytes = new Uint8Array(readFileSync(`tests/fixtures/swift-${name}-categories-return.zip`));
    const files = readPackageZip(bytes), original = packageJSON(files['baseline.json']), plan = packageJSON(files['plan.json']);
    expect(plan.furniture.map((f: any) => f.category)).toEqual(original.furniture.map((f: any) => f.category));
    expect(plan.furniture[0]).toMatchObject({ width: 1.3125, note: 'Native category edit' });
    const project = readProjectPackage(bytes).project;
    expect(getFurnitureSize(project.floors[0].furniture[0]).width).toBeCloseTo(131.25);
    expect(project.floors[0].furniture[0].details?.note).toBe('Native category edit');
    // Swift UUID encoding uses uppercase; UUID identity is case-insensitive.
    const normalizeIDs = (items: any[]) => items.map(item => ({ ...item, id: item.id.toLowerCase() }));
    // The old Swift fixture predates reflection/height fields. Its seven web
    // objects share 94.625 cm height and unit Z scale; now share those dimensions.
    const expected = plan.furniture.map((item: any) => name === 'web' ? { ...item, mirrorX: true, height: 0.94625 } : item);
    expect(normalizeIDs(packageJSON(readPackageZip(projectPackageBytes(project))['plan.json']).furniture)).toEqual(normalizeIDs(expected));
    if (name === 'web') expect(project.floors[0].furniture[0]).toMatchObject({ catalogId: 'bed_queen', height: 94.625, scale: { x: -1.25, y: 1.125, z: 1 }, color: '#245678' });
  }
});
it('emits category package fixtures when explicitly requested', () => {
  if (!process.env.OPENPLAN_CATEGORY_FIXTURES) return;
  mkdirSync(process.env.OPENPLAN_CATEGORY_FIXTURES, { recursive: true });
  writeFileSync(`${process.env.OPENPLAN_CATEGORY_FIXTURES}/native-categories-package.zip`, projectPackageBytes(nativeProject()));
  writeFileSync(`${process.env.OPENPLAN_CATEGORY_FIXTURES}/web-categories-package.zip`, projectPackageBytes(webProject()));
});
