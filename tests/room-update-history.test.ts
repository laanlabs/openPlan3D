import { beforeEach, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { get } from 'svelte/store';
import { currentProject, updateRoom, undo, redo, detectedRoomsStore } from '$lib/stores/project';

beforeEach(() => {
  detectedRoomsStore.set([]);
  currentProject.set(JSON.parse(readFileSync('tests/fixtures/connected-dimensions.openplan.json', 'utf8')));
});

it('unchanged room fields neither add Undo steps nor discard Redo', () => {
  const before = structuredClone(get(currentProject)!.floors[0]);
  const room = before.rooms[0];
  updateRoom(room.id, { name: 'Actual edit' });
  const edited = structuredClone(get(currentProject)!.floors[0]);
  updateRoom(room.id, { floorTexture: room.floorTexture });
  updateRoom(room.id, { labelOffset: { ...room.labelOffset! } });
  undo();
  expect(get(currentProject)!.floors[0]).toEqual(before);
  updateRoom(room.id, { name: room.name });
  updateRoom('missing-room', { name: 'Ignored' });
  updateRoom(room.id, {});
  redo();
  expect(get(currentProject)!.floors[0]).toEqual(edited);
});

it('still persists metadata for a newly detected room', () => {
  const project = get(currentProject)!;
  const room = project.floors[0].rooms[0];
  project.floors[0].rooms = [];
  currentProject.set(project);
  detectedRoomsStore.set([room]);
  updateRoom(room.id, { name: room.name });
  expect(get(currentProject)!.floors[0].rooms).toEqual([room]);
  undo();
  expect(get(currentProject)!.floors[0].rooms).toEqual([]);
});
