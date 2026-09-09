import { expect, it } from 'vitest';
import type { Wall } from '$lib/models/types';
import { detectRooms, getRoomPolygon, resolveRooms } from '$lib/utils/roomDetection';
const wall = (id: string, x: number, y: number, xx: number, yy: number): Wall => ({ id,
  start: { x, y }, end: { x: xx, y: yy }, thickness: 20, height: 280, color: '#fff' });
const perimeter = [wall('top', 0, 0, 600, 0), wall('right', 600, 0, 600, 400),
  wall('bottom', 600, 400, 0, 400), wall('left', 0, 400, 0, 0)];
const source = [...perimeter, wall('horizontal', -100, 200, 700, 200), wall('vertical', 300, -100, 300, 500)];
const area = (poly: { x: number; y: number }[]) => Math.abs(poly.reduce((sum, p, i) => {
  const q = poly[(i + 1) % poly.length]; return sum + p.x * q.y - q.x * p.y;
}, 0)) / 20000;

it('splits overhanging crossing dividers into four rooms without changing source walls', () => {
  const before = JSON.stringify(source), rooms = detectRooms(source);
  expect(rooms).toHaveLength(4);
  for (const room of rooms) {
    expect(room.area).toBe(6);
    const poly = getRoomPolygon(room, source); expect(area(poly)).toBe(6);
    expect(poly).toHaveLength(4);
    expect(poly.every(p => p.x >= 0 && p.x <= 600 && p.y >= 0 && p.y <= 400)).toBe(true);
  }
  expect(JSON.stringify(source)).toBe(before);
  const reversed = source.map(w => ({ ...w, start: w.end, end: w.start })).reverse();
  expect(detectRooms(reversed).map(r => r.area)).toEqual([6, 6, 6, 6]);
  const saved = rooms.map((r, i) => ({ ...r, id: `saved-${i}`, name: `Office ${i}`, floorTexture: 'tile' }));
  const resolved = resolveRooms({ walls: reversed, rooms: saved });
  expect(resolved.map(r => r.id).sort()).toEqual(saved.map(r => r.id).sort());
});

it('handles oblique crossings and parallel disjoint walls without phantom rooms', () => {
  const crossed = [...perimeter, wall('diagonal-a', -150, -100, 750, 500), wall('diagonal-b', -150, 500, 750, -100)];
  const rooms = detectRooms(crossed); expect(rooms).toHaveLength(4);
  expect(rooms.reduce((s, r) => s + r.area, 0)).toBe(24);
  for (const room of rooms) expect(area(getRoomPolygon(room, crossed))).toBeCloseTo(room.area);
  expect(detectRooms([wall('a', 0, 0, 600, 0), wall('b', 0, 100, 600, 100)])).toHaveLength(0);
});

it('splits a divider crossing the curved boundary away from curve vertices', () => {
  const curved = [{ ...perimeter[0], curvePoint: { x: 300, y: -300 } }, ...perimeter.slice(1), wall('divider', 280, -300, 280, 500)];
  const rooms = detectRooms(curved); expect(rooms).toHaveLength(2);
  const polygons = rooms.map(r => getRoomPolygon(r, curved));
  expect(polygons.reduce((sum, poly) => sum + area(poly), 0)).toBeCloseTo(29.9765625);
  expect(polygons.every(poly => poly.some(p => Math.abs(p.x - 280) < 1e-8 && p.y < -140))).toBe(true);
});
