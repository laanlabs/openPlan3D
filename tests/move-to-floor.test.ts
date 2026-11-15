import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { Floor } from '$lib/models/types';
import { movePlanSelection } from '$lib/utils/moveToFloor';
import { createDefaultFloor, currentProject, loadProject, moveSelectionToFloor, redo, selectedElementId, selectedElementIds, undo, undoHistoryStore } from '$lib/stores/project';
import { rectangleWalls, roomProject } from './fixtures/project';

const ids = (items: { id: string }[]) => items.map(item => item.id);
let counter = 0;
const uid = () => `new-${++counter}`;

/** Two rooms side by side (a-*, b-*), openings on a-0 and b-0, a sofa, a stair, a note and two groups. */
function furnished(): Floor {
  const floor = createDefaultFloor(0);
  floor.walls = [...rectangleWalls('a'), ...rectangleWalls('b', 600)];
  floor.doors = [{ id: 'door-a', wallId: 'a-0', position: 0.5, width: 90, height: 210, type: 'single', swingDirection: 'left', flipSide: false }];
  floor.windows = [{ id: 'win-b', wallId: 'b-0', position: 0.5, width: 120, height: 120, sillHeight: 90, type: 'standard' } as any];
  floor.rooms = [
    { id: 'room-a', name: 'Kitchen', walls: ['a-0', 'a-1', 'a-2', 'a-3'], floorTexture: 'tile', area: 12 },
    { id: 'room-b', name: 'Den', walls: ['b-0', 'b-1', 'b-2', 'b-3'], floorTexture: 'carpet', area: 12 },
  ];
  floor.furniture = [{ id: 'sofa', catalogId: 'sofa', position: { x: 200, y: 150 }, rotation: 0, scale: { x: 1, y: 1, z: 1 } }];
  floor.stairs = [{ id: 'stair', position: { x: 800, y: 150 }, rotation: 0, width: 100, depth: 300, riserCount: 14, direction: 'up', stairType: 'straight' }];
  floor.textAnnotations = [{ id: 'note', x: 50, y: 50, text: 'Pantry', fontSize: 14, color: '#000', rotation: 0 }];
  floor.groups = [
    { id: 'group-a', elementIds: ['a-0', 'a-1', 'sofa'] },
    { id: 'group-mixed', elementIds: ['sofa', 'stair', 'note'] },
  ];
  return floor;
}

