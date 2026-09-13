import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import { currentProject, splitWall, undo, redo, findGroupForElement, duplicateSelection, addDoor, addWindow } from '$lib/stores/project';
import type { Wall } from '$lib/models/types';
import { resolveRooms } from '$lib/utils/roomDetection';
import { roomProject } from './fixtures/project';

for (const joined of [false, true]) it(`wall splitting preserves saved ${joined ? 'partial-boundary rooms' : 'room metadata'}`, () => {
  const project = roomProject();
  const floor = project.floors[0];
  if (joined) {
    floor.walls[0].end = { x: 800, y: 0 };
    floor.walls[2].start = { x: 800, y: 300 };
    floor.walls.push({ ...floor.walls[1], id: 'outer-right', start: { x: 800, y: 0 }, end: { x: 800, y: 300 } });
  }
  floor.rooms = resolveRooms(floor).map((room, index) => ({ ...room, id: `saved-${index}`, name: `Custom ${index}`, floorTexture: 'tile', color: '#abcdef' }));
  expect(floor.rooms).toHaveLength(joined ? 2 : 1);
  currentProject.set(project);
  const before = structuredClone(floor);
  const secondId = splitWall(floor.walls[0].id, .5)!;
  expect(secondId).not.toBeNull();
  const resolved = resolveRooms(get(currentProject)!.floors[0]);
  for (const original of before.rooms) {
    const room = resolved.find(room => room.id === original.id);
    expect(room).toMatchObject({ id: original.id, name: original.name, color: original.color, floorTexture: original.floorTexture, area: original.area });
    expect([...get(currentProject)!.floors[0].rooms.find(room => room.id === original.id)!.walls].sort()).toEqual([...room!.walls].sort());
  }
  undo(); expect(get(currentProject)!.floors[0]).toEqual(before);
});

it('splits a quadratic wall without changing its curve, opening centers or slope', () => {
  const project = roomProject();
  const wall = project.floors[0].walls[0];
  wall.curvePoint = { x: 80, y: -200 };
  wall.startHeight = 180; wall.endHeight = 320; wall.height = 320;
  project.floors[0].rooms = resolveRooms(project.floors[0]).map(room => ({ ...room, id: 'curved-room', name: 'Curved office', floorTexture: 'tile' }));
  currentProject.set(project);
  addDoor(wall.id, .15); addWindow(wall.id, .85);
  const before = structuredClone(get(currentProject)!.floors[0]);
  const point = (wall: Wall, t: number) => ({
    x: (1-t)**2*wall.start.x + 2*(1-t)*t*wall.curvePoint!.x + t*t*wall.end.x,
    y: (1-t)**2*wall.start.y + 2*(1-t)*t*wall.curvePoint!.y + t*t*wall.end.y,
  });
  const t = .4, childId = splitWall(wall.id, t);
  expect(childId).not.toBeNull();
  const floor = get(currentProject)!.floors[0];
  const first = floor.walls[0], second = floor.walls.find(wall => wall.id === childId)!;
  for (let i = 0; i <= 20; i++) {
    const u = i/20;
    const actual = u <= t ? point(first, u/t) : point(second, (u-t)/(1-t));
    const expected = point(before.walls[0], u);
    expect(actual.x).toBeCloseTo(expected.x, 8); expect(actual.y).toBeCloseTo(expected.y, 8);
  }
  expect([first.startHeight, first.endHeight, second.startHeight, second.endHeight]).toEqual([180,236,236,320]);
  expect(floor.doors[0]).toEqual({ ...before.doors[0], position: .15/t });
  expect(floor.windows[0]).toEqual({ ...before.windows[0], wallId: childId, position: (.85-t)/(1-t) });
  expect(resolveRooms(floor)[0]).toMatchObject({ id: 'curved-room', name: 'Curved office', floorTexture: 'tile' });
  undo(); expect(get(currentProject)!.floors[0]).toEqual(before);
});

for (const kind of ['door', 'window']) it(`uses curve distance to protect a ${kind} at a split`, () => {
  const project = roomProject();
  const wall = project.floors[0].walls[0];
  wall.end = { x: 100, y: 0 }; wall.curvePoint = { x: 50, y: 800 };
  currentProject.set(project);
  if (kind === 'door') addDoor(wall.id, .25); else addWindow(wall.id, .25);
  const before = structuredClone(get(currentProject)!.floors[0]);
  expect(splitWall(wall.id, .25)).toBeNull();
  expect(get(currentProject)!.floors[0]).toEqual(before);
  // The center is only 25cm away along the chord but much farther along the curve.
  expect(splitWall(wall.id, .5)).not.toBeNull();
  undo(); expect(get(currentProject)!.floors[0]).toEqual(before);
});

it('keeps both split segments in their group through copying and history', () => {
  const project = roomProject();
  const floor = project.floors[0];
  const id = floor.walls[0].id;
  floor.groups = [{ id: 'wall-group', elementIds: [id, floor.walls[1].id] }];
  currentProject.set(project);
  const before = structuredClone(floor);
  const child = splitWall(id, .5)!;
  const group = findGroupForElement(get(currentProject)!.floors[0], child);
  expect(group).toEqual({ id: 'wall-group', elementIds: [id, child, floor.walls[1].id] });
  const split = structuredClone(get(currentProject)!.floors[0]);
  const copied = duplicateSelection(new Set(group!.elementIds));
  expect(copied).toHaveLength(3);
  expect(new Set(get(currentProject)!.floors[0].groups!.at(-1)!.elementIds)).toEqual(new Set(copied));
  undo(); expect(get(currentProject)!.floors[0]).toEqual(split);
  undo(); expect(get(currentProject)!.floors[0]).toEqual(before);
  redo(); expect(get(currentProject)!.floors[0]).toEqual(split);
});
