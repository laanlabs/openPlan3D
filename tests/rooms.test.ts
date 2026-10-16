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

it('detects a hall over 1000 m² and a room nested in it, and still skips slivers under 0.1 m²', () => {
  // The 400 x 300 cm fixture rectangle scaled by `factor` and moved by `offset` on both axes.
  const scaled = (factor: number, prefix = 'a', offset = 0) => rectangleWalls(prefix).map(wall => ({ ...wall,
    start: { x: wall.start.x * factor + offset, y: wall.start.y * factor + offset },
    end: { x: wall.end.x * factor + offset, y: wall.end.y * factor + offset } }));
  const floor = roomProject().floors[0];
  floor.walls = scaled(10); // 40 x 30 m
  floor.rooms = [{ ...resolveRooms(floor)[0], name: 'Warehouse' }];
  expect(resolveRooms(floor)).toMatchObject([{ name: 'Warehouse', area: 1200 }]);
  floor.walls.push(...scaled(5, 'office', 500)); // a free-standing 20 x 15 m office inside the hall
  const rooms = resolveRooms(floor);
  expect(rooms).toHaveLength(2);
  expect(rooms.find(room => room.name === 'Warehouse')?.area).toBe(900);
  expect(rooms.find(room => room.name !== 'Warehouse')?.area).toBe(300);
  floor.rooms = [];
  floor.walls = scaled(.09); // 36 x 27 cm
  expect(resolveRooms(floor)).toEqual([]);
  floor.walls = scaled(.1); // 40 x 30 cm
  expect(resolveRooms(floor)).toMatchObject([{ area: .12 }]);
});
