import { beforeEach, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { Vector3 } from 'three';
import { buildWallSegments, openingOnWall, roomCeilingHeight, wallPathSpans, doorPanelPose } from '$lib/utils/wallProfiles';
import { createSlopedBoxGeometry } from '$lib/utils/slopedWallGeometry';
import { addDoor, addWindow, addWall, currentProject, createDefaultProject, reverseWall, splitWall, updateWall, undo } from '$lib/stores/project';
import { getWallHeightAt, type Door, type Wall, type Window } from '$lib/models/types';
import { drawDoorOnWall } from '$lib/utils/canvasRenderer';

const wall = (overrides: Partial<Wall> = {}): Wall => ({ id: 'a', start: { x: 0, y: 0 }, end: { x: 400, y: 0 }, height: 300, startHeight: 100, endHeight: 300, thickness: 20, color: '#444444', ...overrides });
const door = (overrides: Partial<Door> = {}): Door => ({ id: 'd', wallId: 'a', position: 0.25, width: 100, height: 210, type: 'single', swingDirection: 'left', flipSide: false, ...overrides });
const window = (overrides: Partial<Window> = {}): Window => ({ id: 'w', wallId: 'a', position: 0.25, width: 100, sillHeight: 100, height: 200, type: 'standard', ...overrides });
beforeEach(() => currentProject.set(createDefaultProject()));

it('fits the entire rectangular opening beneath the low edge of the slope', () => {
  expect(openingOnWall(400, 100, 300, 0.5, 200, 0, 220)).toEqual({ left: 100, right: 300, bottom: 0, top: 150 });
  expect(openingOnWall(400, 300, 100, 0.5, 200, 0, 220)).toEqual({ left: 100, right: 300, bottom: 0, top: 150 });
  expect(openingOnWall(400, 100, 300, 0.25, 100, 200, 100)).toBeNull();
});

it('subtracts overlapping doors and windows once, without duplicate wall strips', () => {
  const doors = [door()], windows = [window(), window({ id: 'w2', position: 0.375, sillHeight: 150, height: 50 })];
  const originals = JSON.stringify({ doors, windows });
  const pieces = buildWallSegments(400, 200, 400, doors, windows);
  const area = pieces.reduce((sum, p) => sum + p.width * ((p.topYLeft + p.topYRight) / 2 - p.bottomY), 0);
  expect(area).toBe(95_000); // 120,000 trapezoid - 22,500 union - 2,500 extension
  expect(JSON.stringify({ doors, windows })).toBe(originals);
  for (const p of pieces) {
    expect(p.width).toBeGreaterThan(0);
    expect(p.topYLeft).toBeGreaterThanOrEqual(p.bottomY);
    expect(p.topYRight).toBeGreaterThanOrEqual(p.bottomY);
    expect(p.topYLeft).toBeLessThanOrEqual(200 + (p.offsetX - p.width / 2) / 2);
    expect(p.topYRight).toBeLessThanOrEqual(200 + (p.offsetX + p.width / 2) / 2);
  }
});

it('positions clipped end openings at the clipped span centre and ignores openings above the wall', () => {
  const pieces = buildWallSegments(400, 200, 400, [door({ position: 0, height: 150 })], [window({ sillHeight: 500 })]);
  expect(pieces[0]).toEqual({ width: 50, offsetX: 25, bottomY: 150, topYLeft: 200, topYRight: 225 });
  expect(pieces[1]).toEqual({ width: 350, offsetX: 225, bottomY: 0, topYLeft: 225, topYRight: 400 });
});

it.each([[0, 350], [350, 0], [200, 350], [280, 280]])('builds the actual mesh within the %s → %s profile with outward triangles', (start, end) => {
  const geo = createSlopedBoxGeometry(400, 20, 0, start, end);
  const positions = geo.getAttribute('position'), indices = geo.getIndex()!, normals = geo.getAttribute('normal');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i);
    expect(Number.isFinite(y)).toBe(true);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(start + (end - start) * (x + 200) / 400 + 0.0001);
  }
  for (let i = 0; i < indices.count; i += 3) {
    const a = new Vector3().fromBufferAttribute(positions, indices.getX(i));
    const b = new Vector3().fromBufferAttribute(positions, indices.getX(i + 1));
    const c = new Vector3().fromBufferAttribute(positions, indices.getX(i + 2));
    const face = b.sub(a).cross(c.sub(a));
    if (face.lengthSq() < 1e-10) continue; // zero-height triangular tip
    expect(face.normalize().dot(new Vector3().fromBufferAttribute(normals, indices.getX(i)))).toBeGreaterThan(0.99);
  }
  geo.dispose();
});

it('uses continuous curved spans and heights in either direction', () => {
  const original = wall({ curvePoint: { x: 160, y: 200 } });
  const spans = wallPathSpans(original);
  expect(spans).toHaveLength(16);
  expect(spans[0].start).toEqual(original.start);
  expect(spans.at(-1)!.end).toEqual(original.end);
  expect(spans[8].start.y).toBe(100);
  for (let i = 1; i < spans.length; i++) {
    expect(spans[i].start).toEqual(spans[i - 1].end);
    expect(spans[i].startHeight).toBe(spans[i - 1].endHeight);
  }
  const reversed = wallPathSpans({ ...original, start: original.end, end: original.start, startHeight: 300, endHeight: 100 }).reverse();
  spans.forEach((span, i) => { expect(span.start).toEqual(reversed[i].end); expect(span.startHeight).toBe(reversed[i].endHeight); });
});

