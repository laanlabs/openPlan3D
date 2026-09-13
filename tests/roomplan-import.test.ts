import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { get } from 'svelte/store';
import JSZip from 'jszip';
import { createProjectFromRoomPlan, extractRoomJsonFromZip, importRoomPlanFloors, isRoomPlanJson, roomPlanImportOptions } from '$lib/utils/roomplanImport';
import { currentProject, loadProject } from '$lib/stores/project';
import { drawDoorOnWall } from '$lib/utils/canvasRenderer';
import { roomProject } from './fixtures/project';

// Identical fixtures are asserted against the real Swift exporter in FloorPlanTests.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/handoff-roomplan.json', import.meta.url), 'utf8'));
const native = JSON.parse(readFileSync(new URL('./fixtures/handoff-plan.json', import.meta.url), 'utf8'));
const capture = () => structuredClone(fixture);

it('preserves reflected RoomPlan furniture orientation for all local axis combinations', () => {
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const input = capture(), object = input.objects[0], angle = Math.PI / 6;
    const c = Math.cos(angle), s = Math.sin(angle);
    object.transform[0] = c * sx; object.transform[2] = s * sx;
    object.transform[8] = -s * sy; object.transform[10] = c * sy;
    const item = importRoomPlanFloors(input).flatMap(f => f.furniture).find(f => f.id === object.identifier)!;
    const rotation = item.rotation * Math.PI / 180;
    for (const [x, y] of [[0.4, 0.7], [-0.3, 0.2]]) {
      const actualX = Math.cos(rotation) * item.scale.x * x - Math.sin(rotation) * item.scale.y * y;
      const actualY = Math.sin(rotation) * item.scale.x * x + Math.cos(rotation) * item.scale.y * y;
      expect(actualX).toBeCloseTo(c * sx * x - s * sy * y, 8);
      expect(actualY).toBeCloseTo(s * sx * x + c * sy * y, 8);
    }
  }
});

it('preserves iOS floors, exact wall geometry, thickness, heights and identifiers', () => {
  const floors = importRoomPlanFloors(capture());
  expect(floors.map(f => [f.level, f.name])).toEqual([[0, 'Entry'], [2, 'Loft'], [3, 'Future Floor']]);
  expect(floors[2].walls).toEqual([]);
  for (const expected of native.walls) {
    const wall = floors.flatMap(f => f.walls).find(w => w.id === expected.id)!;
    expect(wall.thickness).toBeCloseTo(expected.thickness * 100, 8);
    expect(wall.height).toBeCloseTo(expected.height * 100, 8);
    for (const endpoint of ['start', 'end'] as const) {
      expect(wall[endpoint].x).toBeCloseTo(expected[endpoint].x * 100, 8);
      expect(wall[endpoint].y).toBeCloseTo(expected[endpoint].y * 100, 8);
    }
  }
  expect(createProjectFromRoomPlan(capture(), 'Imported').floors).toHaveLength(3);
});

it('preserves opening styles, fractional dimensions, sill heights and door orientation', () => {
  const ground = importRoomPlanFloors(capture())[0];
  expect(ground.doors.map(d => d.type)).toEqual(['single', 'double', 'sliding', 'sliding']);
  expect(ground.windows.map(w => w.type)).toEqual(['fixed', 'sliding']);
  for (const expected of native.openings) {
    const opening = [...ground.doors, ...ground.windows].find(o => o.id === expected.id)!;
    expect(opening.wallId).toBe(expected.wallID);
    expect(opening.width).toBeCloseTo(expected.width * 100, 8);
    expect(opening.height).toBeCloseTo(expected.height * 100, 8);
    expect(opening.position).toBeCloseTo(expected.position, 8);
  }
  expect(ground.doors[0]).toMatchObject({ swingDirection: 'right', flipSide: true });
  expect(ground.doors[1]).toMatchObject({ swingDirection: 'left', flipSide: false });
  expect(ground.windows.map(w => w.sillHeight)).toEqual([73.5, 83.5]);
});

it.each([true, false])('matches the actual rendered iOS hinge and normal when hingeLeft=%s', hingeLeft => {
  for (const opensInward of [true, false]) {
    const data = capture();
    Object.assign(data.doors[0], { hingeLeft, opensInward });
    const floor = importRoomPlanFloors(data)[0];
    const door = floor.doors[0], wall = floor.walls[0];
    const moves: number[][] = [], lines: number[][] = [];
    const ctx = new Proxy({ moveTo: (...p: number[]) => moves.push(p), lineTo: (...p: number[]) => lines.push(p) },
      { get: (target, key) => target[key as keyof typeof target] ?? (() => {}) });
    drawDoorOnWall({ ctx, zoom: 1, camX: 0, camY: 0, width: 0, height: 0 } as any, wall, door);
    const hingeX = 180 + (hingeLeft ? -1 : 1) * 91.5 / 2;
    expect(moves.at(-1)?.[0]).toBeCloseTo(hingeX, 8);
    expect(lines.at(-1)?.[0]).toBeCloseTo(hingeX, 8);
    expect(lines.at(-1)?.[1]).toBeCloseTo((opensInward ? 1 : -1) * 91.5, 8);
  }
});

