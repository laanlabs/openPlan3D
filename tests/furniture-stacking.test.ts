// A smaller item dropped where a larger one stands rests on top of it.
import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { FurnitureItem, Project } from '$lib/models/types';
import { byElevation, restingElevation, settleStacks, typedFurnitureElevation } from '$lib/utils/furnitureStacking';
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

it('keeps fixtures and appliances on the floor inside a counter run or a scanned cabinet', () => {
  const counter = item('counter', 'counter', 100, 100, { width: 240 }); // 240 x 60, 85 high
  const cabinet = item('cabinet', 'storage', 100, 100, { width: 200, depth: 60, height: 90 });
  for (const base of [counter, cabinet]) {
    for (const id of ['sink_k', 'sink_b', 'stove', 'oven', 'dishwasher', 'fridge', 'washer_dryer', 'toilet', 'counter', 'storage']) {
      expect(settleStacks([base], [base, item('x', id, 110, 100, { width: 60, depth: 45 })]).size, `${id} on ${base.catalogId}`).toBe(0);
    }
    // Loose things still stand on them.
    expect(settleStacks([base], [base, item('plant', 'potted_plant')]).get('plant')).toBe(base.catalogId === 'counter' ? 85 : 90);
  }
  // Nudging a sink that was saved inside its counter leaves it there.
  loadProject(withFurniture(counter, item('sink', 'sink_k')));
  drag('sink', 110, 100);
  expect(elevationOf('sink')).toBeUndefined();
});

it('stands everything on a deck at the deck’s height, chairs and rugs included', () => {
  const deck = item('deck', 'deck_patio', 300, 300); // 400 x 300, 15 high
  for (const id of ['patio_table', 'patio_chair', 'lounger', 'sofa', 'rug', 'bbq_grill', 'sink_k']) {
    expect(settleStacks([deck], [deck, item('x', id, 300, 300)]).get('x'), id).toBe(15);
  }
  // Trees, lawns and pools keep to the ground, and a deck is never lifted itself.
  for (const id of ['tree_oak', 'lawn_square', 'hot_tub']) expect(settleStacks([deck], [deck, item('x', id, 300, 300)]).size, id).toBe(0);
  expect(restingElevation(item('small', 'deck_patio', 300, 300, { width: 100, depth: 100 }), [deck])).toBeNull();

  // A chair under a table on the deck stands on the deck; the lamp on the table adds the table's height.
  loadProject(withFurniture(deck));
  const table = addFurniture('patio_table', { x: 300, y: 300 });
  const chair = addFurniture('patio_chair', { x: 320, y: 300 });
  const lamp = addFurniture('table_lamp', { x: 300, y: 300 });
  expect([table, chair, lamp].map(elevationOf)).toEqual([15, 15, 90]);
  // Raising the deck carries all three.
  updateFurniture('deck', { height: 30 });
  expect([table, chair, lamp].map(elevationOf)).toEqual([30, 30, 105]);
  // Off the deck they are back on the ground.
  drag(chair, 900, 900);
  expect(elevationOf(chair)).toBeUndefined();
});

it('keeps an item on the floor once 0 is typed for it under a surface', () => {
  loadProject(withFurniture(item('table', 'dining_table'), item('lamp', 'table_lamp', 100, 100, { elevation: 75 }),
    item('art', 'wall_art', 100, 100)));
  const typed = (id: string, value: number) => typedFurnitureElevation(furniture().find(i => i.id === id)!, value, furniture());
  // Typing 0 for the resting lamp is kept as a number, so the next edits don't lift it again.
  expect(typed('lamp', 0)).toBe(0);
  updateFurniture('lamp', { elevation: typed('lamp', 0) });
  drag('lamp', 105, 100);
  expect(elevationOf('lamp')).toBe(0);
  drag('table', 110, 100);
  expect(elevationOf('lamp')).toBe(0);
  // Elsewhere a typed default is still stored as no height, as before.
  expect(typed('table', 0)).toBeUndefined();
  expect(typed('art', 120)).toBeUndefined(); // wall art's own default
  expect(typed('lamp', 40)).toBe(40);
});
