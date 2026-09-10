import { beforeEach, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { addFloor, createDefaultFloor, currentProject, loadProject, removeFloor, setActiveFloor, undo, redo, selectedElementId, selectedElementIds, elevationWallId, selectedTool } from '$lib/stores/project';
import { roomProject } from './fixtures/project';
import { updateFloorElevation, updateFloorSlabThickness } from '$lib/stores/project';
import { floorElevations } from '$lib/utils/floors';

beforeEach(() => loadProject(roomProject()));

it('copies wall geometry without sharing editable points with the source floor', () => {
  const source = get(currentProject)!.floors[0];
  source.walls[0].curvePoint = { x: 200, y: -100 };
  const original = JSON.stringify(source);
  addFloor(undefined, 'copy');
  const copied = get(currentProject)!.floors[1];
  expect(copied.walls).toHaveLength(4);
  expect(copied.walls.every(w => !source.walls.some(s => s.id === w.id))).toBe(true);
  copied.walls[0].start.x += 100;
  copied.walls[0].end.y += 100;
  copied.walls[0].curvePoint!.x += 100;
  expect(JSON.stringify(source)).toBe(original);
});

it('adds a unique top level after removing a middle floor, with one-step undo/redo', () => {
  addFloor(undefined, 'empty');
  const middle = get(currentProject)!.activeFloorId;
  addFloor(undefined, 'empty');
  removeFloor(middle);
  addFloor(undefined, 'empty');
  const added = get(currentProject)!.activeFloorId;
  expect(get(currentProject)!.floors.map(f => f.level)).toEqual([0, 2, 3]);
  expect(get(currentProject)!.floors[2].name).toBe('Floor 3');
  undo();
  expect(get(currentProject)!.floors.map(f => f.level)).toEqual([0, 2]);
  redo();
  expect(get(currentProject)!.activeFloorId).toBe(added);
  expect(get(currentProject)!.floors.map(f => f.level)).toEqual([0, 2, 3]);
});

it('seeds only exterior walls and leaves openings, furniture and room metadata downstairs', () => {
  const p = get(currentProject)!;
  const source = p.floors[0];
  source.walls.push({ ...source.walls[0], id: 'partition', start: { x: 200, y: 0 }, end: { x: 200, y: 300 } });
  source.doors.push({ id: 'door', wallId: source.walls[0].id, position: .5, width: 90, height: 210, type: 'single', swingDirection: 'left', flipSide: false });
  addFloor();
  const added = get(currentProject)!.floors[1];
  expect(added.walls).toHaveLength(4);
  expect(added.doors).toEqual([]);
  expect(added.rooms).toEqual([]);
  expect(added.furniture).toEqual([]);
  expect(source.walls).toHaveLength(5);
  expect(source.doors).toHaveLength(1);
  undo();
  expect(get(currentProject)!.floors).toHaveLength(1);
  redo();
  expect(get(currentProject)!.floors[1]).toEqual(added);
});

it('copies the selected floor even when the floor array is unordered', () => {
  const p = get(currentProject)!;
  const upper = createDefaultFloor(4);
  p.floors.unshift(upper);
  setActiveFloor(p.floors[1].id);
  addFloor(undefined, 'copy');
  expect(get(currentProject)!.floors[2]).toMatchObject({ level: 5, name: 'Floor 5' });
  expect(get(currentProject)!.floors[2].walls).toHaveLength(4);
});

it('does not create undo entries when removing a missing or final floor', () => {
  addFloor(undefined, 'empty');
  removeFloor('missing');
  undo();
  expect(get(currentProject)!.floors).toHaveLength(1);
  removeFloor(get(currentProject)!.activeFloorId);
  expect(get(currentProject)!.floors).toHaveLength(1);
});

it('clears selections, unfinished tools and elevation when switching or adding floors', () => {
  const ground = get(currentProject)!.activeFloorId;
  selectedElementId.set('a-0'); selectedElementIds.set(new Set(['a-0']));
  elevationWallId.set('a-0'); selectedTool.set('wall');
  addFloor();
  expect(get(selectedElementId)).toBeNull();
  expect(get(selectedElementIds).size).toBe(0);
  expect(get(elevationWallId)).toBeNull();
  expect(get(selectedTool)).toBe('select');
  elevationWallId.set(get(currentProject)!.floors[1].walls[0].id);
  setActiveFloor(ground);
  expect(get(elevationWallId)).toBeNull();
});

it('changes floor elevations independently of geometry and groups undo by floor', () => {
  addFloor();
  const original = structuredClone(get(currentProject)!.floors);
  const [ground, upper] = original;
  updateFloorElevation(ground.id, -50.5);
  updateFloorElevation(upper.id, 400);
  updateFloorElevation(upper.id, 425.5);
  expect(floorElevations(get(currentProject)!.floors).map(entry => entry.elevation)).toEqual([-50.5, 425.5]);
  expect(get(currentProject)!.floors.map(f => f.walls)).toEqual(original.map(f => f.walls));
  undo();
  expect(floorElevations(get(currentProject)!.floors).map(entry => entry.elevation)).toEqual([-50.5, 300]);
  redo();
  expect(get(currentProject)!.floors[1].elevation).toBe(425.5);
  updateFloorElevation(upper.id);
  expect(get(currentProject)!.floors[1]).not.toHaveProperty('elevation');
  undo();
  expect(get(currentProject)!.floors[1].elevation).toBe(425.5);
});

it('ignores invalid, unchanged and missing-floor edits without consuming undo history', () => {
  const id = get(currentProject)!.activeFloorId;
  updateFloorElevation(id, 40);
  updateFloorElevation(id, 40);
  for (const value of [NaN, Infinity, -Infinity, '400', null]) updateFloorElevation(id, value as number);
  updateFloorElevation('missing', 400);
  undo();
  expect(get(currentProject)!.floors[0]).not.toHaveProperty('elevation');
  redo();
  expect(get(currentProject)!.floors[0].elevation).toBe(40);
});

it('adds a new top floor above adjusted floors and preserves elevations through remove/undo', () => {
  addFloor();
  const upperId = get(currentProject)!.activeFloorId;
  updateFloorElevation(upperId, 425.5);
  addFloor(undefined, 'copy');
  const p = get(currentProject)!;
  expect(p.floors[2]).toMatchObject({ level: 2, elevation: 725.5 });
  removeFloor(upperId);
  expect(floorElevations(get(currentProject)!.floors).map(entry => entry.elevation)).toEqual([0, 725.5]);
  undo();
  expect(floorElevations(get(currentProject)!.floors).map(entry => entry.elevation)).toEqual([0, 425.5, 725.5]);
});


it('edits slab depths independently, validates input and restores defaults with undo', () => {
  addFloor();
  const before = structuredClone(get(currentProject)!.floors);
  const [ground, upper] = before;
  updateFloorSlabThickness(ground.id, 20);
  updateFloorSlabThickness(upper.id, 32.5);
  for (const value of [0, -1, NaN, Infinity, '25', null]) updateFloorSlabThickness(upper.id, value as number);
  updateFloorSlabThickness('missing', 50);
  updateFloorSlabThickness(upper.id, 32.5);
  expect(get(currentProject)!.floors.map(f => f.slabThickness)).toEqual([20, 32.5]);
  expect(get(currentProject)!.floors.map(({ slabThickness, ...f }) => f)).toEqual(before);
  undo();
  expect(get(currentProject)!.floors.map(f => f.slabThickness)).toEqual([20, undefined]);
  redo();
  updateFloorSlabThickness(upper.id);
  expect(get(currentProject)!.floors[1]).not.toHaveProperty('slabThickness');
  undo();
  expect(get(currentProject)!.floors[1].slabThickness).toBe(32.5);
});