describe('movePlanSelection', () => {
  beforeEach(() => { counter = 0; });

  it('moves walls with their openings and rooms, keeping positions, and leaves the rest', () => {
    const source = furnished(), target = createDefaultFloor(1);
    const before = structuredClone(source);
    const moved = movePlanSelection(source, target, new Set(['a-0', 'a-1', 'a-2', 'a-3', 'sofa', 'note']), uid);

    expect(moved).toEqual(['a-0', 'a-1', 'a-2', 'a-3', 'door-a', 'sofa', 'note']);
    expect(target.walls).toEqual(before.walls.slice(0, 4));
    expect(target.doors).toEqual(before.doors);
    expect(target.furniture).toEqual(before.furniture);
    expect(target.textAnnotations).toEqual(before.textAnnotations);
    expect(ids(target.rooms)).toEqual(['room-a']);
    expect(target.rooms[0]).toEqual(before.rooms[0]);
    // Everything that wasn't selected stays put.
    expect(ids(source.walls)).toEqual(['b-0', 'b-1', 'b-2', 'b-3']);
    expect(ids(source.windows)).toEqual(['win-b']);
    expect(ids(source.rooms)).toEqual(['room-b']);
    expect(ids(source.stairs)).toEqual(['stair']);
    expect(source.doors).toEqual([]);
    expect(source.furniture).toEqual([]);
  });

  it('moves whole groups, and takes moved members out of groups that stay', () => {
    const source = furnished(), target = createDefaultFloor(1);
    movePlanSelection(source, target, new Set(['a-0', 'a-1', 'sofa']), uid);
    expect(target.groups).toEqual([{ id: 'group-a', elementIds: ['a-0', 'a-1', 'sofa'] }]);
    expect(source.groups).toEqual([{ id: 'group-mixed', elementIds: ['stair', 'note'] }]);
    movePlanSelection(source, target, new Set(['stair']), uid);
    expect(source.groups).toEqual([]); // one member left is no longer a group
  });

  it('keeps a room whose walls only partly move, and an opening selected without its wall', () => {
    const source = furnished(), target = createDefaultFloor(1);
    const moved = movePlanSelection(source, target, new Set(['a-1', 'door-a']), uid);
    expect(moved).toEqual(['a-1']);
    expect(ids(source.rooms)).toEqual(['room-a', 'room-b']);
    expect(ids(source.doors)).toEqual(['door-a']);
    expect(target.rooms).toEqual([]);
    expect(target.doors).toEqual([]);
  });

  it('re-issues ids already used on the target floor and updates every reference', () => {
    const source = furnished(), target = createDefaultFloor(1);
    target.walls = rectangleWalls('a', 2000); // a-0…a-3 are taken upstairs
    target.furniture = [{ id: 'sofa', catalogId: 'chair', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1, z: 1 } }];
    const moved = movePlanSelection(source, target, new Set(['a-0', 'a-1', 'a-2', 'a-3', 'sofa']), uid);
    expect(moved).toEqual(['new-1', 'new-2', 'new-3', 'new-4', 'door-a', 'new-5']);
    expect(new Set(ids(target.walls)).size).toBe(8);
    expect(target.doors[0].wallId).toBe('new-1');
    expect(target.rooms[0].walls).toEqual(['new-1', 'new-2', 'new-3', 'new-4']);
    expect(target.groups).toEqual([{ id: 'group-a', elementIds: ['new-1', 'new-2', 'new-5'] }]);
    expect(target.walls[0].start).toEqual({ x: 2000, y: 0 }); // the upstairs walls are untouched
  });

  it('does nothing when nothing selected is on the floor', () => {
    const source = furnished(), target = createDefaultFloor(1);
    const before = JSON.stringify([source, target]);
    expect(movePlanSelection(source, target, new Set(['missing']), uid)).toEqual([]);
    expect(JSON.stringify([source, target])).toBe(before);
  });
});

describe('moveSelectionToFloor', () => {
  let upstairs: string;
  beforeEach(() => {
    const project = roomProject(), floor = { ...createDefaultFloor(1), name: 'Upstairs' };
    project.floors.push(floor);
    upstairs = floor.id;
    loadProject(project);
  });

  it('moves the selection in one undo step and shows it selected on the target floor', () => {
    const groundId = get(currentProject)!.floors[0].id;
    const moved = moveSelectionToFloor(new Set(['a-0', 'a-1', 'a-2', 'a-3']), upstairs);
    expect(moved).toEqual(['a-0', 'a-1', 'a-2', 'a-3']);
    const p = get(currentProject)!;
    expect(p.activeFloorId).toBe(upstairs);
    expect(p.floors[0].walls).toEqual([]);
    expect(ids(p.floors[1].walls)).toEqual(moved);
    expect([...get(selectedElementIds)]).toEqual(moved);
    expect(get(undoHistoryStore).entries.map(entry => entry.description)).toEqual(['Moved to floor']);
    undo();
    expect(ids(get(currentProject)!.floors[0].walls)).toEqual(moved);
    expect(get(currentProject)!.floors[1].walls).toEqual([]);
    expect(get(currentProject)!.activeFloorId).toBe(groundId);
    redo();
    expect(ids(get(currentProject)!.floors[1].walls)).toEqual(moved);
  });

  it('selects a single moved element as the primary selection', () => {
    moveSelectionToFloor(new Set(['a-2']), upstairs);
    expect(get(selectedElementId)).toBe('a-2');
  });

  it('ignores the active floor, a missing floor, an empty selection and unknown ids', () => {
    const ground = get(currentProject)!.floors[0].id;
    expect(moveSelectionToFloor(new Set(['a-0']), ground)).toEqual([]);
    expect(moveSelectionToFloor(new Set(['a-0']), 'missing')).toEqual([]);
    expect(moveSelectionToFloor(new Set(), upstairs)).toEqual([]);
    expect(moveSelectionToFloor(new Set(['missing']), upstairs)).toEqual([]);
    expect(get(undoHistoryStore).entries).toHaveLength(0);
    expect(get(currentProject)!.floors[0].walls).toHaveLength(4);
  });
});
