import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { Door, Floor, Point, Wall } from '$lib/models/types';
import { connectedWallGroup, doorJoin } from '$lib/utils/scanAlignment';
import { createDefaultFloor, currentProject, doorJoinMode, joinScanDoors, loadProject, redo, selectedElementId, selectedElementIds, undo, undoHistoryStore } from '$lib/stores/project';
import { rectangleWalls, roomProject } from './fixtures/project';

// Issue #103: a room scanned on its own snaps onto the plan at the door it shares with another room.

const door = (id: string, wallId: string, position: number): Door => ({ id, wallId, position, width: 90, height: 210, type: 'single', swingDirection: 'left', flipSide: false });
const chair = (id: string, position: Point) => ({ id, catalogId: 'chair', position, rotation: 0, scale: { x: 1, y: 1, z: 1 } });
const wall = (floor: Floor, id: string): Wall => floor.walls.find(w => w.id === id)!;
const length = (w: Wall) => Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
const direction = (w: Wall): Point => ({ x: (w.end.x - w.start.x) / length(w), y: (w.end.y - w.start.y) / length(w) });
const doorCentre = (floor: Floor, id: string): Point => {
  const d = floor.doors.find(x => x.id === id)!, w = wall(floor, d.wallId);
  return { x: w.start.x + (w.end.x - w.start.x) * d.position, y: w.start.y + (w.end.y - w.start.y) * d.position };
};
const close = (actual: Point, expected: Point, digits = 9) => { expect(actual.x).toBeCloseTo(expected.x, digits); expect(actual.y).toBeCloseTo(expected.y, digits); };
const bWallIds = ['b-0', 'b-1', 'b-2', 'b-3'];

/** The B rectangle still has its four 400/300 cm sides sharing a corner with the next, wherever it went. */
function expectRigidB(floor: Floor) {
  for (const [i, id] of bWallIds.entries()) {
    const own = wall(floor, id), next = wall(floor, bWallIds[(i + 1) % 4]);
    expect(length(own)).toBeCloseTo(i % 2 ? 300 : 400, 9);
    const corner = Math.min(...[own.start, own.end].flatMap(a => [next.start, next.end].map(b => Math.hypot(a.x - b.x, a.y - b.y))));
    expect(corner).toBeLessThan(1e-9);
  }
}

/**
 * Room A (0,0)-(400,300): door dA mid-way along its right wall a-1, a chair. Room B (800,0)-(1200,300),
 * the same winding: door dB on its left wall b-3, a window on its top wall, a chair, a note and a measurement.
 */
function twoRooms(): Floor {
  const floor = createDefaultFloor(0);
  floor.walls = [...rectangleWalls('a'), ...rectangleWalls('b', 800)];
  floor.doors = [door('dA', 'a-1', 0.5), door('dB', 'b-3', 0.4)];
  floor.windows = [{ id: 'wB', wallId: 'b-0', position: 0.25, width: 120, height: 120, sillHeight: 90, type: 'standard' }];
  floor.furniture = [chair('cA', { x: 200, y: 150 }), chair('cB', { x: 1000, y: 150 })];
  floor.textAnnotations = [{ id: 'tB', x: 900, y: 50, text: 'B', fontSize: 16, color: '#000', rotation: 0 }];
  floor.measurements = [{ id: 'mB', x1: 800, y1: 290, x2: 1200, y2: 290 }];
  floor.rooms = [
    { id: 'rA', name: 'A', walls: ['a-0', 'a-1', 'a-2', 'a-3'], floorTexture: 'hardwood', area: 12 },
    { id: 'rB', name: 'B', walls: bWallIds, floorTexture: 'tile', area: 12, labelOffset: { x: 5, y: 6 } },
  ];
  return floor;
}

describe('connectedWallGroup', () => {
  it('collects the walls joined corner to corner, nothing across the gap', () => {
    const floor = twoRooms();
    expect([...connectedWallGroup(floor.walls, 'a-1')].sort()).toEqual(['a-0', 'a-1', 'a-2', 'a-3']);
    expect([...connectedWallGroup(floor.walls, 'b-0')].sort()).toEqual(bWallIds);
    expect(connectedWallGroup(floor.walls, 'missing').size).toBe(0);
    const lone: Wall = { id: 'l', start: { x: 0, y: 500 }, end: { x: 100, y: 500 }, thickness: 15, height: 250, color: '#eee' };
    expect([...connectedWallGroup([...floor.walls, lone], 'l')]).toEqual(['l']);
  });
});

