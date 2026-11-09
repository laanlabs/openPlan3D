// Issue #131: furniture can sit above its floor (wall-mounted TV, picture, plant on a table).
import { afterEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { FurnitureItem, Project } from '$lib/models/types';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { createFurnitureModel } from '$lib/utils/furnitureModels3d';
import { createPlacedFurnitureModel } from '$lib/utils/furnitureModelLoader';
import { disposeModel } from '$lib/utils/furnitureModelResources';
import { defaultFurnitureElevation, furnitureElevation, placedFurnitureY, storedFurnitureElevation, MAX_FURNITURE_ELEVATION } from '$lib/utils/furnitureElevation';
import { readProject } from '$lib/utils/projectValidation';
import { projectToPreparedRoomPlan } from '$lib/utils/interchange';
import { createProjectFromRoomPlan } from '$lib/utils/roomplanImport';
import { validateRoomPlan } from '$lib/utils/roomplanValidation';
import { sceneSignature } from '$lib/utils/sceneSignature';
import { projectPackageBytes, readProjectPackage } from '$lib/services/projectPackage';
import { currentProject, duplicateFurniture, duplicateSelection, loadProject, redo, undo, updateFurniture } from '$lib/stores/project';
import { roomProject } from './fixtures/project';

afterEach(() => vi.restoreAllMocks());

const item = (updates: Partial<FurnitureItem> = {}): FurnitureItem => ({
  id: 'item', catalogId: 'imported_object', position: { x: 100, y: 50 }, rotation: 0, scale: { x: 1, y: 1, z: 1 }, ...updates,
});
const bounds = (model: THREE.Object3D) => new THREE.Box3().setFromObject(model);
const withFurniture = (...furniture: FurnitureItem[]): Project => {
  const project = roomProject();
  project.floors[0].furniture = furniture;
  return project;
};

it('places the model bottom at the saved elevation, defaulting to the floor', () => {
  expect(placedFurnitureY(item())).toBe(1.5);
  expect(furnitureElevation(item())).toBe(0);
  expect(placedFurnitureY(item({ elevation: 0 }))).toBe(1.5);
  expect(placedFurnitureY(item({ elevation: 95.25 }))).toBe(96.75);
  // Damaged in-memory values never move an item out of the scene.
  for (const elevation of [NaN, -1, Infinity, MAX_FURNITURE_ELEVATION + 1]) expect(furnitureElevation(item({ elevation }))).toBe(0);
});

it('keeps wall and ceiling decor at the heights their models already used', () => {
  expect(defaultFurnitureElevation(item({ catalogId: 'wall_art' }))).toBe(120);
  expect(defaultFurnitureElevation(item({ catalogId: 'mirror' }))).toBe(100);
  expect(defaultFurnitureElevation(item({ catalogId: 'clock' }))).toBe(140);
  expect(defaultFurnitureElevation(item({ catalogId: 'wall_sconce' }))).toBe(170);
  expect(defaultFurnitureElevation(item({ catalogId: 'ceiling_light' }))).toBe(245);
  // Ceiling items keep their top at the ceiling as their physical height changes.
  expect(defaultFurnitureElevation(item({ catalogId: 'ceiling_light', height: 20, scale: { x: 1, y: 1, z: 2 } }))).toBe(220);
  expect(defaultFurnitureElevation(item({ catalogId: 'pendant_light' }))).toBe(170);
  // The TV's bundled model stands on the floor, as it always rendered once loaded.
  for (const catalogId of ['television', 'sofa', 'potted_plant', 'imported_object']) expect(defaultFurnitureElevation(item({ catalogId }))).toBe(0);
  // A project model is fitted to the floor whatever its fallback catalog id.
  expect(defaultFurnitureElevation(item({ catalogId: 'wall_art', customModelId: 'box' }))).toBe(0);
  expect(furnitureElevation(item({ catalogId: 'wall_art', elevation: 0 }))).toBe(0);
});

it('stores an edit only when it differs from the default', () => {
  expect(storedFurnitureElevation(item(), 0)).toBeUndefined();
  expect(storedFurnitureElevation(item(), 80)).toBe(80);
  expect(storedFurnitureElevation(item({ catalogId: 'wall_art' }), 120)).toBeUndefined();
  expect(storedFurnitureElevation(item({ catalogId: 'wall_art' }), 0)).toBe(0);
});

it('builds every lifted procedural model from the floor and renders saved items where they were', () => {
  for (const id of ['television', 'wall_art', 'mirror', 'clock', 'wall_sconce', 'ceiling_light', 'chandelier', 'recessed_light', 'pendant_light']) {
    const model = createFurnitureModel(id, getCatalogItem(id)!), min = bounds(model).min.y;
    // The chandelier's arms and bulbs float inside its box rather than touching its bottom.
    if (id === 'chandelier') { expect(min).toBeGreaterThan(0); expect(min).toBeLessThan(getCatalogItem(id)!.height); }
    else expect(min, id).toBeCloseTo(0);
    disposeModel(model);
  }
  // Unchanged rendering for items saved before the field existed (bottom 120 + 1.5 floor offset).
  const art = createPlacedFurnitureModel(item({ catalogId: 'wall_art' }))!;
  expect(bounds(art).min.y).toBeCloseTo(121.5); expect(bounds(art).max.y).toBeCloseTo(181.5);
  const light = createPlacedFurnitureModel(item({ catalogId: 'ceiling_light' }))!;
  expect(bounds(light).max.y).toBeCloseTo(261.5);
  const moved = createPlacedFurnitureModel(item({ catalogId: 'wall_art', elevation: 150 }))!;
  expect(bounds(moved).min.y).toBeCloseTo(151.5);
  [art, light, moved].forEach(disposeModel);
});

it('lifts procedural, scaled and loaded catalog models alike', async () => {
  const plain = createPlacedFurnitureModel(item({ height: 40, elevation: 75 }))!;
  expect(plain.position.y).toBe(76.5);
  expect(bounds(plain).min.y).toBeCloseTo(76.5); expect(bounds(plain).max.y).toBeCloseTo(116.5);
  const scaled = createPlacedFurnitureModel(item({ height: 40, elevation: 75, scale: { x: 1, y: 1, z: 2 } }))!;
  expect(bounds(scaled).min.y).toBeCloseTo(76.5); expect(bounds(scaled).max.y).toBeCloseTo(156.5);

  const source = new THREE.Group();
  source.add(new THREE.Mesh(new THREE.BoxGeometry(10, 6, 1), new THREE.MeshStandardMaterial()));
  source.children[0].position.y = -20; // An off-centre GLB is still fitted to the item's bottom.
  vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue({ scene: source } as any);
  const loaded = vi.fn();
  const tv = createPlacedFurnitureModel(item({ catalogId: 'television', elevation: 110 }), loaded)!;
  expect(bounds(tv).min.y).toBeCloseTo(111.5); // procedural fallback
  await vi.waitFor(() => expect(loaded).toHaveBeenCalled());
  expect(bounds(tv).min.y).toBeCloseTo(111.5); expect(bounds(tv).max.y).toBeCloseTo(181.5);
  [plain, scaled, tv].forEach(disposeModel);
});

it('validates elevation like the neighbouring dimensions and leaves omitted values omitted', () => {
  const valid = readProject(withFurniture(item({ id: 'a', elevation: 0 }), item({ id: 'b', elevation: 152.4 }), item({ id: 'c', elevation: MAX_FURNITURE_ELEVATION }), item({ id: 'd' })));
  expect(valid.floors[0].furniture.map(f => f.elevation)).toEqual([0, 152.4, MAX_FURNITURE_ELEVATION, undefined]);
  expect(valid.floors[0].furniture[3]).not.toHaveProperty('elevation');
  const reloaded = readProject(JSON.parse(JSON.stringify(valid)));
  expect(reloaded.floors[0].furniture).toEqual(valid.floors[0].furniture);
  for (const elevation of [-0.1, MAX_FURNITURE_ELEVATION + 1, Infinity, NaN, '90', null]) {
    expect(() => readProject(withFurniture(item({ elevation: elevation as any }))), String(elevation))
      .toThrow('Invalid project: floors[0].furniture[0].elevation must be a finite number in range.');
  }
});

it('edits through the normal update path with Undo/Redo, duplication and scene invalidation', () => {
  loadProject(withFurniture(item({ id: 'tv', catalogId: 'television' })));
  const before = get(currentProject)!, signature = sceneSignature(before, before.floors[0], false, 'metric');
  updateFurniture('tv', { elevation: 120 });
  const lifted = get(currentProject)!;
  expect(lifted.floors[0].furniture[0].elevation).toBe(120);
  expect(sceneSignature(lifted, lifted.floors[0], false, 'metric')).not.toBe(signature);
  updateFurniture('tv', { elevation: 120 }); // unchanged: no extra history step
  undo(); expect(get(currentProject)!.floors[0].furniture[0].elevation).toBeUndefined();
  redo(); expect(get(currentProject)!.floors[0].furniture[0].elevation).toBe(120);
  const copy = duplicateFurniture('tv')!;
  const [pasted] = duplicateSelection(new Set(['tv']));
  const floor = get(currentProject)!.floors[0];
  expect(floor.furniture.find(f => f.id === copy)?.elevation).toBe(120);
  expect(floor.furniture.find(f => f.id === pasted)?.elevation).toBe(120);
});

it('exports and re-imports the height above the floor through interchange JSON', () => {
  const project = withFurniture(
    item({ id: 'tv', catalogId: 'television', width: 120, depth: 8, height: 70, elevation: 95 }),
    item({ id: 'art', catalogId: 'wall_art', width: 80, depth: 5, height: 60 }),
    item({ id: 'sofa', catalogId: 'sofa', width: 200, depth: 90, height: 80 }),
  );
  const out: any = projectToPreparedRoomPlan(project);
  expect(() => validateRoomPlan(out)).not.toThrow();
  const y = (id: string) => out.objects.find((o: any) => o.identifier === id).transform[13];
  expect(y('tv')).toBeCloseTo(0.95 + 0.35, 8);
  expect(y('art')).toBeCloseTo(1.2 + 0.3, 8);
  expect(y('sofa')).toBeCloseTo(0.4, 8);
  const back = createProjectFromRoomPlan(JSON.parse(JSON.stringify(out)), 'Back').floors[0].furniture;
  const find = (id: string) => back.find(f => f.id === id)!;
  expect(find('tv').elevation).toBeCloseTo(95, 6);
  expect(furnitureElevation(find('art'))).toBeCloseTo(120, 6);
  expect(find('sofa')).not.toHaveProperty('elevation');
});

it('reads the height of prepared objects only, leaving raw Apple captures on the floor', () => {
  const capture = (prepared: boolean) => ({
    ...(prepared ? { openplanPrepared: true, openplanHandoffVersion: 1 } : {}),
    walls: [{ identifier: 'w', dimensions: [4, 2.5, 0.15], transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 1.25, 0, 1] }],
    doors: [], windows: [], openings: [], sections: [],
    objects: [
      { identifier: 'cabinet', category: { wall_cabinet: {} }, dimensions: [0.6, 0.72, 0.35], transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1.45 + 0.36, 1, 1] },
      { identifier: 'table', category: { table: {} }, dimensions: [1, 0.75, 0.6], transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 0.375 + 0.002, 1, 1] },
      { identifier: 'sunken', category: { table: {} }, dimensions: [1, 0.75, 0.6], transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 3, 0, 1, 1] },
    ],
  });
  const prepared = createProjectFromRoomPlan(capture(true), 'Prepared').floors[0].furniture;
  expect(prepared.find(f => f.id === 'cabinet')!.elevation).toBeCloseTo(145, 6);
  expect(prepared.find(f => f.id === 'table')).not.toHaveProperty('elevation');
  expect(prepared.find(f => f.id === 'sunken')).not.toHaveProperty('elevation');
  const raw = createProjectFromRoomPlan(capture(false), 'Raw').floors[0].furniture;
  for (const f of raw) expect(f).not.toHaveProperty('elevation');
});

it('keeps elevation through a project package round trip', () => {
  const project = withFurniture(item({ id: 'tv', catalogId: 'television', elevation: 88.5 }), item({ id: 'sofa', catalogId: 'sofa' }));
  const restored = readProjectPackage(projectPackageBytes(project)).project.floors[0].furniture;
  expect(restored.find(f => f.id === 'tv')!.elevation).toBe(88.5);
  expect(restored.find(f => f.id === 'sofa')).not.toHaveProperty('elevation');
});
