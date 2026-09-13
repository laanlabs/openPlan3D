import { expect, it } from 'vitest';
import type { Wall } from '$lib/models/types';
import { detectRooms, getRoomPolygon, resolveRooms } from '$lib/utils/roomDetection';
const wall = (id: string, x: number, y: number, xx: number, yy: number): Wall => ({ id,
  start: { x, y }, end: { x: xx, y: yy }, thickness: 20, height: 280, color: '#fff' });
const boundary = [wall('top', 0, 0, 600, 0), wall('right', 600, 0, 600, 400), wall('bottom', 600, 400, 0, 400), wall('left', 0, 400, 0, 0)];
const area = (poly: { x: number; y: number }[]) => Math.abs(poly.reduce((s, p, i) => {
 const q = poly[(i + 1) % poly.length]; return s + p.x * q.y - q.x * p.y;
}, 0)) / 20000;

it('traces duplicate boundaries once while retaining every contributing wall ID', () => {
 const source = [...boundary, wall('duplicate', 600, 0, 0, 0)], before = JSON.stringify(source);
 for (const walls of [source, [...source].reverse()]) {
  const rooms = detectRooms(walls); expect(rooms).toHaveLength(1); expect(rooms[0].area).toBe(24);
  expect(rooms[0].walls).toContain('top'); expect(rooms[0].walls).toContain('duplicate');
  expect(area(getRoomPolygon(rooms[0], walls))).toBe(24);
 }
 expect(JSON.stringify(source)).toBe(before);
});

it('handles partial collinear overlaps and duplicate dividers without phantom rooms', () => {
 const source = [...boundary, wall('overlap', 150, 0, 800, 0), wall('divider', 300, -100, 300, 500), wall('divider-copy', 300, 400, 300, 0)];
 for (const walls of [source, [...source].reverse()]) {
  const rooms = detectRooms(walls); expect(rooms).toHaveLength(2);
  for (const room of rooms) {
   expect(room.area).toBe(12); expect(area(getRoomPolygon(room, walls))).toBe(12);
   expect(room.walls).toContain('divider'); expect(room.walls).toContain('divider-copy');
   expect(room.walls).toContain('overlap');
  }
 }
});

it('retains saved metadata when a duplicate or partial-overlap boundary is added', () => {
 const saved = { ...detectRooms(boundary)[0], id: 'saved', name: 'Office', floorTexture: 'tile' };
 for (const extra of [wall('copy', 600, 0, 0, 0), wall('partial', 200, 0, 800, 0)]) {
  expect(resolveRooms({ walls: [...boundary, extra], rooms: [saved] })[0]).toMatchObject({ id: 'saved', name: 'Office', floorTexture: 'tile', area: 24 });
 }
 const source = [...boundary, wall('copy', 600, 0, 0, 0)];
 const ambiguous = resolveRooms({ walls: source, rooms: [saved, { ...saved, id: 'other', name: 'Other' }] });
 expect(ambiguous[0].name).toBe('Room 1');
});
