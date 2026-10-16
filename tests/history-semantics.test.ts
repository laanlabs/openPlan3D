import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  addAnnotation, addColumn, addEntourageItem, addFurniture, addGuide, addMeasurement, addStair, addTextAnnotation, addWall,
  beginUndoGroup, currentProject, detectedRoomsStore, duplicateSelection, elevationWallId, endUndoGroup, jumpToUndoStep, loadProject,
  moveColumn, moveEntourage,
  moveFurniture, moveGuide, moveStair, moveTextAnnotation, moveWallEndpoint, moveWallGeometryDuringDrag, moveWallParallel, redo,
  removeElement, resizeEntourage, selectedElementId, selectedElementIds, selectedRoomId, setBackgroundImage,
  transformFurnitureDuringDrag, undo, undoHistoryStore, ungroupElements, updateAnnotation, updateColumn, updateMeasurement,
  updateProjectDescription, updateProjectName, updateStair, updateTextAnnotation,
} from '$lib/stores/project';
import { roomProject } from './fixtures/project';

const state = () => JSON.stringify(get(currentProject));
const entries = () => get(undoHistoryStore).entries.map(entry => entry.description);
const floor = () => get(currentProject)!.floors[0];
const walls = () => floor().walls.length;

beforeEach(() => { loadProject(roomProject()); detectedRoomsStore.set([]); });
afterEach(() => vi.useRealTimers());

/** An added wall, undone: Redo holds it until a real edit replaces it. */
function pendingRedo() {
  addWall({ x: 0, y: 500 }, { x: 100, y: 500 });
  undo();
  return { before: state(), history: entries(), walls: walls() };
}

// A: project name and description edits are history steps of their own.
it('records a rename as its own Undo step instead of reverting it with the previous edit', () => {
  addWall({ x: 0, y: 500 }, { x: 100, y: 500 });
  updateProjectName('Renamed plan');
  expect(entries()).toEqual(['Added wall', 'Renamed project']);
  undo();
  expect(get(currentProject)!.name).toBe('Regression plan');
  expect(walls()).toBe(5);
  undo();
  expect(walls()).toBe(4);
  redo(); redo();
  expect(get(currentProject)!.name).toBe('Renamed plan');
  expect(walls()).toBe(5);
});

it('ignores an unchanged rename and coalesces typed keystrokes into one step', () => {
  const { before, history, walls: count } = pendingRedo();
  updateProjectName('Regression plan');
  expect(state()).toBe(before);
  expect(entries()).toEqual(history);
  redo();
  expect(walls()).toBe(count + 1);
  for (const name of ['R', 'Re', 'Ren']) updateProjectName(name);
  expect(entries()).toEqual(['Added wall', 'Renamed project']);
  undo();
  expect(get(currentProject)!.name).toBe('Regression plan');
  redo();
  expect(get(currentProject)!.name).toBe('Ren');
});

it('records the Settings description as one coalesced step and ignores an unchanged one', () => {
  updateProjectDescription('');
  expect(entries()).toEqual([]);
  addWall({ x: 0, y: 500 }, { x: 100, y: 500 });
  for (const text of ['C', 'Cl', 'Client notes']) updateProjectDescription(text);
  expect(entries()).toEqual(['Added wall', 'Changed project description']);
  undo();
  expect(get(currentProject)!.description).toBeUndefined();
  expect(walls()).toBe(5);
  redo();
  expect(get(currentProject)!.description).toBe('Client notes');
  const { before, history, walls: count } = pendingRedo();
  updateProjectDescription('Client notes');
  expect(state()).toBe(before);
  expect(entries()).toEqual(history);
  redo();
  expect(walls()).toBe(count + 1);
});

// B: a restore brings back the selection that went with the state (Undo: before the step, Redo: after it);
// ids the restored floor no longer holds are dropped, and deleting nothing records nothing.
it('drops the selection Undo removed, so Delete neither records a step nor discards Redo, and Redo re-selects it', () => {
  beginUndoGroup();
  const id = addFurniture('sofa', { x: 100, y: 100 });
  selectedElementId.set(id);
  endUndoGroup('Placed furniture');
  undo();
  expect(floor().furniture).toHaveLength(0);
  expect(get(selectedElementId)).toBeNull();
  removeElement(id);
  expect(entries()).toEqual([]);
  redo();
  expect(floor().furniture).toHaveLength(1);
  expect(entries()).toEqual(['Placed furniture']);
  expect(get(selectedElementId)).toBe(id);
});

