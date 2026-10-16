import { beforeEach, expect, it, vi } from 'vitest';
import type { Door, Wall } from '$lib/models/types';
import { exportDXF } from '$lib/utils/cadExport';
import { exportAsSVG } from '$lib/utils/export';
import { drawDoorOnWall } from '$lib/utils/canvasRenderer';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import { roomProject } from './fixtures/project';

// Same download harness as tests/exports.test.ts: the Blob handed to URL.createObjectURL is the file.
let downloaded: Blob[];
beforeEach(() => {
  downloaded = [];
  const ctx = new Proxy({ measureText: () => ({ width: 30 }) }, { get: (target, key) => target[key as keyof typeof target] ?? (() => {}) });
  vi.stubGlobal('document', {
    createElement: (tag: string) => tag === 'canvas' ? { getContext: () => ctx } : { click: vi.fn() },
    querySelectorAll: () => [], querySelector: () => null,
  });
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { downloaded.push(blob as Blob); return 'blob:test'; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

type Entity = { type: string; layer: string; tags: Record<string, string[]> };
/** DXF tag pairs → entities keyed by group code (LWPOLYLINE repeats 10/20 per vertex). */
function entities(dxf: string): Entity[] {
  const lines = dxf.split(/\r?\n/).map(line => line.trim()), out: Entity[] = [];
  let current: Entity | undefined;
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = lines[i], value = lines[i + 1];
    if (code === '0') { current = { type: value, layer: '', tags: {} }; out.push(current); }
    else if (current && code === '8') current.layer = value;
    else if (current) (current.tags[code] ??= []).push(value);
  }
  return out;
}
const num = (entity: Entity, code: string, index = 0) => Number(entity.tags[code][index]);
/** Rounds away 1e-14 noise from cos(π/2) and normalises −0. */
const round = (value: number) => Math.round(value * 1e6) / 1e6 + 0;
const lineOf = (entity: Entity) => [num(entity, '10'), num(entity, '20'), num(entity, '11'), num(entity, '21')].map(round);
/** Both ends of a DXF arc, which always runs counter-clockwise from code 50 to code 51. */
function arcOf(entity: Entity) {
  const cx = num(entity, '10'), cy = num(entity, '20'), r = num(entity, '40'), a0 = num(entity, '50'), a1 = num(entity, '51');
  const at = (deg: number) => [round(cx + r * Math.cos(deg * Math.PI / 180)), round(cy + r * Math.sin(deg * Math.PI / 180))];
  return { centre: [round(cx), round(cy)], r, angles: [a0, a1], start: at(a0), end: at(a1), sweep: ((a1 - a0) % 360 + 360) % 360 };
}

// Wall a-0 runs (0,0)→(400,0) with the room below it (screen +y, CAD −y); a 90 cm door at 0.5 has
// its jambs at x = 155 and x = 245. addDoor() defaults are single / left / inward (flipSide false).
function doorProject(door: Partial<Door>) {
  const project = roomProject();
  project.floors[0].doors = [{ id: 'd1', wallId: 'a-0', position: 0.5, width: 90, height: 210, type: 'single', swingDirection: 'left', flipSide: false, ...door }];
  return project;
}
async function dxfDoor(door: Partial<Door>) {
  const project = doorProject(door);
  expect(exportDXF(project)).toBe(true);
  const all = entities(await downloaded.at(-1)!.text());
  return { all, doors: all.filter(e => e.layer.startsWith('DOORS') && e.type !== 'LAYER'), project };
}

/** What the editor canvas draws for the same door at zoom 1 (world == screen): swing arcs and the 2.5 px leaf lines. */
function canvasDoor(wall: Wall, door: Door) {
  const arcs: number[][] = [], leaves: number[][] = [];
  let last: number[] = [], lineWidth = 1;
  const ctx = new Proxy({}, {
    get: (_target, key) => key === 'lineWidth' ? lineWidth : (...args: number[]) => {
      if (key === 'arc' && args[2] > 5) arcs.push(args.slice(0, 5));
      if (key === 'moveTo') last = args;
      if (key === 'lineTo' && lineWidth === 2.5) leaves.push([...last, ...args]);
    },
    set: (_target, key, value) => { if (key === 'lineWidth') lineWidth = value; return true; },
  });
  drawDoorOnWall({ ctx, width: 0, height: 0, zoom: 1, camX: 0, camY: 0 } as unknown as CanvasState, wall, door);
  const at = (arc: number[], angle: number) => [round(arc[0] + arc[2] * Math.cos(angle)), round(arc[1] + arc[2] * Math.sin(angle))];
  return { arcs: arcs.map(arc => ({ centre: [arc[0], arc[1]], r: arc[2], ends: [at(arc, arc[3]), at(arc, arc[4])] })), leaves };
}
/** Canvas (y down) coordinates → CAD (y up). */
const flipY = (points: number[]) => points.map((value, i) => round(i % 2 ? -value : value));

it('hinges the DXF single door at the jamb with a full-width swing into the room, like the canvas and SVG', async () => {
  const { doors, project } = await dxfDoor({});
  expect(doors.map(e => `${e.type}@${e.layer}`)).toEqual(['ARC@DOORS', 'LINE@DOORS']);
  const arc = arcOf(doors[0]);
  expect(arc.centre).toEqual([245, 0]);
  expect(arc.r).toBe(90);
  expect(arc.angles).toEqual([180, 270]);
  expect([arc.start, arc.end, arc.sweep]).toEqual([[155, 0], [245, -90], 90]);
  expect(lineOf(doors[1])).toEqual([245, 0, 245, -90]);

  const floor = project.floors[0], plan = canvasDoor(floor.walls[0], floor.doors[0]);
  expect(plan.arcs).toEqual([{ centre: [245, 0], r: 90, ends: [[245, 90], [155, 0]] }]);
  expect(plan.leaves).toEqual([[245, 0, 245, 90]]);
  expect(flipY(plan.leaves[0])).toEqual(lineOf(doors[1]));

  exportAsSVG(project);
  const svg = await downloaded.at(-1)!.text();
  const path = /<path d="M ([\d.-]+) ([\d.-]+) A ([\d.-]+) [\d.-]+ 0 0 \d ([\d.-]+) ([\d.-]+)" fill="none" stroke="#666"/.exec(svg)!.slice(1).map(Number);
  const leaf = /<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)" stroke="#444" stroke-width="2.5"/.exec(svg)!.slice(1).map(Number);
  expect(path[2]).toBe(90);
  expect([leaf[2] - leaf[0], leaf[3] - leaf[1]]).toEqual([0, 90]);
  expect([path[0] - leaf[0], path[1] - leaf[1], path[3] - leaf[0], path[4] - leaf[1]]).toEqual([-90, 0, 0, 90]);
});

it.each([
  [{}, [245, 0], [245, -90]],
  [{ flipSide: true }, [245, 0], [245, 90]],
  [{ swingDirection: 'right' }, [155, 0], [155, -90]],
  [{ swingDirection: 'right', flipSide: true }, [155, 0], [155, 90]],
] as const)('follows swing side and hinge jamb %j', async (door, hinge, leafEnd) => {
  const { doors, project } = await dxfDoor(door);
  const arc = arcOf(doors[0]), line = lineOf(doors[1]);
  expect(arc.centre).toEqual(hinge);
  expect([arc.r, arc.sweep]).toEqual([90, 90]);
  expect(line).toEqual([...hinge, ...leafEnd]);
  expect([arc.start, arc.end]).toContainEqual([...leafEnd]); // the arc reaches the open leaf tip
  const floor = project.floors[0], plan = canvasDoor(floor.walls[0], floor.doors[0]);
  expect([plan.arcs[0].centre, plan.arcs[0].r]).toEqual([arc.centre, arc.r]);
  expect(plan.arcs[0].ends.map(flipY).sort()).toEqual([arc.start, arc.end].sort());
  expect(flipY(plan.leaves[0])).toEqual(line);
});

it.each([
  ['a-1', 'left', false], ['a-1', 'right', true], ['a-2', 'left', true], ['a-2', 'right', false],
  ['a-3', 'left', false], ['a-3', 'right', true], ['a-0', 'left', true],
] as const)('mirrors the canvas symbol on wall %s (%s, flipped=%s)', async (wallId, swingDirection, flipSide) => {
  const { doors, project } = await dxfDoor({ wallId, swingDirection, flipSide });
  const floor = project.floors[0], wall = floor.walls.find(w => w.id === wallId)!;
  const plan = canvasDoor(wall, floor.doors[0]), arc = arcOf(doors[0]);
  expect([arc.centre, arc.r, arc.sweep]).toEqual([flipY(plan.arcs[0].centre), 90, 90]);
  expect([arc.start, arc.end].sort()).toEqual(plan.arcs[0].ends.map(flipY).sort());
  expect(lineOf(doors[1])).toEqual(flipY(plan.leaves[0]));
});

it('draws two half-width leaves for double and french doors', async () => {
  for (const type of ['double', 'french'] as const) {
    const { doors, project } = await dxfDoor({ type });
    expect(doors.map(e => e.type)).toEqual(['ARC', 'LINE', 'ARC', 'LINE']);
    const arcs = [doors[0], doors[2]].map(arcOf);
    expect(arcs.map(a => [a.centre, a.r, a.sweep])).toEqual([[[155, 0], 45, 90], [[245, 0], 45, 90]]);
    expect([doors[1], doors[3]].map(lineOf)).toEqual([[155, 0, 155, -45], [245, 0, 245, -45]]);
    const floor = project.floors[0], plan = canvasDoor(floor.walls[0], floor.doors[0]);
    expect(plan.leaves.map(flipY)).toEqual([doors[1], doors[3]].map(lineOf));
  }
});

it('draws pocket, sliding, bifold, garage and opening symbols without a swing arc', async () => {
  const dashed = (await dxfDoor({})).all.find(e => e.type === 'LAYER' && e.tags['2']?.[0] === 'DOORS_HIDDEN')!;
  expect(dashed.tags['6']).toEqual(['DASHED']);

  const pocket = (await dxfDoor({ type: 'pocket' })).doors;
  expect(pocket.map(e => `${e.type}@${e.layer}`)).toEqual(['LINE@DOORS', 'LINE@DOORS_HIDDEN']); // dxf-writer groups entities by layer
  expect(pocket.map(lineOf)).toEqual([[245, 0, 155, 0], [245, 0, 335, 0]]); // leaf closed across the opening, dashed cavity into the wall

  const opening = (await dxfDoor({ type: 'opening' })).doors;
  expect(opening.map(e => `${e.type}@${e.layer}`)).toEqual(['LINE@DOORS_HIDDEN', 'LINE@DOORS_HIDDEN']);
  expect(opening.map(lineOf)).toEqual([[155, 7.5, 245, 7.5], [155, -7.5, 245, -7.5]]); // dashed thresholds on both wall faces

  const sliding = (await dxfDoor({ type: 'sliding' })).doors;
  expect(sliding.map(e => `${e.type}@${e.layer}`)).toEqual(['LINE@DOORS', 'LINE@DOORS']);
  expect(sliding.map(lineOf)).toEqual([[155, 0, 204.05, 0], [195.95, -2.25, 245, -2.25]]); // second panel offset into the room
  expect((await dxfDoor({ type: 'sliding', flipSide: true })).doors.map(lineOf)[1]).toEqual([195.95, 2.25, 245, 2.25]);

  const bifold = (await dxfDoor({ type: 'bifold' })).doors;
  expect(bifold.map(e => `${e.type}@${e.layer}`)).toEqual(['LWPOLYLINE@DOORS']);
  const vertices = bifold[0].tags['10'].map((x, i) => [Number(x), Number(bifold[0].tags['20'][i])]);
  expect(vertices).toHaveLength(5);
  expect(vertices[0]).toEqual([155, 0]);
  expect(vertices.slice(1).every(([, y]) => y < 0)).toBe(true); // panels fold into the room
  expect(vertices[4][0]).toBeCloseTo(155 + 22.5 * (2 * Math.cos(Math.PI / 6) + 2 * Math.cos(Math.PI / 20)));

  const garage = (await dxfDoor({ type: 'garage' })).doors;
  expect(garage.map(e => `${e.type}@${e.layer}`)).toEqual(['LINE@DOORS']);
  expect(lineOf(garage[0])).toEqual([155, 0, 245, 0]);
});