describe('doorJoin', () => {
  it('slides B onto the far side of A\'s wall with everything that belongs to it, one wall thickness from the door', () => {
    const floor = twoRooms(), before = JSON.stringify(floor);
    const result = doorJoin(floor, 'dB', 'dA')!;
    expect(result).not.toBeNull();
    expect(JSON.stringify(floor)).toBe(before);
    const joined = result.floor;
    // A's door centre is (400,150); its wall faces away from A along +x, and both walls are 15 cm thick.
    close(doorCentre(joined, 'dB'), { x: 415, y: 150 });
    expect(direction(wall(joined, 'b-3')).x * direction(wall(joined, 'a-1')).x + direction(wall(joined, 'b-3')).y * direction(wall(joined, 'a-1')).y).toBeCloseTo(-1, 12);
    expectRigidB(joined);
    expect(wall(joined, 'b-0').start).toEqual({ x: 415, y: -30 });
    expect(joined.walls.slice(0, 4)).toEqual(floor.walls.slice(0, 4));
    // B's contents came along; A's chair stayed where it was.
    expect(joined.furniture.find(f => f.id === 'cB')!.position).toEqual({ x: 615, y: 120 });
    expect(joined.furniture.find(f => f.id === 'cA')).toEqual(floor.furniture[0]);
    expect(joined.textAnnotations[0]).toMatchObject({ x: 515, y: 20, rotation: 0 });
    expect(joined.measurements[0]).toMatchObject({ x1: 415, y1: 260, x2: 815, y2: 260 });
    // Openings keep their fraction and their wall; room records are untouched.
    expect(joined.doors.map(d => [d.wallId, d.position])).toEqual([['a-1', 0.5], ['b-3', 0.4]]);
    expect(joined.windows).toEqual(floor.windows);
    expect(joined.rooms).toEqual(floor.rooms);
    expect([...result.movedIds].sort()).toEqual(['b-0', 'b-1', 'b-2', 'b-3', 'cB', 'dB', 'mB', 'tB', 'wB']);
  });

  it('turns B when its door wall is not parallel to the target wall, rotating what rides along', () => {
    const floor = twoRooms();
    floor.doors[1] = door('dB', 'b-0', 0.5); // top wall, horizontal
    const joined = doorJoin(floor, 'dB', 'dA')!.floor;
    close(doorCentre(joined, 'dB'), { x: 415, y: 150 });
    expectRigidB(joined);
    close(wall(joined, 'b-0').start, { x: 415, y: 350 });
    close(wall(joined, 'b-0').end, { x: 415, y: -50 });
    close(wall(joined, 'b-1').end, { x: 715, y: -50 });
    const cB = joined.furniture.find(f => f.id === 'cB')!;
    close(cB.position, { x: 565, y: 150 });
    expect(cB.rotation).toBeCloseTo(270, 9);
    expect(joined.textAnnotations[0].rotation).toBeCloseTo(270, 9);
    expect(joined.furniture.find(f => f.id === 'cA')).toEqual(floor.furniture[0]);
  });

  it('keeps B on the free side even when the scan was traced the other way round', () => {
    const floor = twoRooms();
    floor.walls = floor.walls.map(w => w.id.startsWith('b-') ? { ...w, start: w.end, end: w.start } : w);
    const joined = doorJoin(floor, 'dB', 'dA')!.floor;
    close(doorCentre(joined, 'dB'), { x: 415, y: 150 });
    expectRigidB(joined);
    expect(Math.abs(direction(wall(joined, 'b-3')).y)).toBeCloseTo(1, 12);
    for (const id of bWallIds) for (const point of [wall(joined, id).start, wall(joined, id).end]) expect(point.x).toBeGreaterThanOrEqual(415 - 1e-9);
    close(joined.furniture.find(f => f.id === 'cB')!.position, { x: 615, y: 180 });
  });

  it('takes an explicit gap', () => {
    close(doorCentre(doorJoin(twoRooms(), 'dB', 'dA', 40)!.floor, 'dB'), { x: 440, y: 150 });
  });

  it('refuses a missing door, the same door, two doors of one wall group and a curved door wall', () => {
    const floor = twoRooms();
    floor.doors.push(door('dA2', 'a-0', 0.5));
    const before = JSON.stringify(floor);
    expect(doorJoin(floor, 'nope', 'dA')).toBeNull();
    expect(doorJoin(floor, 'dB', 'nope')).toBeNull();
    expect(doorJoin(floor, 'dA', 'dA')).toBeNull();
    expect(doorJoin(floor, 'dA2', 'dA')).toBeNull();
    expect(doorJoin(floor, 'dB', 'dA2')).not.toBeNull();
    wall(floor, 'a-1').curvePoint = { x: 450, y: 150 };
    expect(doorJoin(floor, 'dB', 'dA')).toBeNull();
    expect(doorJoin(floor, 'dA', 'dB')).toBeNull();
    expect(JSON.stringify(floor)).toBe(JSON.stringify({ ...JSON.parse(before), walls: floor.walls }));
  });

  it('uses the walls\' drawn extent when the group closes no room, and the side the group is on when the target has none', () => {
    const floor = createDefaultFloor(0);
    floor.walls = [
      { id: 'T', start: { x: 0, y: 0 }, end: { x: 400, y: 0 }, thickness: 15, height: 250, color: '#eee' },
      { id: 'M', start: { x: 800, y: 0 }, end: { x: 800, y: 200 }, thickness: 15, height: 250, color: '#eee' },
    ];
    floor.doors = [door('dT', 'T', 0.5), door('dM', 'M', 0.5)];
    floor.furniture = [chair('near', { x: 805, y: 50 }), chair('far', { x: 900, y: 100 })];
    const result = doorJoin(floor, 'dM', 'dT')!;
    // The lone wall M sat below T (screen y down), so it lands on that side, 15 cm off, turned to run against T.
    close(doorCentre(result.floor, 'dM'), { x: 200, y: 15 });
    close(wall(result.floor, 'M').start, { x: 300, y: 15 });
    close(wall(result.floor, 'M').end, { x: 100, y: 15 });
    const near = result.floor.furniture.find(f => f.id === 'near')!;
    close(near.position, { x: 250, y: 20 });
    expect(near.rotation).toBeCloseTo(90, 9);
    expect(result.floor.furniture.find(f => f.id === 'far')).toEqual(floor.furniture[1]);
    expect([...result.movedIds].sort()).toEqual(['M', 'dM', 'near']);
  });
});

