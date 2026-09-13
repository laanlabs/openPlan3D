import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { loadProject, currentProject, activeFloor, resizeWallLength, updateWall, updateDoor, updateWindow, undo, redo, undoHistoryStore } from '$lib/stores/project';
import { planWallResize, wallLength, connectedWallEndpoints } from '$lib/utils/wallEditing';
import { resolveRooms } from '$lib/utils/roomDetection';
import { roomProject } from './fixtures/project';
import type { Wall } from '$lib/models/types';

beforeEach(() => {
  const project = roomProject(), floor = project.floors[0];
  floor.rooms = resolveRooms(floor).map(room => ({ ...room, id: 'named-room', name: 'Kitchen & Dining', color: '#abcdef', floorTexture: 'tile', labelOffset: { x: 12, y: 4 } }));
  floor.walls[0] = { ...floor.walls[0], startHeight: 210, endHeight: 350, height: 350, interiorTexture: 'brick' };
  floor.doors = [{ id: 'door', wallId: floor.walls[0].id, position: 0.35, width: 90.5, height: 205.25, type: 'double', swingDirection: 'right', flipSide: true }];
  floor.windows = [{ id: 'window', wallId: floor.walls[1].id, position: 0.65, width: 100.25, height: 120.5, sillHeight: 85.25, type: 'casement' }];
  project.floors.push({ ...structuredClone(floor), id: 'other-floor', name: 'Other floor', level: 1 });
  loadProject(project);
});

const floor = () => get(activeFloor)!;
const serialized = () => JSON.stringify(get(currentProject));

it('unchanged endpoint coordinates preserve Undo and Redo', () => {
  const before = structuredClone(floor());
  updateWall('a-0', { color: '#123456' });
  const edited = structuredClone(floor());
  updateWall('a-0', { start: { ...before.walls[0].start }, end: { ...before.walls[0].end } });
  undo(); expect(floor()).toEqual(before);
  updateWall('a-0', { start: { ...before.walls[0].start } });
  redo(); expect(floor()).toEqual(edited);
});

it('uniform height edits still flatten a slope when the maximum height is unchanged', () => {
  const before = structuredClone(floor());
  updateWall('a-0', { height: 350 });
  expect(floor().walls[0]).toMatchObject({ height: 350, startHeight: 350, endHeight: 350 });
  undo(); expect(floor()).toEqual(before);
});