it('Redo re-selects the copies Undo deselected, so Delete after Redo removes them', () => {
  const a = addFurniture('sofa', { x: 100, y: 100 });
  selectedElementIds.set(new Set([a]));
  selectedElementId.set(a);
  const copies = duplicateSelection(new Set([a]));
  expect(copies).toHaveLength(1);
  selectedElementIds.set(new Set(copies));
  selectedElementId.set(copies[0]);
  undo();
  expect([...get(selectedElementIds)]).toEqual([a]);
  expect(get(selectedElementId)).toBe(a);
  redo();
  expect([...get(selectedElementIds)]).toEqual(copies);
  expect(get(selectedElementId)).toBe(copies[0]);
  beginUndoGroup();
  for (const id of get(selectedElementIds)) removeElement(id);
  endUndoGroup('Deleted selection');
  expect(floor().furniture.map(item => item.id)).toEqual([a]);
  expect(entries().slice(-2)).toEqual(['Duplicated selection', 'Deleted selection']);
  undo();
  expect(floor().furniture.map(item => item.id)).toEqual([a, ...copies]);
  expect([...get(selectedElementIds)]).toEqual(copies);
});

it('jumping back through the History panel restores the selection of that step, and Redo walks forward with it', () => {
  const a = addFurniture('sofa', { x: 100, y: 100 });
  selectedElementId.set(a);
  const b = addFurniture('sofa', { x: 200, y: 200 });
  selectedElementId.set(b);
  const c = addFurniture('sofa', { x: 300, y: 300 });
  selectedElementId.set(c);
  jumpToUndoStep(1);
  expect(floor().furniture.map(item => item.id)).toEqual([a]);
  expect(get(selectedElementId)).toBe(a);
  redo();
  expect(get(selectedElementId)).toBe(b);
  redo();
  expect(floor().furniture.map(item => item.id)).toEqual([a, b, c]);
  expect(get(selectedElementId)).toBe(c);
});

it('Undo brings back the selection before a step, Redo the one after it, and clears ids that no longer resolve', () => {
  detectedRoomsStore.set([{ id: 'kept-room', name: 'Hall', walls: ['a-0', 'a-1', 'a-2', 'a-3'], floorTexture: 'hardwood', area: 12 }]);
  selectedElementIds.set(new Set(['a-0']));
  const wall = addWall({ x: 0, y: 500 }, { x: 100, y: 500 });
  elevationWallId.set(wall);
  selectedRoomId.set('kept-room');
  beginUndoGroup();
  const a = addFurniture('sofa', { x: 100, y: 100 }), b = addFurniture('chair', { x: 200, y: 200 });
  endUndoGroup('Pasted selection');
  selectedElementIds.set(new Set([a, b, 'a-0']));
  selectedElementId.set(a);
  undo();
  expect([...get(selectedElementIds)]).toEqual(['a-0']);
  expect(get(selectedElementId)).toBeNull();
  expect(get(elevationWallId)).toBe(wall);
  expect(get(selectedRoomId)).toBe('kept-room');
  beginUndoGroup();
  for (const id of [a, b]) removeElement(id);
  endUndoGroup();
  expect(entries()).toEqual(['Added wall']);
  redo();
  expect(floor().furniture).toHaveLength(2);
  expect([...get(selectedElementIds)]).toEqual([a, b, 'a-0']);
  expect(get(selectedElementId)).toBe(a);
  selectedRoomId.set('gone-room');
  undo(); undo();
  expect(get(elevationWallId)).toBeNull();
  expect(get(selectedRoomId)).toBeNull();
  expect([...get(selectedElementIds)]).toEqual(['a-0']);
});

