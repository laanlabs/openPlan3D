import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import { currentProject, splitWall, undo } from '$lib/stores/project';
import { resolveRooms } from '$lib/utils/roomDetection';
import { roomProject } from './fixtures/project';

for (const joined of [false, true]) it(`wall splitting preserves saved ${joined ? 'partial-boundary rooms' : 'room metadata'}`, () => {
  const project = roomProject();
  const floor = project.floors[0];
  if (joined) {
    floor.walls[0].end = { x: 800, y: 0 };
    floor.walls[2].start = { x: 800, y: 300 };
    floor.walls.push({ ...floor.walls[1], id: 'outer-right', start: { x: 800, y: 0 }, end: { x: 800, y: 300 } });
  }
  floor.rooms = resolveRooms(floor).map((room, index) => ({ ...room, id: `saved-${index}`, name: `Custom ${index}`, floorTexture: 'tile', color: '#abcdef' }));
  expect(floor.rooms).toHaveLength(joined ? 2 : 1);
  currentProject.set(project);
  const before = structuredClone(floor);
  const secondId = splitWall(floor.walls[0].id, .5)!;
  expect(secondId).not.toBeNull();
  const resolved = resolveRooms(get(currentProject)!.floors[0]);
  for (const original of before.rooms) {
    const room = resolved.find(room => room.id === original.id);
    expect(room).toMatchObject({ id: original.id, name: original.name, color: original.color, floorTexture: original.floorTexture, area: original.area });
    expect([...get(currentProject)!.floors[0].rooms.find(room => room.id === original.id)!.walls].sort()).toEqual([...room!.walls].sort());
  }
  undo(); expect(get(currentProject)!.floors[0]).toEqual(before);
});
