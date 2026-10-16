import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Floor, Wall } from '$lib/models/types';
import { projectPackageBytes } from '$lib/services/projectPackage';
import { resolveRooms } from '$lib/utils/roomDetection';
import { createProjectFromRoomPlan, importRoomPlan, roomPlanImportOptions, DEFAULT_ROOMPLAN_OPTIONS, type RoomPlanImportOptions } from '$lib/utils/roomplanImport';

// Raw RoomPlan geometry: metres on the XZ ground plane, a column-major transform
// whose local X axis runs from (x1,z1) to (x2,z2), centred on the element.
const placed = (identifier: string, x1: number, z1: number, x2: number, z2: number, dimensions: number[], category: object, extra = {}) => {
  const len = Math.hypot(x2 - x1, z2 - z1), ux = (x2 - x1) / len, uz = (z2 - z1) / len;
  return { identifier, category, dimensions, ...extra,
    transform: [ux, 0, uz, 0, 0, 1, 0, 0, -uz, 0, ux, 0, (x1 + x2) / 2, dimensions[1] / 2, (z1 + z2) / 2, 1] };
};
const wall = (id: string, x1: number, z1: number, x2: number, z2: number) =>
  placed(id, x1, z1, x2, z2, [Math.hypot(x2 - x1, z2 - z1), 2.5, 0], { wall: {} });
/** An opening `width` metres wide, centred on its parent wall. */
const opening = (id: string, host: ReturnType<typeof wall>, kind: 'door' | 'window', width: number) => {
  const [ux, , uz] = host.transform, x = host.transform[12], z = host.transform[14];
  return placed(id, x - ux * width / 2, z - uz * width / 2, x + ux * width / 2, z + uz * width / 2,
    [width, kind === 'door' ? 2 : 1.2, 0], { [kind]: {} }, { parentIdentifier: host.identifier });
};
const section = (label: string, x: number, z: number) => ({ label, center: [x, 0, z], story: 0 });
const capture = (walls: object[], sections: object[], extra = {}) => ({ walls, doors: [], windows: [], objects: [], sections, ...extra });
const RAW: RoomPlanImportOptions = { straighten: false, orthogonal: false, mergeDistance: 0 };
const byName = (floor: Floor) => Object.fromEntries(floor.rooms.map(r => [r.name, { walls: [...r.walls].sort(), area: r.area }]));
const shown = (floor: Floor) => resolveRooms(floor).map(r => r.name).sort();
const length = (w: Wall) => Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);

// 8 x 4 m open-plan area whose east wall also closes a 2 x 2 m bathroom.
const openPlan = [
  wall('n', 0, 0, 8, 0), wall('e', 8, 0, 8, 4), wall('s', 8, 4, 0, 4), wall('w', 0, 4, 0, 0),
  wall('bn', 8, 0, 10, 0), wall('be', 10, 0, 10, 2), wall('bs', 10, 2, 8, 2),
];
// 8 x 6 m bedroom with a free-standing 2 x 2 m walled closet inside it.
const nested = [
  wall('n', 0, 0, 8, 0), wall('e', 8, 0, 8, 6), wall('s', 8, 6, 0, 6), wall('w', 0, 6, 0, 0),
  wall('in', 3, 2, 5, 2), wall('ie', 5, 2, 5, 4), wall('is', 5, 4, 3, 4), wall('iw', 3, 4, 3, 2),
];
const kitchen = section('kitchen', 2, 2), living = section('livingRoom', 6, 2), bathroom = section('bathroom', 9, 1);
const closet = section('closet', 4, 3), bedroom = section('bedroom', 1, 1);