// C: an edit that changes nothing is not a history step.
const noops: [string, () => string, (id: string) => void][] = [
  ['ungrouping an ungrouped selection', () => 'a-0', id => ungroupElements([id])],
  ['confirming an unchanged text note', () => addTextAnnotation(0, 0, 'Note'), id => updateTextAnnotation(id, { text: 'Note' })],
  ['confirming an unchanged dimension label', () => addAnnotation(0, 0, 100, 0, 40, '1 m'), id => updateAnnotation(id, { label: '1 m' })],
  ['re-applying the active stair direction', () => addStair({ x: 0, y: 0 }), id => updateStair(id, { direction: 'up' })],
  ['re-applying the active column shape', () => addColumn({ x: 0, y: 0 }, 'round'), id => updateColumn(id, { shape: 'round' })],
  ['keeping a measurement where it is', () => addMeasurement(0, 0, 100, 0), id => updateMeasurement(id, { x1: 0, y1: 0 })],
  ['dropping a guide at its own position', () => addGuide('vertical', 120), id => moveGuide(id, 120)],
  ['clearing an absent background image', () => '', () => setBackgroundImage(undefined)],
  ['deleting an id that is not on the floor', () => 'missing', id => removeElement(id)],
];

it.each(noops)('%s neither records an Undo step nor discards Redo', (_label, setup, act) => {
  const id = setup();
  const { before, history, walls: count } = pendingRedo();
  act(id);
  expect(state()).toBe(before);
  expect(entries()).toEqual(history);
  redo();
  expect(walls()).toBe(count + 1);
});

it('still records real edits and keeps coalescing across an interleaved no-op', () => {
  const id = addStair({ x: 0, y: 0 });
  updateStair(id, { riserCount: 15 });
  updateStair(id, { riserCount: 15 });
  updateStair(id, { riserCount: 16 });
  expect(entries()).toEqual(['Added stair', 'Edit']);
  expect(floor().stairs[0].riserCount).toBe(16);
  undo();
  expect(floor().stairs[0].riserCount).toBe(14);
});

it('drag frames that leave the geometry where it is do not touch the project', () => {
  const furniture = addFurniture('sofa', { x: 100, y: 100 });
  const stair = addStair({ x: 10, y: 20 }), column = addColumn({ x: 30, y: 40 });
  const entourage = addEntourageItem('tree', { x: 50, y: 60 }, 80), note = addTextAnnotation(70, 80, 'Note');
  const { before, history, walls: count } = pendingRedo();
  let notified = -1;
  const unsubscribe = currentProject.subscribe(() => notified++);
  beginUndoGroup();
  moveFurniture(furniture, { x: 100, y: 100 });
  transformFurnitureDuringDrag(furniture, { position: { x: 100, y: 100 }, rotation: 0, scale: { x: 1, y: 1, z: 1 } });
  moveStair(stair, { x: 10, y: 20 });
  moveColumn(column, { x: 30, y: 40 });
  moveEntourage(entourage, { x: 50, y: 60 });
  resizeEntourage(entourage, 80);
  moveWallEndpoint('a-0', 'start', { x: 0, y: 0 });
  moveWallGeometryDuringDrag('a-0', { start: { x: 0, y: 0 }, end: { x: 400, y: 0 } });
  moveWallParallel('a-0', 0, 0);
  moveTextAnnotation(note, { x: 70, y: 80 });
  endUndoGroup('Moved furniture');
  unsubscribe();
  expect(notified).toBe(0);
  expect(state()).toBe(before);
  expect(entries()).toEqual(history);
  redo();
  expect(walls()).toBe(count + 1);
});

it('a drag that returns to its start is not an Undo step although updatedAt moved on', () => {
  const id = addFurniture('sofa', { x: 100, y: 100 });
  const { before, history, walls: count } = pendingRedo();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.now() + 1000));
  beginUndoGroup();
  transformFurnitureDuringDrag(id, { position: { x: 130, y: 100 } });
  transformFurnitureDuringDrag(id, { position: { x: 100, y: 100 } });
  endUndoGroup('Moved furniture');
  expect(state()).not.toBe(before);
  expect(floor()).toEqual(JSON.parse(before).floors[0]);
  expect(entries()).toEqual(history);
  redo();
  expect(walls()).toBe(count + 1);
});
