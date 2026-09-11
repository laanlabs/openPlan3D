import { beforeEach, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { get } from 'svelte/store';
import { currentProject, detectedRoomsStore, removeRoom, undo, redo } from '$lib/stores/project';

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
