import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { FurnitureItem, Point, Wall } from '$lib/models/types';
import { getFurnitureSize } from '$lib/utils/furnitureCatalog';
import { resizeFurnitureFromHandle, type HandleType } from '$lib/utils/canvasInteraction';
import { snapFurnitureToWalls } from '$lib/utils/furnitureGeometry';
import { findFurnitureAt, findHandleAt } from '$lib/utils/hitTesting';
import { beginUndoGroup, endUndoGroup, loadProject, currentProject, transformFurnitureDuringDrag, updateFurniture, undo, redo } from '$lib/stores/project';
import { roomProject } from './fixtures/project';
import { reorderFurniture, scaleFurniture } from '$lib/stores/project';

const item = (updates: Partial<FurnitureItem> = {}): FurnitureItem => ({
  id: 'qa-chair', catalogId: 'sofa', position: { x: 0, y: 0 }, rotation: 0,
  scale: { x: 1, y: 1, z: 1 }, width: 100, depth: 60, height: 80, color: '#2563eb', ...updates,
});
const wall: Wall = { id: 'wall', start: { x: 0, y: 0 }, end: { x: 600, y: 0 }, thickness: 20, height: 250, color: '#eee' };

it('furniture scaling preserves mirror signs and ignores invalid or unchanged values', () => {
  const project = roomProject();
  project.floors[0].furniture = [item({ scale: { x: 1.5, y: -2, z: 3 } })];
  currentProject.set(project);
  const before = structuredClone(project.floors[0]);
  scaleFurniture('qa-chair', { x: -1.5, y: -2 });
  const mirrored = structuredClone(get(currentProject)!.floors[0]);
  expect(mirrored.furniture[0].scale).toEqual({ x: -1.5, y: -2, z: 3 });
  undo(); expect(get(currentProject)!.floors[0]).toEqual(before);
  scaleFurniture('qa-chair', { x: NaN, y: 2 });
  scaleFurniture('missing', { x: 2, y: 2 });
  scaleFurniture('qa-chair', { x: 1.5, y: -2 });
  redo(); expect(get(currentProject)!.floors[0]).toEqual(mirrored);
  scaleFurniture('qa-chair', { x: -.01, y: .01 });
  expect(get(currentProject)!.floors[0].furniture[0].scale).toEqual({ x: -.2, y: .2, z: 3 });
});

