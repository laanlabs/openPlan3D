import { expect, it } from 'vitest';
import type { Room, Wall } from '$lib/models/types';
import { detectRooms, getRoomPolygon, resolveRoomGeometry, resolveRooms } from '$lib/utils/roomDetection';
import { rectangleWalls } from './fixtures/project';

// Dead-end partitions inside the 400x300 fixture room: each starts on a boundary
// wall (T-junction) or on another stub and its free end touches nothing.
const stub = (id: string, x: number, y: number, xx: number, yy: number): Wall =>
  ({ ...rectangleWalls()[0], id, start: { x, y }, end: { x: xx, y: yy } });
const peninsula = stub('peninsula', 100, 300, 100, 200);
const closet = stub('closet', 300, 0, 300, 80);
const third = stub('third', 400, 150, 280, 150);
const closetReturn = stub('closet-return', 300, 80, 240, 80);
const curved: Wall = { ...stub('curve', 200, 300, 300, 200), curvePoint: { x: 200, y: 200 } };
const area = (poly: { x: number; y: number }[]) => Math.abs(poly.reduce((s, p, i) => {
  const q = poly[(i + 1) % poly.length]; return s + p.x * q.y - q.x * p.y;
}, 0)) / 20000;

function expectWholeRoom(walls: Wall[]): Room {
  const rooms = detectRooms(walls);
  expect(rooms).toHaveLength(1);
  expect(rooms[0].area).toBe(12);
  const poly = getRoomPolygon(rooms[0], walls);
  expect(area(poly)).toBe(12);
  expect(poly.every(p => p.x >= 0 && p.x <= 400 && p.y >= 0 && p.y <= 300)).toBe(true);
  return rooms[0];
}

it('keeps a room that contains two or three T-junction stubs', () => {
  const room = expectWholeRoom([...rectangleWalls(), peninsula, closet]);
  expect([...room.walls].sort()).toEqual(['a-0', 'a-1', 'a-2', 'a-3', 'closet', 'peninsula']);
  expectWholeRoom([...rectangleWalls(), peninsula, closet, third]);
});

it('keeps a room around a closet return and a curved stub whose free ends touch nothing', () => {
  expectWholeRoom([...rectangleWalls(), closet, closetReturn]);
  expectWholeRoom([...rectangleWalls(), curved]);
});

it('finds the room whichever order and direction the walls were drawn in', () => {
  const stubs = [peninsula, closet, closetReturn, curved];
  for (const walls of [[...stubs, ...rectangleWalls()], [...rectangleWalls(), ...stubs].reverse()]) {
    expectWholeRoom(walls);
    expectWholeRoom(walls.map(w => ({ ...w, start: w.end, end: w.start })));
  }
});

it('does not turn exterior stubs or a floating partition into rooms', () => {
  const room = expectWholeRoom([...rectangleWalls(), stub('out-a', 100, 300, 100, 400),
    stub('out-b', 300, 0, 300, -80), stub('floating', 150, 100, 250, 100)]);
  expect([...room.walls].sort()).toEqual(['a-0', 'a-1', 'a-2', 'a-3']);
});

it('resolves saved metadata and the slab footprint with stubs present', () => {
  const floor = { walls: [...rectangleWalls(), peninsula, closet], rooms: [] as Room[] };
  floor.rooms = [{ ...resolveRooms(floor)[0], id: 'kitchen', name: 'Kitchen', floorTexture: 'tile' }];
  expect(resolveRooms(floor)).toMatchObject([{ id: 'kitchen', name: 'Kitchen', floorTexture: 'tile', area: 12 }]);
  const geometry = resolveRoomGeometry(floor);
  expect(geometry).toHaveLength(1);
  expect(area(geometry[0].polygon)).toBe(12);
});
