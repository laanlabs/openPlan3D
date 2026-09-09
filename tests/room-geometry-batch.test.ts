import { expect, it } from 'vitest';
import { findRoomAt } from '$lib/utils/hitTesting';
import { writeFileSync } from 'node:fs';
import type { Floor } from '$lib/models/types';
import { resolveRooms, resolveRoomGeometry, getRoomPolygon } from '$lib/utils/roomDetection';
import { benchmarkProject } from './fixtures/render-benchmark';
import curved from './fixtures/curved-rooms.openplan.json';
import crossed from './fixtures/crossing-rooms.openplan.json';
import overlapping from './fixtures/overlapping-rooms.openplan.json';

const sequential = (floor: Floor) => resolveRooms(floor).map(room => ({ room, polygon: getRoomPolygon(room, floor.walls) }));
const comparable = (items: ReturnType<typeof resolveRoomGeometry>) => items.map(({ room: { id, ...room }, polygon }) => ({ room, polygon }));

it('reuses one floor graph without changing curved, crossing, overlapping or furnished room results', () => {
 for (const floor of [...curved.floors, ...crossed.floors, ...overlapping.floors, ...benchmarkProject('large').floors] as Floor[]) {
  const before = JSON.stringify(floor);
  expect(comparable(resolveRoomGeometry(floor))).toEqual(comparable(sequential(floor)));
  expect(JSON.stringify(floor)).toBe(before);
 }
 if (process.env.ROOM_GEOMETRY_BENCHMARK) {
  const report = [];
  for (const size of ['small', 'medium', 'large'] as const) {
   const floors = benchmarkProject(size).floors;
   for (const [mode, run] of [['sequential', sequential], ['shared', resolveRoomGeometry]] as const) {
    for (let i = 0; i < 5; i++) floors.map(floor => run(floor));
    const samples = [];
    for (let i = 0; i < 7; i++) {
     const start = performance.now(); for (let repeat = 0; repeat < 20; repeat++) floors.map(floor => run(floor));
     samples.push((performance.now() - start) / 20);
    }
    report.push({ size, mode, medianMs: [...samples].sort((a,b) => a-b)[3], samples });
   }
  }
  writeFileSync('/tmp/openplan3d-room-geometry-benchmark.json', JSON.stringify(report, null, 2));
 }
});

it('recomputes geometry after in-place edits and does not retain mutable polygons between builds', () => {
 const floor = structuredClone(curved.floors[0]) as Floor;
 const first = resolveRoomGeometry(floor);
 floor.walls[0].curvePoint!.y = -600;
 const edited = resolveRoomGeometry(floor);
 expect(edited[0].room.area).toBeGreaterThan(first[0].room.area);
 expect(comparable(edited)).toEqual(comparable(sequential(floor)));
 edited[0].polygon[0].x = 99999;
 expect(resolveRoomGeometry(floor)[0].polygon[0].x).not.toBe(99999);
});

it('preserves transient room IDs and updates supplied hit polygons after a curve edit', () => {
 const floor = structuredClone(curved.floors[0]) as Floor;
 const first = resolveRoomGeometry(floor);
 const initial = new Map(first.map(({ room, polygon }) => [room.id, polygon]));
 expect(findRoomAt({ x: 300, y: -200 }, first.map(g => g.room), floor.walls, initial)).toBeNull();
 floor.walls[0].curvePoint!.y = -600;
 const next = resolveRoomGeometry(floor, first.map(g => g.room));
 expect(next[0].room.id).toBe(first[0].room.id);
 const updated = new Map(next.map(({ room, polygon }) => [room.id, polygon]));
 expect(findRoomAt({ x: 300, y: -200 }, next.map(g => g.room), floor.walls, updated)?.id).toBe(first[0].room.id);
});