it('furniture stacking preserves data and treats the existing end position as a history no-op', () => {
  const project = roomProject();
  project.floors[0].furniture = [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c' })];
  currentProject.set(project);
  const before = structuredClone(project.floors[0]);
  reorderFurniture('a', 'front');
  const front = structuredClone(get(currentProject)!.floors[0]);
  expect(front).toEqual({ ...before, furniture: [before.furniture[1], before.furniture[2], before.furniture[0]] });
  reorderFurniture('a', 'front');
  undo(); expect(get(currentProject)!.floors[0]).toEqual(before);
  reorderFurniture('missing', 'front');
  reorderFurniture('a', 'back');
  redo(); expect(get(currentProject)!.floors[0]).toEqual(front);
  reorderFurniture('a', 'back');
  expect(get(currentProject)!.floors[0]).toEqual(before);
  undo(); expect(get(currentProject)!.floors[0]).toEqual(front);
});

it('unchanged furniture appearance and transforms preserve Undo and Redo', () => {
  const project = roomProject();
  project.floors[0].furniture = [item()];
  currentProject.set(project);
  const before = structuredClone(project.floors[0]);
  const original = before.furniture[0];
  updateFurniture(original.id, { color: '#abcdef' });
  const edited = structuredClone(get(currentProject)!.floors[0]);
  updateFurniture(original.id, { position: { ...original.position } });
  updateFurniture(original.id, { scale: { ...original.scale } });
  undo(); expect(get(currentProject)!.floors[0]).toEqual(before);
  updateFurniture(original.id, { color: original.color });
  updateFurniture('missing', { rotation: 45 });
  updateFurniture(original.id, {});
  redo(); expect(get(currentProject)!.floors[0]).toEqual(edited);
});

const world = (point: Point, position: Point, rotation: number) => {
  const a = rotation * Math.PI / 180;
  return { x: position.x + point.x * Math.cos(a) - point.y * Math.sin(a),
    y: position.y + point.x * Math.sin(a) + point.y * Math.cos(a) };
};
const handles: [Exclude<HandleType, 'rotate'>, number, number][] = [
  ['resize-tl', -1, -1], ['resize-tr', 1, -1], ['resize-bl', -1, 1], ['resize-br', 1, 1],
  ['resize-l', -1, 0], ['resize-r', 1, 0], ['resize-t', 0, -1], ['resize-b', 0, 1],
];

it.each([0, 30, 90, 180, 270].flatMap(rotation => handles.map(([handle, x, y]) => ({ rotation, handle, x, y }))))(
  '$handle keeps the opposite anchor fixed at $rotation degrees', ({ rotation, handle, x, y }) => {
    const position = { x: 250, y: 300 };
    const pointer = world({ x: x * 80, y: y * 60 }, position, rotation);
    const before = world({ x: -x * 50, y: -y * 30 }, position, rotation);
    const result = resizeFurnitureFromHandle({ position, rotation, width: 100, depth: 60,
      scale: { x: 1, y: 1 }, handle, pointer, preserveAspectRatio: false });
    const after = world({ x: -x * 100 * result.scale.x / 2, y: -y * 60 * result.scale.y / 2 }, result.position, rotation);
    expect(after.x).toBeCloseTo(before.x, 8);
    expect(after.y).toBeCloseTo(before.y, 8);
    expect(result.scale.x).toBeCloseTo(x ? 1.3 : 1);
    expect(result.scale.y).toBeCloseTo(y ? 1.5 : 1);
  },
);

it('preserves both mirror axes when resizing', () => {
  const result = resizeFurnitureFromHandle({ position: { x: 0, y: 0 }, rotation: 0,
    width: 100, depth: 60, scale: { x: -1, y: -1 }, handle: 'resize-tl',
    pointer: { x: -80, y: -60 }, preserveAspectRatio: false });
  expect(result).toEqual({ position: { x: -15, y: -15 }, scale: { x: -1.3, y: -1.5 } });
});

it('clamps at 10 cm when crossing the opposite edge', () => {
  const result = resizeFurnitureFromHandle({ position: { x: 0, y: 0 }, rotation: 0,
    width: 100, depth: 60, scale: { x: 1, y: 1 }, handle: 'resize-r',
    pointer: { x: -150, y: 0 }, preserveAspectRatio: false });
  expect(result).toEqual({ position: { x: -45, y: 0 }, scale: { x: 0.1, y: 1 } });
});

it('preserves aspect ratio while growing from the top-left corner', () => {
  const result = resizeFurnitureFromHandle({ position: { x: 0, y: 0 }, rotation: 0,
    width: 100, depth: 60, scale: { x: 1, y: 1 }, handle: 'resize-tl',
    pointer: { x: -80, y: -60 }, preserveAspectRatio: true });
  expect(result).toEqual({ position: { x: -25, y: -15 }, scale: { x: 1.5, y: 1.5 } });
});

it('uses overridden and mirrored sizes for furniture selection and handles', () => {
  const furniture = item({ width: 300, depth: 200, rotation: 90, scale: { x: -2, y: 0.5, z: 1 } });
  expect(getFurnitureSize(furniture)).toEqual({ width: 600, depth: 100, height: 80 });
  expect(findFurnitureAt({ x: 0, y: 250 }, [furniture])).toBe(furniture);
  expect(findFurnitureAt({ x: 80, y: 250 }, [furniture])).toBeNull();
  expect(findHandleAt({ x: 0, y: 300 }, furniture.id, [furniture], 1)).toBe('resize-r');
});

it.each([1, -1])('wall snapping uses the overridden depth on side %s', side => {
  const furniture = item({ width: 160, depth: 120, scale: { x: -1, y: 1.5, z: 1 } });
  const result = snapFurnitureToWalls({ x: 253, y: side * 104 }, furniture, [wall], value => Math.round(value / 25) * 25);
  expect(result?.position).toEqual({ x: 250, y: side * 100 });
  expect(result?.rotation).toBe(side === 1 ? 0 : 180);
});

it('keeps diagonal wall clearance exact when grid snapping is enabled', () => {
  const diagonal = { ...wall, end: { x: 600, y: 600 } };
  const center = world({ x: 270, y: 42 }, { x: 0, y: 0 }, 45);
  const result = snapFurnitureToWalls(center, item(), [diagonal], value => Math.round(value / 25) * 25)!;
  expect(result).not.toBeNull();
  expect((result.position.y - result.position.x) / Math.SQRT2).toBeCloseTo(40, 8);
  expect(result.rotation).toBe(45);
});

it('does not force furniture onto a shorter wall, a curved wall, or a distant wall', () => {
  expect(snapFurnitureToWalls({ x: 100, y: 40 }, item({ width: 700 }), [wall])).toBeNull();
  expect(snapFurnitureToWalls({ x: 100, y: 40 }, item(), [{ ...wall, curvePoint: { x: 300, y: 60 } }])).toBeNull();
  expect(snapFurnitureToWalls({ x: 100, y: 80 }, item(), [wall])).toBeNull();
});

it('a multi-frame mirrored resize is one undo step and keeps its exact final footprint', () => {
  const project = roomProject();
  project.floors[0].furniture = [item({ scale: { x: -1, y: 1, z: 1 } })];
  loadProject(project);
  beginUndoGroup();
  transformFurnitureDuringDrag('qa-chair', { position: { x: -20, y: 0 }, scale: { x: -0.6, y: 1, z: 1 } });
  transformFurnitureDuringDrag('qa-chair', { position: { x: -45, y: 0 }, scale: { x: -0.1, y: 1, z: 1 } });
  endUndoGroup('Resized furniture');
  expect(getFurnitureSize(get(currentProject)!.floors[0].furniture[0]).width).toBe(10);
  undo();
  expect(get(currentProject)!.floors[0].furniture[0]).toMatchObject({ position: { x: 0, y: 0 }, scale: { x: -1, y: 1, z: 1 } });
  redo();
  expect(get(currentProject)!.floors[0].furniture[0]).toMatchObject({ position: { x: -45, y: 0 }, scale: { x: -0.1, y: 1, z: 1 } });
});
