// A smaller item dropped where a larger one stands rests on top of it.
import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { FurnitureItem, Project } from '$lib/models/types';
import { byElevation, restingElevation, settleStacks } from '$lib/utils/furnitureStacking';
import { findFurnitureAt } from '$lib/utils/hitTesting';
import {
  addFurniture, beginUndoGroup, currentProject, endUndoGroup, loadProject, removeElement,
  transformFurnitureDuringDrag, undo, updateFurniture,
} from '$lib/stores/project';
import { roomProject } from './fixtures/project';

const item = (id: string, catalogId: string, x = 100, y = 100, updates: Partial<FurnitureItem> = {}): FurnitureItem => ({
  id, catalogId, position: { x, y }, rotation: 0, scale: { x: 1, y: 1, z: 1 }, ...updates,
});
const withFurniture = (...furniture: FurnitureItem[]): Project => {
  const project = roomProject();
  project.floors[0].furniture = furniture;
  return project;
};
const furniture = () => get(currentProject)!.floors[0].furniture;
const elevationOf = (id: string) => furniture().find(i => i.id === id)!.elevation;
const drag = (id: string, x: number, y: number) => {
  beginUndoGroup();
  transformFurnitureDuringDrag(id, { position: { x, y } });
  endUndoGroup('Moved furniture');
};

it('rests the smaller item on the larger one whose footprint holds its centre', () => {
  const table = item('table', 'dining_table'); // 120 x 80, 75 high
  expect(restingElevation(item('lamp', 'table_lamp', 150, 130), [table])).toBe(75);
  expect(restingElevation(item('lamp', 'table_lamp', 170, 100), [table])).toBeNull(); // centre past the edge
  // The larger item is never lifted onto the smaller.
  expect(restingElevation(table, [item('lamp', 'table_lamp')])).toBeNull();
  // A rotated surface uses its rotated footprint.
  const turned = item('table', 'dining_table', 100, 100, { rotation: 90 });
  expect(restingElevation(item('lamp', 'table_lamp', 100, 150), [turned])).toBe(75);
  expect(restingElevation(item('lamp', 'table_lamp', 150, 100), [turned])).toBeNull();
});

it('rests on the highest surface under the centre and adds the surface’s own height', () => {
  const desk = item('desk', 'desk'); // 140 x 70, 75 high
  const raised = item('shelf', 'storage', 100, 100, { width: 60, depth: 40, height: 30, elevation: 75 });
  expect(restingElevation(item('lamp', 'table_lamp'), [desk, raised])).toBe(105);
});

it('keeps seating, beds and rugs on the floor and never stacks on them', () => {
  const table = item('table', 'dining_table');
  for (const id of ['dining_chair', 'office_chair', 'sofa', 'rug', 'round_rug']) {
    expect(settleStacks([table], [table, item('x', id)]).size, id).toBe(0);
  }
  const rug = item('rug', 'rug'), sofa = item('sofa', 'sofa');
  expect(restingElevation(item('table', 'coffee_table'), [rug])).toBeNull();
  expect(restingElevation(item('lamp', 'table_lamp'), [sofa])).toBeNull();
  expect(restingElevation(item('lamp', 'table_lamp'), [item('bed', 'bed_queen')])).toBeNull();
});

it('leaves wall and ceiling items and plan-only symbols alone', () => {
  const dresser = item('dresser', 'dresser');
  for (const id of ['wall_art', 'mirror', 'clock', 'ceiling_light', 'sym_outlet']) {
    expect(settleStacks([dresser], [dresser, item('x', id)]).size, id).toBe(0);
  }
});

it('lifts an added item onto the larger item already there', () => {
  loadProject(withFurniture(item('table', 'dining_table')));
  const lamp = addFurniture('table_lamp', { x: 110, y: 90 });
  expect(elevationOf(lamp)).toBe(75);
  undo();
  expect(furniture().map(i => i.id)).toEqual(['table']);
});

it('lifts the smaller item when the larger one is dropped over it', () => {
  loadProject(withFurniture(item('lamp', 'table_lamp', 500, 500), item('table', 'dining_table')));
  drag('table', 500, 500);
  expect(elevationOf('lamp')).toBe(75);
  undo(); // the move and the lift are one step
  expect(elevationOf('lamp')).toBeUndefined();
  expect(furniture().find(i => i.id === 'table')!.position).toEqual({ x: 100, y: 100 });
});

it('returns a resting item to the floor when it or its surface moves away or is deleted', () => {
  loadProject(withFurniture(item('table', 'dining_table'), item('lamp', 'table_lamp', 100, 100, { elevation: 75 })));
  drag('lamp', 600, 600);
  expect(elevationOf('lamp')).toBeUndefined();
  undo();
  drag('table', 600, 600);
  expect(elevationOf('lamp')).toBeUndefined();
  undo();
  removeElement('table');
  expect(elevationOf('lamp')).toBeUndefined();
});

it('keeps a resting item on its surface when the surface changes height', () => {
  loadProject(withFurniture(item('table', 'dining_table'), item('lamp', 'table_lamp', 100, 100, { elevation: 75 }),
    item('plant', 'potted_plant', 1000, 1000)));
  updateFurniture('table', { height: 90 });
  expect(elevationOf('lamp')).toBe(90);
  // A stack follows its base: a box on the table, a clock-sized item on the box.
  loadProject(withFurniture(item('table', 'dining_table'), item('box', 'imported_object', 100, 100, { elevation: 75 }),
    item('lamp', 'table_lamp', 100, 100, { elevation: 125 })));
  updateFurniture('table', { height: 80 });
  expect([elevationOf('box'), elevationOf('lamp')]).toEqual([80, 130]);
});

it('keeps a height the user typed', () => {
  loadProject(withFurniture(item('table', 'dining_table'), item('tv', 'television', 600, 600, { elevation: 150 })));
  drag('tv', 100, 100);
  expect(elevationOf('tv')).toBe(150); // wall-mounted over a console table: stays mounted
  drag('tv', 700, 700);
  expect(elevationOf('tv')).toBe(150);
  // Setting the height is itself respected, even over a surface.
  loadProject(withFurniture(item('table', 'dining_table'), item('lamp', 'table_lamp', 100, 100, { elevation: 75 })));
  updateFurniture('lamp', { elevation: undefined });
  expect(elevationOf('lamp')).toBeUndefined();
});

it('does not touch items an edit did not reach', () => {
  // Saved before stacking existed: a lamp at 0 inside a table's footprint.
  loadProject(withFurniture(item('table', 'dining_table'), item('lamp', 'table_lamp'), item('plant', 'potted_plant', 900, 900)));
  drag('plant', 950, 950);
  expect(elevationOf('lamp')).toBeUndefined();
  drag('lamp', 101, 101);
  expect(elevationOf('lamp')).toBe(75);
});

it('draws and picks raised items above what they rest on', () => {
  const lamp = item('lamp', 'table_lamp', 100, 100, { elevation: 75 }), table = item('table', 'dining_table');
  expect(byElevation([lamp, table]).map(i => i.id)).toEqual(['table', 'lamp']);
  expect(findFurnitureAt({ x: 100, y: 100 }, [lamp, table])?.id).toBe('lamp');
});
