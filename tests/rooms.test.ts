import { expect, it } from 'vitest';
import { resolveRooms } from '$lib/utils/roomDetection';
import { rectangleWalls, roomProject } from './fixtures/project';

it('records the centerline area convention for the shared native rectangle baseline', () => {
  const floor = roomProject().floors[0];
  floor.walls = floor.walls.map(wall => ({ ...wall, thickness: 20 }));
  expect(resolveRooms(floor)).toHaveLength(1);
  expect(resolveRooms(floor)[0].area).toBe(12);
  // Native's current free-interior raster reports 10.64 m² for this geometry.
  // Keep this baseline explicit until the cross-platform convention is aligned.
});

it('preserves custom room metadata by wall identity after geometry changes', () => {
  const floor = roomProject().floors[0];
  const detected = resolveRooms(floor)[0];
  floor.rooms = [{ ...detected, id: 'custom-room', name: 'Kitchen & Dining', floorTexture: 'tile',
    color: '#abcdef', roomType: 'utility', labelOffset: { x: 10, y: 20 }, walls: [...detected.walls].reverse() }];
  floor.walls = floor.walls.map(wall => ({ ...wall,
    start: { x: wall.start.x * 2, y: wall.start.y }, end: { x: wall.end.x * 2, y: wall.end.y } }));
  const rooms = resolveRooms(floor);
  expect(rooms).toHaveLength(1);
  expect(rooms[0]).toMatchObject({ id: 'custom-room', name: 'Kitchen & Dining', floorTexture: 'tile',
    color: '#abcdef', roomType: 'utility', labelOffset: { x: 10, y: 20 }, area: 24 });
  expect(floor.rooms[0].area).toBe(12);
});

it('retains unlabeled rooms when only part of a floor has saved metadata', () => {
  const floor = roomProject().floors[0];
  floor.walls.push(...rectangleWalls('b', 600));
  const detected = resolveRooms(floor);
  floor.rooms = [{ ...detected[0], name: 'Office' }];
  const rooms = resolveRooms(floor);
  expect(rooms).toHaveLength(2);
  expect(rooms[0].name).toBe('Office');
  expect(rooms[1].name).toBe('Room 2');
});

it('does not mix metadata between rooms with the same display name', () => {
  const floor = roomProject().floors[0];
  floor.walls.push(...rectangleWalls('b', 600));
  floor.rooms = resolveRooms(floor).map((room, i) => ({ ...room, name: 'Bedroom', floorTexture: i ? 'tile' : 'carpet' }));
  expect(resolveRooms(floor).map(room => room.floorTexture)).toEqual(['carpet', 'tile']);
});

it('does not resurrect undone metadata from a previous canvas frame', () => {
  const floor = roomProject().floors[0];
  const previous = resolveRooms(floor).map(room => ({ ...room, id: 'stable-id', name: 'Undone rename' }));
  expect(resolveRooms(floor, previous)[0]).toMatchObject({ id: 'stable-id', name: 'Room 1' });
});

it('drops rooms that no longer form a closed boundary', () => {
  const floor = roomProject().floors[0];
  floor.rooms = resolveRooms(floor);
  floor.walls.pop();
  expect(resolveRooms(floor)).toEqual([]);
});