it('preserves room labels and furniture dimensions/heading', () => {
  const floor = importRoomPlanFloors(capture())[0];
  expect(floor.rooms[0]).toMatchObject({ name: 'QA Kitchen', color: '#aaccdd', area: 24 });
  expect(floor.rooms[0].walls).toHaveLength(4);
  expect(floor.furniture[0]).toMatchObject({ id: native.furniture[0].id, width: 55.5, depth: 62.5, height: 90 });
  expect(floor.furniture[0].rotation).toBeCloseTo(30, 8);
});

it('uses raw-capture thickness fallback, category mapping and measured sill elevation', () => {
  const data = capture();
  delete data.openplanPrepared;
  delete data.openplanHandoffVersion;
  data.walls[0].dimensions[2] = 0;
  delete data.windows[0].style;
  delete data.windows[0].sillHeight;
  // Raw Apple transforms can use an arbitrary vertical origin.
  data.walls[0].transform[13] += 8;
  data.windows[0].transform[13] += 8;
  const floor = importRoomPlanFloors(data, { straighten: false })[0];
  expect(floor.walls[0].thickness).toBe(15);
  expect(floor.windows[0]).toMatchObject({ sillHeight: 73.5, type: 'standard' });
});

it('keeps explicit import choices and accepts old prepared and valid empty plans', () => {
  const data = capture();
  delete data.openplanHandoffVersion;
  expect(roomPlanImportOptions(data)).toEqual({ straighten: false, orthogonal: false, mergeDistance: 0 });
  data.openplanImportOptions = { straighten: true, orthogonal: true };
  expect(roomPlanImportOptions(data).orthogonal).toBe(true);
  expect(importRoomPlanFloors(data)[1].walls[0].end.y).toBeCloseTo(importRoomPlanFloors(data)[1].walls[0].start.y);
  const empty = { openplanPrepared: true, walls: [], stories: [{ index: 2, name: 'Empty' }] };
  expect(isRoomPlanJson(empty)).toBe(true);
  const project = createProjectFromRoomPlan(empty, 'Empty');
  expect(project.floors[0]).toMatchObject({ level: 2, walls: [] });
  expect(project.activeFloorId).toBe(project.floors[0].id);
});

it('imports Apple passage openings instead of silently dropping them', () => {
  const data = capture();
  const passage = data.doors.pop();
  delete passage.style;
  data.openings.push(passage);
  expect(importRoomPlanFloors(data)[0].doors.at(-1)?.type).toBe('opening');
});

describe('atomic rejection of malformed captures', () => {
  const corruptions: [string, (data: any) => void][] = [
    ['array type', d => { d.doors = {}; }],
    ['null element', d => { d.walls.push(null); }],
    ['truncated transform', d => { d.walls[1].transform.pop(); }],
    ['nonfinite transform', d => { d.walls[0].transform[12] = Infinity; }],
    ['missing dimensions', d => { delete d.windows[0].dimensions; }],
    ['string width', d => { d.doors[0].dimensions[0] = '0.9'; }],
    ['negative width', d => { d.doors[0].dimensions[0] = -1; }],
    ['duplicate id', d => { d.walls[1].identifier = d.walls[0].identifier; }],
    ['orphan opening', d => { d.doors[0].parentIdentifier = 'missing'; }],
    ['wrong storey', d => { d.doors[0].story = 2; }],
    ['invalid floor index', d => { d.stories[0].index = '0'; }],
    ['duplicate floor index', d => { d.stories[1].index = 0; }],
    ['invalid room anchor', d => { d.sections[0].center = []; }],
    ['unknown opening style', d => { d.doors[0].style = 'future-style'; }],
    ['wrong hinge type', d => { d.doors[0].hingeLeft = 'false'; }],
    ['negative sill', d => { d.windows[0].sillHeight = -1; }],
    ['unsupported version', d => { d.openplanHandoffVersion = 2; }],
    ['invalid import choices', d => { d.openplanImportOptions = { straighten: 'false' }; }],
  ];
  it.each(corruptions)('rejects %s without changing the current project', (_, corrupt) => {
    const previous = roomProject();
    loadProject(previous);
    const original = JSON.stringify(get(currentProject));
    const data = capture();
    corrupt(data);
    expect(() => loadProject(createProjectFromRoomPlan(data, 'Damaged'))).toThrow(/Invalid RoomPlan file/);
    expect(JSON.stringify(get(currentProject))).toBe(original);
  });
});

it('extracts exactly one raw capture from ZIP and refuses stale scans beside edited plans', async () => {
  const zip = new JSZip().file('Session/room.json', JSON.stringify(capture()));
  const buffer = async () => await zip.generateAsync({ type: 'nodebuffer' }) as unknown as File;
  expect(await extractRoomJsonFromZip(await buffer())).toEqual(JSON.parse(JSON.stringify(fixture)));
  zip.file('Session/plan.json', JSON.stringify(native));
  await expect(extractRoomJsonFromZip(await buffer())).rejects.toThrow('Export Editable Plan');
  zip.remove('Session/plan.json');
  zip.file('Other/room.json', '{}');
  await expect(extractRoomJsonFromZip(await buffer())).rejects.toThrow('exactly one');
});