describe('project store', () => {
  const state = () => JSON.stringify(get(currentProject));
  function load(floor = twoRooms()) {
    const project = roomProject();
    project.floors = [floor];
    project.activeFloorId = floor.id;
    loadProject(project);
  }
  beforeEach(() => load());

  it('joins as one history entry, selects what moved and ends the pick mode', () => {
    doorJoinMode.set({ firstDoorId: 'dB' });
    const before = state();
    expect(joinScanDoors('dB', 'dA')).toBe(true);
    const after = state();
    expect(get(undoHistoryStore).entries.map(entry => entry.description)).toEqual(['Joined doors']);
    expect(get(doorJoinMode)).toBeNull();
    expect([...get(selectedElementIds)]).toEqual(['b-0', 'b-1', 'b-2', 'b-3', 'dB', 'wB', 'cB', 'tB', 'mB']);
    expect(get(selectedElementId)).toBeNull();
    close(doorCentre(get(currentProject)!.floors[0], 'dB'), { x: 415, y: 150 });
    undo();
    expect(state()).toBe(before);
    redo();
    expect(state()).toBe(after);
    expect(get(undoHistoryStore).entries).toHaveLength(1);
  });

  it('changes nothing, records nothing and keeps the mode when the doors cannot be joined', () => {
    const floor = twoRooms();
    floor.doors.push(door('dA2', 'a-0', 0.5));
    load(floor);
    doorJoinMode.set({ firstDoorId: 'dA2' });
    const before = state();
    expect(joinScanDoors('dA2', 'dA')).toBe(false);
    expect(state()).toBe(before);
    expect(get(undoHistoryStore).entries).toEqual([]);
    expect(get(doorJoinMode)).toEqual({ firstDoorId: 'dA2' });
    currentProject.set(null);
    expect(joinScanDoors('dB', 'dA')).toBe(false);
  });
});
