import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { detectOuterWalls, getOuterWalls } from '$lib/utils/outerWalls';
import { createProjectFromRoomPlan, DEFAULT_ROOMPLAN_OPTIONS } from '$lib/utils/roomplanImport';
import { detectRooms } from '$lib/utils/roomDetection';
import type { Wall, Point } from '$lib/models/types';

function wall(id: string, start: Point, end: Point): Wall {
  return { id, start, end, thickness: 20, height: 280, color: '#ffffff' };
}
function polygon(points: Point[], prefix = 'r'): Wall[] {
  return points.map((p, i) => wall(`${prefix}${i}`, p, points[(i + 1) % points.length]));
}
const rectangle = () => polygon([{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 500 }, { x: 0, y: 500 }]);
const lShape = () => polygon([{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 300 }, { x: 300, y: 300 }, { x: 300, y: 600 }, { x: 0, y: 600 }]);

it.each([
  ['rectangle', rectangle, []],
  ['one partition', rectangle, [wall('p', { x: 300, y: 0 }, { x: 300, y: 500 })]],
  ['two partitions', rectangle, [wall('p1', { x: 200, y: 0 }, { x: 200, y: 500 }), wall('p2', { x: 400, y: 0 }, { x: 400, y: 500 })]],
  ['T junction', rectangle, [wall('p1', { x: 300, y: 0 }, { x: 300, y: 250 }), wall('p2', { x: 300, y: 250 }, { x: 600, y: 250 })]],
  ['L shape', lShape, []],
  ['partitioned L shape', lShape, [wall('p', { x: 300, y: 0 }, { x: 300, y: 300 })]],
  ['stray wall', rectangle, [wall('stray', { x: 900, y: 100 }, { x: 900, y: 400 })]],
] as const)('finds the perimeter of a %s', (_label, makeWalls, extra) => {
  const walls = makeWalls();
  expect(detectOuterWalls([...walls, ...extra])).toEqual(new Set(walls.map(w => w.id)));
});

it('retains open sketches when no enclosed rooms can establish an exterior', () => {
  expect(detectOuterWalls([])).toEqual(new Set());
  for (const count of [1, 2, 3]) {
    const walls = rectangle().slice(0, count);
    expect(getOuterWalls(walls)).toEqual(walls);
  }
});

it.each(['test-roomplan.json', 'static/test-roomplan-multiroom.json'])('keeps a usable envelope for the capture fixture %s', file => {
  const project = createProjectFromRoomPlan(JSON.parse(readFileSync(file, 'utf8')), file, DEFAULT_ROOMPLAN_OPTIONS);
  for (const floor of project.floors) {
    const ids = detectOuterWalls(floor.walls);
    expect(ids.size).toBeGreaterThan(0);
    expect([...ids].every(id => floor.walls.some(w => w.id === id))).toBe(true);
  }
});

it('retains the exposed part of a wall that is mostly a partition', () => {
  const walls = [...rectangle(),
    wall('upperLeft', { x: 0, y: 0 }, { x: 0, y: -300 }),
    wall('upperTop', { x: 0, y: -300 }, { x: 500, y: -300 }),
    wall('upperRight', { x: 500, y: -300 }, { x: 500, y: 0 }),
  ];
  walls[0].startHeight = 100; walls[0].endHeight = 400;
  const outer = getOuterWalls(walls);
  expect(outer.find(w => w.id === 'r0')).toMatchObject({ startHeight: 350, endHeight: 400, height: 400 });
  expect(outer).toHaveLength(7);
  expect(outer.find(w => w.id === 'r0')).toMatchObject({ start: { x: 500, y: 0 }, end: { x: 600, y: 0 } });
  expect(detectRooms(outer)).toMatchObject([{ area: 45 }]);
});

it('keeps both exposed ends of a partially shared wall with distinct fragment identities', () => {
  const walls = [...rectangle(),
    wall('upperLeft', { x: 200, y: 0 }, { x: 200, y: -300 }),
    wall('upperTop', { x: 200, y: -300 }, { x: 400, y: -300 }),
    wall('upperRight', { x: 400, y: -300 }, { x: 400, y: 0 }),
  ];
  const original = JSON.stringify(walls);
  const outer = getOuterWalls(walls);
  expect(outer).toHaveLength(8);
  expect(new Set(outer.map(w => w.id)).size).toBe(8);
  expect(detectRooms(outer)).toMatchObject([{ area: 36 }]);
  expect(JSON.stringify(walls)).toBe(original);
});

it('finds the perimeter around a closet built against it, whichever order the walls were drawn in', () => {
  const closet = [wall('c0', { x: 200, y: 0 }, { x: 200, y: 200 }), wall('c1', { x: 200, y: 200 }, { x: 400, y: 200 }), wall('c2', { x: 400, y: 200 }, { x: 400, y: 0 })];
  for (const walls of [[...rectangle(), ...closet], [...closet, ...rectangle()]]) for (const drawn of [walls, [...walls].reverse()]) {
    expect(detectOuterWalls(drawn)).toEqual(new Set(['r0', 'r1', 'r2', 'r3']));
  }
});
