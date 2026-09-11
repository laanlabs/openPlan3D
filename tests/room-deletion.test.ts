import { beforeEach, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { get } from 'svelte/store';
import { currentProject, detectedRoomsStore, removeRoom, undo, redo } from '$lib/stores/project';
import { benchmarkProject } from './fixtures/render-benchmark';

beforeEach(() => detectedRoomsStore.set([]));

for (const saved of [true, false]) it(`deletes ${saved ? 'saved' : 'detected'} room boundaries with one reversible operation`, () => {
  const project = JSON.parse(readFileSync('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  const floor = project.floors[0];
  const target = floor.rooms[0];
  if (!saved) {
    floor.rooms = [];
    detectedRoomsStore.set([target]);
  }
  const otherWall = { ...floor.walls[0], id: 'unrelated-wall', start: { x: 1000, y: 0 }, end: { x: 1300, y: 0 } };
  const otherRoom = { ...target, id: 'unrelated-room', walls: [otherWall.id] };
  floor.walls.push(otherWall); floor.rooms.push(otherRoom);
  currentProject.set(project);
  const before = JSON.parse(JSON.stringify(floor));
  removeRoom(target.id);
  const after = JSON.parse(JSON.stringify(get(currentProject)!.floors[0]));
  expect(after).toEqual({ ...before, rooms: [otherRoom], walls: [otherWall], doors: [], windows: [] });
  expect(get(detectedRoomsStore).some(room => room.id === target.id)).toBe(false);
  undo();
  expect(get(currentProject)!.floors[0]).toEqual(before);
  redo();
  expect(get(currentProject)!.floors[0]).toEqual(after);
});

for (const detected of [false, true]) it(`preserves shared walls and openings used by ${detected ? 'detected' : 'saved'} neighbors`, () => {
  const project = benchmarkProject('small');
  const floor = project.floors[0];
  const target = floor.rooms[0];
  const neighbors = floor.rooms.slice(1);
  const shared = new Set(neighbors.flatMap(room => room.walls));
  const removed = new Set(target.walls.filter(id => !shared.has(id)));
  if (detected) {
    floor.rooms = [target];
    detectedRoomsStore.set(neighbors);
  }
  currentProject.set(project);
  const before = structuredClone(floor);
  removeRoom(target.id);
  const expected = {
    ...before, rooms: detected ? [] : neighbors,
    walls: before.walls.filter(wall => !removed.has(wall.id)),
    doors: before.doors.filter(door => !removed.has(door.wallId)),
    windows: before.windows.filter(win => !removed.has(win.wallId)),
  };
  expect(get(currentProject)!.floors[0]).toEqual(expected);
  undo(); expect(get(currentProject)!.floors[0]).toEqual(before);
  redo(); expect(get(currentProject)!.floors[0]).toEqual(expected);
});
