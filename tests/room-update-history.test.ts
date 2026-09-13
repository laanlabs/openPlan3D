import { beforeEach, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { get } from 'svelte/store';
import { currentProject, updateRoom, undo, redo, detectedRoomsStore, beginUndoGroup, endUndoGroup } from '$lib/stores/project';
import { resolveRooms } from '$lib/utils/roomDetection';
import { roomProject } from './fixtures/project';

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

it.each([true, false])('restores grouped label drags without resurrecting preview offsets (saved=%s)', saved => {
  const project = roomProject();
  const floor = project.floors[0];
  const detected = resolveRooms(floor);
  const room = { ...detected[0], id: 'stable-label-room' };
  floor.rooms = saved ? [room] : [];
  currentProject.set(project);
  detectedRoomsStore.set([room]);
  const before = structuredClone(floor.rooms);
  const offset = { x: 40, y: 15 };

  beginUndoGroup();
  const preview = [{ ...room, labelOffset: offset }];
  detectedRoomsStore.set(preview);
  expect(get(currentProject)!.floors[0].rooms).toEqual(before);
  updateRoom(room.id, { labelOffset: offset });
  endUndoGroup('Move room label');
  const edited = structuredClone(get(currentProject)!.floors[0].rooms);
  expect(edited[0].labelOffset).toEqual(offset);

  for (let repeat = 0; repeat < 2; repeat++) {
    undo();
    const restored = get(currentProject)!.floors[0];
    expect(restored.rooms).toEqual(before);
    const resolved = resolveRooms(restored, preview);
    expect(resolved[0].id).toBe(room.id);
    expect(resolved[0].labelOffset).toBeUndefined();
    redo();
    expect(get(currentProject)!.floors[0].rooms).toEqual(edited);
    expect(resolveRooms(get(currentProject)!.floors[0], resolved)[0].labelOffset).toEqual(offset);
  }
});