describe('section labels', () => {
  const openPlanCases: [string, RoomPlanImportOptions, object[], string, string][] = [
    ['raw geometry', RAW, [kitchen, living, bathroom], 'Kitchen', 'Living Room'],
    ['default import options', DEFAULT_ROOMPLAN_OPTIONS, [kitchen, living, bathroom], 'Kitchen', 'Living Room'],
    ['bathroom listed first', RAW, [bathroom, living, kitchen], 'Living Room', 'Kitchen'],
  ];
  it.each(openPlanCases)('a second label in one open-plan area never takes the neighbouring room (%s)', (_, options, sections, first, second) => {
    const floor = importRoomPlan(capture(openPlan, sections), options);
    const rooms = byName(floor);
    expect(rooms.Bathroom).toEqual({ walls: ['be', 'bn', 'bs', 'e'], area: 4 });
    expect(rooms[first]).toEqual({ walls: ['e', 'n', 's', 'w'], area: 32 });
    // The extra label stays as wall-less metadata instead of becoming a ghost of a real room.
    expect(rooms[second]).toEqual({ walls: [], area: 0 });
    expect(shown(floor)).toEqual(['Bathroom', first].sort());
  });

  const nestedCases: [string, RoomPlanImportOptions, object[]][] = [
    ['closet first', RAW, [closet, bedroom]],
    ['bedroom first', RAW, [bedroom, closet]],
    ['closet first, default import options', DEFAULT_ROOMPLAN_OPTIONS, [closet, bedroom]],
  ];
  it.each(nestedCases)('a walled island names the smallest cycle enclosing its label (%s)', (_, options, sections) => {
    const rooms = byName(importRoomPlan(capture(nested, sections), options));
    expect(rooms.Closet).toEqual({ walls: ['ie', 'in', 'is', 'iw'], area: 4 });
    expect(rooms.Bedroom).toEqual({ walls: ['e', 'n', 's', 'w'], area: 44 });
  });

  it('a label outside every cycle takes the nearest room no label claims', () => {
    const hallway = section('hallway', -1, 2);
    const unnamed = byName(importRoomPlan(capture(openPlan, [hallway, bathroom]), RAW));
    expect(unnamed.Hallway).toEqual({ walls: ['e', 'n', 's', 'w'], area: 32 });
    expect(unnamed.Bathroom.walls).toEqual(['be', 'bn', 'bs', 'e']);
    const named = byName(importRoomPlan(capture(openPlan, [hallway, kitchen, bathroom]), RAW));
    expect(named.Kitchen).toEqual({ walls: ['e', 'n', 's', 'w'], area: 32 });
    expect(named.Hallway).toEqual({ walls: [], area: 0 });
  });

  it('keeps every room of the shipped multi-room capture when its stray label is listed first', () => {
    const data = JSON.parse(readFileSync('static/test-roomplan-multiroom.json', 'utf8'));
    const summary = (floor: Floor) => floor.rooms.map(r => [r.name, r.area, r.walls.length]).sort();
    const original = summary(importRoomPlan(data));
    expect(original.filter(([name]) => name !== 'unidentified').every(([, , walls]) => walls as number >= 4)).toBe(true);
    data.sections.unshift(data.sections.pop());
    expect(data.sections[0].label).toBe('unidentified');
    expect(summary(importRoomPlan(data))).toEqual(original);
  });
});

describe('walls collapsed by corner merging', () => {
  // 4 x 3 m room whose east wall steps out 10 cm halfway along, so both ends
  // of the jog fall inside one 15 cm merge cluster.
  const jog = wall('jog', 4, 1.5, 4.1, 1.5);
  const room = [wall('n', 0, 0, 4, 0), wall('e1', 4, 0, 4, 1.5), jog, wall('e2', 4.1, 1.5, 4.1, 3), wall('s', 4.1, 3, 0, 3), wall('w', 0, 3, 0, 0)];
  const scan = capture(room, [section('kitchen', 2, 1.5)]);

  it('drops the jog instead of keeping a zero-length wall, still detects the room and exports a package', () => {
    expect(roomPlanImportOptions(scan)).toEqual(DEFAULT_ROOMPLAN_OPTIONS);
    const floor = importRoomPlan(scan);
    expect(floor.walls.map(w => w.id)).toEqual(['n', 'e1', 'e2', 's', 'w']);
    for (const w of floor.walls) expect(length(w)).toBeGreaterThan(100);
    const rooms = byName(floor);
    expect(rooms.Kitchen.walls).toEqual(['e1', 'e2', 'n', 's', 'w']);
    expect(rooms.Kitchen.area).toBeCloseTo(12.2, 0);
    expect(shown(floor)).toEqual(['Kitchen']);
    expect(() => projectPackageBytes(createProjectFromRoomPlan(scan, 'Jog'))).not.toThrow();
    // Geometry left untouched keeps the jog.
    expect(length(importRoomPlan(scan, RAW).walls.find(w => w.id === 'jog')!)).toBeCloseTo(10);
  });

  it('moves an opening on a collapsed wall to the nearest wall and discards one with no wall in reach', () => {
    const lone = wall('lone', 8, 1, 8.1, 1);
    const data = capture([...room, lone], [section('kitchen', 2, 1.5)],
      { windows: [opening('win', jog, 'window', 0.6)], doors: [opening('door', lone, 'door', 0.8)] });
    const floor = importRoomPlan(data);
    expect(floor.walls.map(w => w.id)).toEqual(['n', 'e1', 'e2', 's', 'w']);
    expect(floor.windows).toHaveLength(1);
    expect(['e1', 'e2']).toContain(floor.windows[0].wallId);
    expect(floor.windows[0].position).toBeGreaterThan(0);
    expect(floor.windows[0].position).toBeLessThan(1);
    expect(floor.doors).toEqual([]);
    expect(() => projectPackageBytes(createProjectFromRoomPlan(data, 'Jog'))).not.toThrow();
  });
});
