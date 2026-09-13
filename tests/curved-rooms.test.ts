import { expect, it } from 'vitest';
import type { Wall } from '$lib/models/types';
import { detectRooms, getRoomPolygon, resolveRooms } from '$lib/utils/roomDetection';
import { createRoomSlabGeometry } from '$lib/utils/roomSlabGeometry';
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';

const line = (id: string, x: number, y: number, x2: number, y2: number): Wall => ({ id,
  start: { x, y }, end: { x: x2, y: y2 }, thickness: 20, height: 280, color: '#fff' });
const curve = { ...line('curve', 0, 0, 600, 0), curvePoint: { x: 300, y: -300 } };
const walls = [curve, line('right', 600, 0, 600, 400), line('bottom', 600, 400, 0, 400), line('left', 0, 400, 0, 0)];
const area = (poly: { x: number; y: number }[]) => Math.abs(poly.reduce((s, p, i) => {
  const q = poly[(i + 1) % poly.length]; return s + p.x * q.y - q.x * p.y;
}, 0)) / 20000;

it('follows curved room boundaries and recomputes area while retaining metadata and source dimensions', () => {
  const before = JSON.stringify(walls), room = detectRooms(walls)[0], poly = getRoomPolygon(room, walls);
  expect(poly).toHaveLength(19); expect(Math.min(...poly.map(p => p.y))).toBe(-150);
  expect(area(poly)).toBeCloseTo(29.9765625); expect(room.area).toBe(29.98);
  const saved = { ...room, id: 'saved', name: 'Curved room', floorTexture: 'tile' };
  const changed = [{ ...curve, curvePoint: { x: 300, y: -600 } }, ...walls.slice(1)];
  expect(resolveRooms({ walls: changed, rooms: [saved] })[0]).toMatchObject({ id: 'saved', name: 'Curved room', floorTexture: 'tile', area: 35.95 });
  expect(JSON.stringify(walls)).toBe(before);
  const reversed = walls.map(w => ({ ...w, start: w.end, end: w.start })).reverse();
  const reversedRoom = detectRooms(reversed)[0];
  expect(reversedRoom.area).toBe(room.area);
  expect(area(getRoomPolygon(reversedRoom, reversed))).toBeCloseTo(area(poly));
});

it('recognizes a closed room bounded by one curve and one straight wall', () => {
  const source = [curve, line('chord', 600, 0, 0, 0)];
  const rooms = detectRooms(source); expect(rooms).toHaveLength(1);
  expect(rooms[0].area).toBe(5.98);
  expect(getRoomPolygon(rooms[0], source)).toHaveLength(17);
  expect(detectRooms([curve])).toHaveLength(0);
});

it('splits rooms at a T-junction on the curve and prunes the unused half from each polygon', () => {
  const source = [...walls, line('divider', 300, -150, 300, 400)];
  const rooms = detectRooms(source); expect(rooms).toHaveLength(2);
  for (const room of rooms) {
    const poly = getRoomPolygon(room, source);
    expect(room.area).toBe(14.99); expect(area(poly)).toBeCloseTo(14.98828125);
    expect(Math.max(...poly.map(p => p.x)) - Math.min(...poly.map(p => p.x))).toBe(300);
    expect(room.walls).toContain('curve'); expect(room.walls).toContain('divider');
  }
});

it('keeps slab geometry inside outward and inward curved room boundaries', () => {
  for (const [controlY, inside, outside, expectedArea] of [[-300, -100, -200, 29.98], [300, 200, 100, 18.02]]) {
    const source = [{ ...curve, curvePoint: { x: 300, y: controlY } }, ...walls.slice(1)];
    const room = detectRooms(source)[0]; expect(room.area).toBe(expectedArea);
    const poly = getRoomPolygon(room, source), geometry = createRoomSlabGeometry(poly)!;
    const material = new MeshBasicMaterial({ side: DoubleSide }), mesh = new Mesh(geometry, material);
    const probe = (z: number) => new Raycaster(new Vector3(300, 10, z), new Vector3(0, -1, 0), 0, 20).intersectObject(mesh).length;
    expect(probe(inside)).toBeGreaterThan(0); expect(probe(outside)).toBe(0);
    geometry.dispose(); material.dispose();
  }
});
