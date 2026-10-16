import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { projectPackageBytes, readProjectPackage } from '$lib/services/projectPackage';
import { readPackageZip, writePackageZip, jsonBytes, packageJSON } from '$lib/utils/projectPackageZip';
import { resolveRooms } from '$lib/utils/roomDetection';
import { interiorRoomArea } from '$lib/utils/interiorArea';
import { roomProject } from './fixtures/project';

// Paired with native ProjectPackageTests.testExportedPlanCarriesFreshDerivedStatistics.
it('writes a derived statistics block that matches the interior-face area convention', () => {
  const project: any = roomProject();
  project.floors[0].rooms = [{ id: 'room-a', name: 'Studio', walls: ['a-0', 'a-1', 'a-2', 'a-3'], floorTexture: '', area: 12 }];
  project.floors[0].doors = [{ id: 'door-a', wallId: 'a-0', position: 0.5, width: 90, height: 210, type: 'single', swingDirection: 'left', flipSide: false }];
  const files = readPackageZip(projectPackageBytes(project));
  const plan = packageJSON(files['plan.json']), statistics = plan.statistics;
  expect(statistics.version).toBe(1); expect(statistics.units).toBe('metres');
  // 4 m × 3 m centerline rectangle with 15 cm walls: (4 − 0.15) × (3 − 0.15).
  expect(statistics.totals.livingArea).toBeCloseTo(10.9725, 4);
  expect(statistics.totals.grossArea).toBeCloseTo(10.9725 + 14 * 0.15 / 2, 4);
  expect(statistics.totals.wallLength).toBeCloseTo(14, 6);
  expect(statistics.totals.wallAreaGross).toBeCloseTo(14 * 2.5, 6);
  expect(statistics.totals.openingArea).toBeCloseTo(0.9 * 2.1, 6);
  expect(statistics.totals.wallAreaNet).toBeCloseTo(35 - 1.89, 6);
  expect(statistics.totals).toMatchObject({ roomCount: 1, wallCount: 4, doorCount: 1, windowCount: 0, furnitureCount: 0, roomsWithoutArea: 0 });
  expect(statistics.levels.map((level: any) => level.index)).toEqual([0]);
  expect(statistics.levels[0].totals).toEqual(statistics.totals);
  expect(statistics.rooms).toHaveLength(1);
  expect(statistics.rooms[0]).toMatchObject({ id: plan.rooms[0].id, name: 'Studio', level: 0, floorOpening: false, ceilingHeight: 2.4 });
  expect(statistics.rooms[0].floorArea).toBeCloseTo(10.9725, 4);
  expect(statistics.costs).toEqual({ openingCost: 0, furnitureCost: 0, totalCost: 0, pricedOpeningCount: 0, pricedFurnitureCount: 0 });
  // The baseline used for change detection never carries the derived block.
  expect(packageJSON(files['baseline.json']).statistics).toBeUndefined();
});

it('counts the floor of a closet built against a room once', () => {
  const project: any = roomProject(), floor = project.floors[0];
  const leg = (id: string, x: number, y: number, xx: number, yy: number) => ({ ...floor.walls[0], id, start: { x, y }, end: { x: xx, y: yy } });
  floor.walls = [leg('a-0', 0, 0, 1000, 0), leg('a-1', 1000, 0, 1000, 750), leg('a-2', 1000, 750, 0, 750), leg('a-3', 0, 750, 0, 0),
    leg('closet-0', 400, 0, 400, 400), leg('closet-1', 400, 400, 650, 400), leg('closet-2', 650, 400, 650, 0)];
  floor.rooms = resolveRooms(floor).map((room: any) => ({ ...room, name: room.area > 50 ? 'Living' : 'Closet' }));
  const statistics = packageJSON(readPackageZip(projectPackageBytes(project))['plan.json']).statistics;
  // The two rooms partition the house: its interior less every wall footprint, the closet's included.
  const house = interiorRoomArea(floor.walls.slice(0, 4).map((wall: any) => wall.start), [], floor.walls)!;
  expect(statistics.rooms).toHaveLength(2);
  expect(statistics.rooms[0].floorArea + statistics.rooms[1].floorArea).toBeCloseTo(house, 6);
  expect(statistics.totals.livingArea).toBeCloseTo(house, 6);
});

it('replaces a stale statistics block from an imported native package and counts unenclosed rooms', () => {
  const plan = JSON.parse(readFileSync('tests/fixtures/handoff-plan.json', 'utf8'));
  plan.statistics = { version: 99, stale: true };
  plan.furniture[0].price = 456.75;
  const files = { 'manifest.json': jsonBytes({ format: 'openplan3d-project', version: 1, producer: 'ios', title: 'Stale statistics' }), 'plan.json': jsonBytes(plan) };
  const { project } = readProjectPackage(writePackageZip(files));
  const again = packageJSON(readPackageZip(projectPackageBytes(project))['plan.json']);
  expect(again.statistics.version).toBe(1);
  expect(again.statistics.stale).toBeUndefined();
  expect(again.statistics.totals).toMatchObject({ wallCount: 5, doorCount: 4, windowCount: 2, roomCount: 1, furnitureCount: 1 });
  expect(again.statistics.levels.map((level: any) => level.index)).toEqual([0, 2, 3]);
  expect(again.statistics.rooms[0]).toMatchObject({ name: 'QA Kitchen', level: 0 });
  expect(again.statistics.rooms[0].floorArea).toBeGreaterThan(20);
  expect(again.statistics.totals.roomsWithoutArea).toBe(0);
  expect(again.statistics.costs).toMatchObject({ furnitureCost: 456.75, pricedFurnitureCount: 1 });
});