it('evaluates ceilings per room, excluding sloped or uneven boundaries only', () => {
  const flat = wall({ id: 'flat', startHeight: 280, endHeight: 280 });
  expect(roomCeilingHeight(['flat'], [wall(), flat])).toBe(280);
  expect(roomCeilingHeight(['a'], [wall(), flat])).toBeUndefined();
  expect(roomCeilingHeight(['flat', 'other'], [flat, wall({ id: 'other', startHeight: 200, endHeight: 200 })])).toBeUndefined();
  expect(roomCeilingHeight(['missing'], [flat])).toBeUndefined();
});

it('ignores invalid heights and split parameters without corrupting the project', () => {
  const id = addWall({ x: 0, y: 0 }, { x: 400, y: 0 });
  const before = JSON.stringify(get(currentProject));
  for (const value of [-1, NaN, Infinity]) updateWall(id, { startHeight: value });
  expect(splitWall(id, NaN)).toBeNull();
  expect(JSON.stringify(get(currentProject))).toBe(before);
  expect(getWallHeightAt(wall({ startHeight: NaN }), 0)).toBe(300);
});

it('retains shared texture and exact slope at a non-midpoint split, with undo', () => {
  const id = addWall({ x: 0, y: 0 }, { x: 400, y: 0 });
  updateWall(id, { startHeight: 100, endHeight: 300, texture: 'brick', interiorColor: '#123456' });
  const next = splitWall(id, 0.25)!;
  const walls = get(currentProject)!.floors[0].walls;
  expect(walls.find(w => w.id === next)).toMatchObject({ texture: 'brick', interiorColor: '#123456', startHeight: 150, endHeight: 300 });
  expect(walls.find(w => w.id === id)).toMatchObject({ startHeight: 100, endHeight: 150 });
  undo();
  expect(get(currentProject)!.floors[0].walls).toHaveLength(1);
  expect(get(currentProject)!.floors[0].walls[0]).toMatchObject({ startHeight: 100, endHeight: 300 });
});

it('keeps the rendered door hinge and open leaf in place when reversing a wall', () => {
  const id = addWall({ x: 0, y: 0 }, { x: 400, y: 200 });
  updateWall(id, { startHeight: 100, endHeight: 300, interiorColor: '#123456', exteriorColor: '#abcdef' });
  addDoor(id, 0.25, 'single');
  const render = () => {
    const paths: number[][] = [];
    const ctx = new Proxy({}, { get: (_, key) => (...args: number[]) => { if (key === 'moveTo' || key === 'lineTo') paths.push(args); }, set: () => true });
    const f = get(currentProject)!.floors[0];
    drawDoorOnWall({ ctx, zoom: 1, camX: 0, camY: 0, width: 0, height: 0 } as any, f.walls[0], f.doors[0]);
    return paths.slice(-2).flat();
  };
  const before = render();
  const f = get(currentProject)!.floors[0];
  const pose = doorPanelPose(f.walls[0], f.doors[0]);
  reverseWall(id);
  const reversedPose = doorPanelPose(f.walls[0], f.doors[0]);
  expect(reversedPose.x).toBeCloseTo(pose.x, 8);
  expect(reversedPose.z).toBeCloseTo(pose.z, 8);
  expect(Math.cos(reversedPose.yaw)).toBeCloseTo(Math.cos(pose.yaw), 8);
  expect(Math.sin(reversedPose.yaw)).toBeCloseTo(Math.sin(pose.yaw), 8);
  render().forEach((value, i) => expect(value).toBeCloseTo(before[i], 8));
  expect(get(currentProject)!.floors[0].walls[0]).toMatchObject({ startHeight: 300, endHeight: 100, interiorColor: '#abcdef', exteriorColor: '#123456' });
});

for (const kind of ['door', 'window'] as const) it(`does not split through a ${kind} or mutate its geometry`, () => {
  const id = addWall({ x: 0, y: 0 }, { x: 400, y: 0 });
  if (kind === 'door') addDoor(id, .5); else addWindow(id, .5);
  const before = JSON.stringify(get(currentProject));
  expect(splitWall(id, .5)).toBeNull();
  expect(splitWall(id, .51)).toBeNull();
  expect(JSON.stringify(get(currentProject))).toBe(before);
  expect(splitWall(id, .8)).not.toBeNull();
  undo();
  expect(JSON.stringify(get(currentProject))).toBe(before);
});

for (const kind of ['door', 'window'] as const) it(`allows splitting at either ${kind} edge without clipping`, () => {
  for (const side of [-1, 1]) {
    currentProject.set(createDefaultProject());
    const id = addWall({ x: 0, y: 0 }, { x: 400, y: 0 });
    if (kind === 'door') addDoor(id, .5); else addWindow(id, .5);
    const floor = get(currentProject)!.floors[0];
    const opening = kind === 'door' ? floor.doors[0] : floor.windows[0];
    const width = opening.width;
    expect(splitWall(id, .5 + side * width / 800)).not.toBeNull();
    const owner = floor.walls.find(w => w.id === opening.wallId)!;
    const length = owner.end.x - owner.start.x;
    expect(owner.start.x + opening.position * length).toBeCloseTo(200, 8);
    expect(opening.width).toBe(width);
    expect(opening.position * length - width / 2).toBeGreaterThanOrEqual(-1e-7);
    expect(opening.position * length + width / 2).toBeLessThanOrEqual(length + 1e-7);
  }
});