describe('connected wall dimensions', () => {
  it('keeps joined corners and named rooms during fractional resizing, in one undo entry', () => {
    const before = serialized(), oldWall = structuredClone(floor().walls[0]), other = structuredClone(get(currentProject)!.floors[1]);
    const doors = structuredClone(floor().doors), windows = structuredClone(floor().windows);
    expect(resizeWallLength('a-0', 500.25)).toBeNull();
    expect(floor().walls[0].start).toEqual({ x: 0, y: 0 });
    expect(floor().walls[0].end.x).toBeCloseTo(500.25);
    expect(floor().walls[0].end.y).toBe(0);
    expect(floor().walls[1].start).toEqual(floor().walls[0].end);
    expect(floor().walls[1].end).toEqual({ x: 400, y: 300 });
    expect(resolveRooms(floor())).toHaveLength(1);
    expect(resolveRooms(floor())[0]).toMatchObject({ id: 'named-room', name: 'Kitchen & Dining', color: '#abcdef', floorTexture: 'tile', labelOffset: { x: 12, y: 4 } });
    expect(resolveRooms(floor())[0].area).toBeCloseTo((400 + 500.25) / 2 * 300 / 10000);
    expect(floor().walls[0]).toMatchObject({ ...oldWall, end: floor().walls[0].end });
    expect(floor().doors).toEqual(doors); expect(floor().windows).toEqual(windows);
    expect(get(currentProject)!.floors[1]).toEqual(other);
    expect(get(undoHistoryStore).entries).toHaveLength(1);
    const after = serialized(); undo(); expect(serialized()).toBe(before); redo(); expect(serialized()).toBe(after);
  });
  it('supports a fixed end and coalesces consecutive edits without moving the wrong neighbour', () => {
    expect(resizeWallLength('a-0', 475, 'end')).toBeNull();
    expect(resizeWallLength('a-0', 525.5, 'end')).toBeNull();
    expect(floor().walls[0].end).toEqual({ x: 400, y: 0 });
    expect(floor().walls[0].start).toEqual({ x: -125.5, y: 0 });
    expect(floor().walls[3].end).toEqual(floor().walls[0].start);
    expect(floor().walls[1].start).toEqual({ x: 400, y: 0 });
    expect(get(undoHistoryStore).entries).toHaveLength(1);
    undo(); expect(wallLength(floor().walls[0])).toBe(400);
  });
  it('handles rotated corners and both endpoint orientations', () => {
    const p = roomProject();
    for (const w of p.floors[0].walls) {
      const rotate = ({ x, y }: { x: number; y: number }) => ({ x: 10 + x * 0.6 - y * 0.8, y: -20 + x * 0.8 + y * 0.6 });
      w.start = rotate(w.start); w.end = rotate(w.end);
    }
    const second = p.floors[0].walls[1]; [second.start, second.end] = [second.end, second.start];
    loadProject(p);
    resizeWallLength('a-0', 700.5);
    expect(wallLength(floor().walls[0])).toBeCloseTo(700.5);
    expect(floor().walls[1].end).toEqual(floor().walls[0].end);
    expect(resolveRooms(floor())).toHaveLength(1);
  });
  it('uses the pointer-drag tolerance for all joined endpoints, but excludes separated walls', () => {
    const wall = floor().walls[0];
    const extra = (id: string, x: number): Wall => ({ ...wall, id, start: { x, y: 0 }, end: { x, y: -200 } });
    floor().walls.push(extra('near', 401), extra('apart', 403));
    expect(connectedWallEndpoints(floor().walls, wall.end, wall.id).map(c => c.wallId)).toEqual(['a-1', 'near']);
    resizeWallLength('a-0', 550);
    expect(floor().walls.find(w => w.id === 'near')!.start).toEqual({ x: 550, y: 0 });
    expect(floor().walls.find(w => w.id === 'apart')!.start).toEqual({ x: 403, y: 0 });
  });
  it.each(['start', 'end'] as const)('scales curved length and control point about the fixed %s', fixed => {
    const wall = floor().walls[0]; wall.curvePoint = { x: 150, y: -120 };
    const anchor = { ...wall[fixed] }, oldControl = { ...wall.curvePoint }, before = wallLength(wall);
    expect(resizeWallLength(wall.id, before * 1.5, fixed)).toBeNull();
    expect(wallLength(wall)).toBeCloseTo(before * 1.5);
    expect(wall[fixed]).toEqual(anchor);
    expect(wall.curvePoint).toEqual({ x: anchor.x + (oldControl.x - anchor.x) * 1.5, y: anchor.y + (oldControl.y - anchor.y) * 1.5 });
  });
  it('rejects a resize that would collapse a connected neighbour without partially changing the room', () => {
    floor().walls.push({ ...floor().walls[0], id: 'extension', start: { x: 400, y: 0 }, end: { x: 600, y: 0 } });
    const before = serialized();
    expect(resizeWallLength('a-0', 600)).toContain('collapse');
    expect(serialized()).toBe(before); expect(get(undoHistoryStore).entries).toHaveLength(0);
  });
  it.each([NaN, Infinity, -Infinity, 0, -25, 0.5])('rejects invalid length %s without touching history or project', length => {
    const before = serialized();
    expect(resizeWallLength('a-0', length)).toBeTruthy();
    expect(serialized()).toBe(before); expect(get(undoHistoryStore).entries).toHaveLength(0);
  });
  it('does not create history for a missing wall or an unchanged length, and keeps redo intact', () => {
    resizeWallLength('a-0', 500); undo();
    const before = serialized();
    expect(resizeWallLength('missing', 500)).toBeTruthy();
    expect(resizeWallLength('a-0', 400)).toBeNull();
    expect(serialized()).toBe(before); expect(get(undoHistoryStore).entries).toHaveLength(0);
    redo(); expect(wallLength(floor().walls[0])).toBe(500);
  });
  it('rejects invalid coordinates and zero-length source walls', () => {
    const wall = floor().walls[0];
    expect(() => planWallResize([{ ...wall, end: { ...wall.start } }], wall.id, 500)).toThrow('too short');
    expect(() => planWallResize([{ ...wall, end: { x: Infinity, y: 0 } }], wall.id, 500)).toThrow();
  });
});

describe('dimension mutation safety', () => {
  it.each([0, -1, NaN, Infinity])('rejects invalid positive dimension %s atomically', value => {
    const before = serialized();
    updateWall('a-0', { thickness: value, color: '#000000' });
    updateDoor('door', { width: value, height: value, type: 'single' });
    updateWindow('window', { width: value, height: value, type: 'fixed' });
    expect(serialized()).toBe(before); expect(get(undoHistoryStore).entries).toHaveLength(0);
  });
  it.each([-0.01, 1.01, NaN, Infinity])('rejects invalid opening position %s without poisoning saves', position => {
    const before = serialized();
    updateDoor('door', { position }); updateWindow('window', { position });
    expect(serialized()).toBe(before); expect(get(undoHistoryStore).entries).toHaveLength(0);
  });
  it('accepts fractional dimensions and zero sill/endpoint positions and undoes them', () => {
    updateDoor('door', { width: 95.125, height: 207.75, position: 0 });
    updateWindow('window', { width: 125.875, height: 130.25, sillHeight: 0, position: 1 });
    expect(floor().doors[0]).toMatchObject({ width: 95.125, height: 207.75, position: 0 });
    expect(floor().windows[0]).toMatchObject({ width: 125.875, height: 130.25, sillHeight: 0, position: 1 });
    undo(); expect(floor().windows[0].sillHeight).toBe(85.25);
    undo(); expect(floor().doors[0].width).toBe(90.5);
  });
  it('rejects non-finite points and invalid sills, and ignores missing/unchanged edits', () => {
    const before = serialized();
    updateWall('a-0', { start: { x: NaN, y: 0 } });
    updateWall('a-0', { curvePoint: { x: 0, y: Infinity } });
    updateWindow('window', { sillHeight: -1 });
    updateDoor('door', { width: 90.5 }); updateWindow('window', { height: 120.5 }); updateWall('a-0', { thickness: 15 });
    updateWall('missing', { thickness: 20 }); updateDoor('missing', { width: 90 }); updateWindow('missing', { width: 90 });
    expect(serialized()).toBe(before); expect(get(undoHistoryStore).entries).toHaveLength(0);
  });
});
