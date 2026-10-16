import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { get } from 'svelte/store';
import type { Floor } from '$lib/models/types';
import { floorContentBounds, mergeInterchangeState, mergeRoomPlanFloors, offsetFloor, placeFloorBeside, selectableContentIds, uniqueFloorIds } from '$lib/utils/roomplanMerge';
import { importRoomPlanFloors, interchangeStateFromRoomPlan } from '$lib/utils/roomplanImport';
import { resolveRoomGeometry } from '$lib/utils/roomDetection';
import { addRoomPlanFloorsToProject, createDefaultFloor, currentProject, importFloorIntoCurrentProject, loadProject, placingStair, redo, selectImportedElements, selectedElementId, selectedElementIds, selectedRoomId, selectedTool, undo, undoHistoryStore } from '$lib/stores/project';
import { rectangleWalls, roomProject } from './fixtures/project';

// Issue #103: rooms scanned one at a time are joined in one plan afterwards.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/handoff-roomplan.json', import.meta.url), 'utf8'));
/** Entry (level 0: 4 walls, 4 doors, 2 windows, a chair, "QA Kitchen"), Loft (level 2: 1 wall), Future Floor (level 3: empty). */
const scan = () => importRoomPlanFloors(structuredClone(fixture));
const ids = (items: { id: string }[]) => items.map(item => item.id);
const contentCount = (floors: Floor[]) =>
  floors.reduce((n, f) => n + f.walls.length + f.rooms.length + f.doors.length + f.windows.length + f.furniture.length, 0);
/** A scanned floor's ids in the order the merge appends them. */
const arrived = (floor: Floor) => [...ids(floor.walls), ...ids(floor.rooms), ...ids(floor.doors), ...ids(floor.windows), ...ids(floor.furniture)];

/** One of everything that has a position, plus a guide and a room label offset that must not move. */
function furnishedFloor(): Floor {
  const floor = createDefaultFloor(0);
  floor.walls = [{ id: 'w', start: { x: 0, y: 0 }, end: { x: 200, y: 0 }, curvePoint: { x: 100, y: 50 }, thickness: 10, height: 250, color: '#eee' }];
  floor.furniture = [{ id: 'f', catalogId: 'chair', position: { x: 300, y: 100 }, rotation: 0, scale: { x: 1, y: 1, z: 1 }, width: 60, depth: 40 }];
  floor.stairs = [{ id: 's', position: { x: 500, y: 100 }, rotation: 0, width: 100, depth: 300, riserCount: 14, direction: 'up', stairType: 'straight' }];
  floor.columns = [{ id: 'c', position: { x: 700, y: 100 }, rotation: 0, shape: 'round', diameter: 30, height: 280, color: '#ccc' }];
  floor.textAnnotations = [{ id: 't', x: 50, y: 400, text: 'Note', fontSize: 16, color: '#000', rotation: 0 }];
  floor.measurements = [{ id: 'm', x1: 0, y1: 500, x2: 100, y2: 500 }];
  floor.annotations = [{ id: 'a', x1: 0, y1: 600, x2: 100, y2: 600, offset: 40 }];
  floor.guides = [{ id: 'g', orientation: 'vertical', position: 123 }];
  floor.rooms = [{ id: 'r', name: 'Hall', walls: ['w'], floorTexture: 'hardwood', area: 0, labelOffset: { x: 5, y: 6 } }];
  return floor;
}

describe('floorContentBounds', () => {
  it('spans wall thickness and placed objects, ignoring guides', () => {
    expect(floorContentBounds(createDefaultFloor())).toBeNull();
    const guidesOnly = createDefaultFloor();
    guidesOnly.guides = [{ id: 'g', orientation: 'horizontal', position: 50 }];
    expect(floorContentBounds(guidesOnly)).toBeNull();
    // 400×300 rectangle of 15 cm walls
    expect(floorContentBounds(roomProject().floors[0])).toEqual({ minX: -7.5, minY: -7.5, maxX: 407.5, maxY: 307.5 });
    const bounds = floorContentBounds(furnishedFloor())!;
    expect(bounds.minX).toBe(-5);            // wall start less half its thickness
    expect(bounds.minY).toBe(-50);           // top of the 300 cm stair run
    expect(bounds.maxX).toBeCloseTo(715.5);  // column radius plus its outline
    expect(bounds.maxY).toBe(600);           // dimension endpoints
  });
});

describe('offsetFloor', () => {
  it('moves every positioned element, keeps guides and label offsets, and leaves the input alone', () => {
    const source = furnishedFloor(), before = JSON.stringify(source);
    const moved = offsetFloor(source, 10, -5);
    expect(JSON.stringify(source)).toBe(before);
    expect(moved.walls[0]).toMatchObject({ start: { x: 10, y: -5 }, end: { x: 210, y: -5 }, curvePoint: { x: 110, y: 45 } });
    expect(moved.furniture[0].position).toEqual({ x: 310, y: 95 });
    expect(moved.stairs[0].position).toEqual({ x: 510, y: 95 });
    expect(moved.columns[0].position).toEqual({ x: 710, y: 95 });
    expect(moved.textAnnotations[0]).toMatchObject({ x: 60, y: 395 });
    expect(moved.measurements[0]).toMatchObject({ x1: 10, y1: 495, x2: 110, y2: 495 });
    expect(moved.annotations[0]).toMatchObject({ x1: 10, y1: 595, x2: 110, y2: 595, offset: 40 });
    expect(moved.guides).toEqual(source.guides);
    expect(moved.rooms[0].labelOffset).toEqual({ x: 5, y: 6 });
  });
});

describe('placeFloorBeside', () => {
  it('lands the scan one gap right of the existing content with top edges aligned', () => {
    const existing = roomProject().floors[0];
    const imported = createDefaultFloor(0);
    // Same rectangle a long way off, 50 cm lower: x 992.5..1407.5, y 42.5..357.5
    imported.walls = rectangleWalls('b', 1000).map(w => ({ ...w, start: { x: w.start.x, y: w.start.y + 50 }, end: { x: w.end.x, y: w.end.y + 50 } }));
    const placed = placeFloorBeside(imported, existing);
    expect(floorContentBounds(placed)).toEqual({ minX: 507.5, minY: -7.5, maxX: 922.5, maxY: 307.5 });
    expect(placed.walls[0].start).toEqual({ x: 515, y: 0 });
    expect(floorContentBounds(placeFloorBeside(imported, existing, 50))!.minX).toBe(457.5);
    expect(placeFloorBeside(imported, createDefaultFloor())).toBe(imported);
    expect(placeFloorBeside(createDefaultFloor(), existing).walls).toEqual([]);
  });
});

describe('uniqueFloorIds', () => {
  it('re-issues only ids the project already uses and rewrites every reference to them', () => {
    const project = roomProject(); // walls a-0..a-3
    const imported = createDefaultFloor(0);
    imported.walls = [rectangleWalls('a')[0], rectangleWalls('z')[1]]; // a-0 collides, z-1 is free
    imported.doors = [{ id: 'd', wallId: 'a-0', position: 0.5, width: 90, height: 210, type: 'single', swingDirection: 'left', flipSide: false }];
    imported.windows = [{ id: 'a-2', wallId: 'z-1', position: 0.5, width: 120, height: 120, sillHeight: 90, type: 'standard' }];
    imported.rooms = [{ id: 'r', name: 'Scan', walls: ['a-0', 'z-1'], floorTexture: 'hardwood', area: 12 }];
    imported.groups = [{ id: 'g', elementIds: ['a-0', 'z-1', 'd'] }];
    const before = JSON.stringify(imported);
    const unique = uniqueFloorIds(imported, project);
    expect(JSON.stringify(imported)).toBe(before);
    const [wall, free] = unique.walls;
    expect(wall.id).not.toBe('a-0');
    expect(ids(project.floors[0].walls)).not.toContain(wall.id);
    expect(free.id).toBe('z-1');
    expect(unique.doors[0]).toMatchObject({ id: 'd', wallId: wall.id });
    expect(unique.windows[0].id).not.toBe('a-2');
    expect(unique.windows[0].wallId).toBe('z-1');
    expect(unique.rooms[0]).toMatchObject({ id: 'r', walls: [wall.id, 'z-1'] });
    expect(unique.groups[0].elementIds).toEqual([wall.id, 'z-1', 'd']);
    const all = [...ids(unique.walls), ...ids(unique.doors), ...ids(unique.windows), ...ids(unique.rooms), ...ids(unique.groups)];
    expect(new Set([...all, ...ids(project.floors[0].walls)]).size).toBe(all.length + 4);
  });
});

describe('mergeRoomPlanFloors', () => {
  it('stitches each storey onto the floor with its level and creates the missing ones', () => {
    const project = roomProject(), before = JSON.stringify(project);
    const floors = scan();
    const { project: merged, placed, added } = mergeRoomPlanFloors(project, floors);
    expect(JSON.stringify(project)).toBe(before);
    expect(placed).toBe(contentCount(floors));
    expect(merged.activeFloorId).toBe(project.activeFloorId);
    expect(merged.floors.map(f => [f.level, f.name])).toEqual([[0, 'Ground Floor'], [2, 'Loft'], [3, 'Future Floor']]);
    expect(new Set(ids(merged.floors)).size).toBe(3);
    // What arrived on each floor, in storey order; the empty storey still names its new floor.
    expect(added).toEqual([
      { floorId: merged.floors[0].id, ids: arrived(floors[0]) },
      { floorId: merged.floors[1].id, ids: arrived(floors[1]) },
      { floorId: merged.floors[2].id, ids: [] },
    ]);
    expect(added.flatMap(entry => entry.ids)).toHaveLength(placed);
    const ground = merged.floors[0];
    // Capture identifiers are kept when nothing in the plan uses them.
    expect(ids(ground.walls)).toEqual([...ids(project.floors[0].walls), ...ids(floors[0].walls)]);
    expect(ground.doors).toHaveLength(4);
    expect(ground.windows).toHaveLength(2);
    expect(ground.furniture).toHaveLength(1);
    expect(ground.rooms).toEqual([expect.objectContaining({ name: 'QA Kitchen', color: '#aaccdd', walls: ids(floors[0].walls) })]);
    // The scan sits one metre right of the 400×300 rectangle, its top edge on the rectangle's.
    const [first] = ground.walls.slice(4);
    expect(first.start.x).toBeCloseTo(407.5 + 100 + 27.5 / 2, 6);
    expect(first.start.y).toBeCloseTo(-7.5 + 27.5 / 2, 6);
    expect(ground.furniture[0].position.x).toBeCloseTo(230 + 521.25, 6);
    expect(ground.furniture[0].position.y).toBeCloseTo(170 + 6.25, 6);
    expect(ground.doors.map(d => d.position)).toEqual(floors[0].doors.map(d => d.position));
    const resolved = resolveRoomGeometry(ground).map(entry => entry.room.name);
    expect(resolved).toHaveLength(2);
    expect(resolved).toContain('QA Kitchen');
    expect(merged.floors[1].walls).toEqual(floors[1].walls);
    expect(merged.floors[2]).toMatchObject({ walls: [], rooms: [], doors: [], windows: [], furniture: [], stairs: [], columns: [], guides: [], groups: [] });
  });

  it('re-issues ids when the same scan is added twice, keeping both rooms named', () => {
    const first = mergeRoomPlanFloors(roomProject(), scan()), second = mergeRoomPlanFloors(first.project, scan());
    const ground = second.project.floors[0];
    const wallIds = ids(ground.walls);
    const all = [...wallIds, ...ids(ground.doors), ...ids(ground.windows), ...ids(ground.furniture), ...ids(ground.rooms)];
    expect(ground.walls).toHaveLength(12);
    expect(new Set(all).size).toBe(all.length);
    for (const opening of [...ground.doors, ...ground.windows]) expect(wallIds).toContain(opening.wallId);
    expect(ground.rooms.map(r => r.name)).toEqual(['QA Kitchen', 'QA Kitchen']);
    expect(ground.rooms[1].walls).not.toEqual(ground.rooms[0].walls);
    for (const room of ground.rooms) for (const id of room.walls) expect(wallIds).toContain(id);
    expect(resolveRoomGeometry(ground).filter(entry => entry.room.name === 'QA Kitchen')).toHaveLength(2);
    // The second scan's walls land beyond the first scan's.
    const wallsOnly = (walls: Floor['walls']) => floorContentBounds({ ...createDefaultFloor(), walls })!;
    expect(wallsOnly(ground.walls.slice(8)).minX).toBeGreaterThan(wallsOnly(ground.walls.slice(4, 8)).maxX);
    // The second merge reports the re-issued ids: all on the floor, none shared with the first scan, selectable ones in floor order.
    const [again] = second.added;
    expect(again.floorId).toBe(ground.id);
    expect(again.ids).toHaveLength(first.added[0].ids.length);
    expect(again.ids.filter(id => !all.includes(id))).toEqual([]);
    expect(again.ids.filter(id => first.added[0].ids.includes(id))).toEqual([]);
    expect(selectableContentIds(ground, again.ids)).toEqual([...wallIds.slice(8), ...ids(ground.doors.slice(4)), ...ids(ground.windows.slice(2)), ...ids(ground.furniture.slice(1))]);
  });
});

describe('selectableContentIds', () => {
  it('keeps the ids the canvas can select, in floor order, and drops rooms, groups, guides and unknown ids', () => {
    const floor = furnishedFloor();
    floor.doors = [{ id: 'd', wallId: 'w', position: 0.5, width: 90, height: 210, type: 'single', swingDirection: 'left', flipSide: false }];
    floor.groups = [{ id: 'grp', elementIds: ['w', 'f'] }];
    floor.entourage = [{ id: 'e', defId: 'person', position: { x: 0, y: 0 }, width: 50, rotation: 0 }];
    expect(selectableContentIds(floor, ['grp', 'r', 'g', 'e', 'a', 'm', 't', 'c', 's', 'f', 'd', 'w', 'missing'])).toEqual(['w', 'd', 'f', 's', 'c', 'e', 't', 'm', 'a']);
    expect(selectableContentIds(floor, ['r', 'g', 'grp'])).toEqual([]);
    expect(selectableContentIds(createDefaultFloor(), ['w'])).toEqual([]);
  });
});

describe('project store', () => {
  beforeEach(() => loadProject(roomProject()));
  const state = () => JSON.stringify(get(currentProject));

  it('adds a scan to the open plan as a single undo step', () => {
    const before = state();
    const floors = scan();
    const result = addRoomPlanFloorsToProject(floors);
    expect(result.placed).toBe(contentCount(floors));
    const after = state();
    const project = get(currentProject)!;
    expect(result.added.map(entry => entry.floorId)).toEqual(ids(project.floors));
    expect(result.added.map(entry => entry.ids)).toEqual([arrived(floors[0]), arrived(floors[1]), []]);
    expect(project.floors).toHaveLength(3);
    expect(project.activeFloorId).toBe(project.floors[0].id);
    expect(project.floors[0].walls).toHaveLength(8);
    expect(project.floors[0].rooms.map(r => r.name)).toEqual(['QA Kitchen']);
    expect(get(undoHistoryStore).entries.map(entry => entry.description)).toEqual(['Added RoomPlan scan']);
    undo();
    expect(state()).toBe(before);
    expect(get(currentProject)!.floors).toHaveLength(1);
    expect(get(currentProject)!.floors[0].walls).toHaveLength(4);
    redo();
    expect(state()).toBe(after);
    expect(get(undoHistoryStore).entries).toHaveLength(1);
  });

  it('imports one floor onto the active floor whatever level it was scanned as', () => {
    const loft = scan()[1];
    expect(importFloorIntoCurrentProject(loft)).toEqual({ placed: 1, added: [{ floorId: get(currentProject)!.floors[0].id, ids: [loft.walls[0].id] }] });
    const project = get(currentProject)!;
    expect(project.floors).toHaveLength(1);
    expect(ids(project.floors[0].walls)).toEqual([...ids(roomProject().floors[0].walls), loft.walls[0].id]);
    expect(project.floors[0].walls[4].start.x).toBeCloseTo(407.5 + 100 + 18.5 / 2, 6);
    expect(get(undoHistoryStore).entries.map(entry => entry.description)).toEqual(['Imported floor']);
    undo();
    expect(get(currentProject)!.floors[0].walls).toHaveLength(4);
  });

  it('does nothing without an open project', () => {
    currentProject.set(null);
    expect(addRoomPlanFloorsToProject(scan())).toEqual({ placed: 0, added: [] });
    expect(importFloorIntoCurrentProject(scan()[0])).toEqual({ placed: 0, added: [] });
    expect(get(currentProject)).toBeNull();
  });
});

describe('sibling data on merge', () => {
  const kitchen = () => JSON.parse(readFileSync(new URL('./fixtures/siblings/ios-sample-kitchen.openplan3d.json', import.meta.url), 'utf8'));

  it('adopts the file\'s block, attributes, defaults and notes when the plan has none, following re-issued ids', () => {
    const file = kitchen(), floors = importRoomPlanFloors(file), state = interchangeStateFromRoomPlan(file)!;
    const [clashing] = Object.keys(state.attributes!);
    const project = roomProject();
    project.floors[0].furniture = [{ id: clashing, catalogId: 'sofa', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1, z: 1 } }];
    const merged = mergeRoomPlanFloors(project, floors, 100, state);
    const { interchange } = merged.project;
    expect(interchange!.blocks).toEqual(state.blocks);
    expect(interchange!.defaults).toEqual(state.defaults);
    expect(interchange!.planNotes).toBe(state.planNotes);
    const imported = new Set(floors.flatMap(f => f.furniture.map(i => i.id)));
    const reissued = merged.project.floors[0].furniture.find(i => i.id !== clashing && !imported.has(i.id))!;
    expect(reissued).toBeDefined();
    expect(interchange!.attributes![reissued.id]).toEqual(state.attributes![clashing]);
    expect(interchange!.attributes).not.toHaveProperty(clashing); // the plan's own sofa has no sibling attributes
    expect(Object.keys(interchange!.attributes!)).toHaveLength(Object.keys(state.attributes!).length);
    expect(project.interchange).toBeUndefined(); // pure
  });

  it('keeps the plan\'s own block, defaults and notes for the same planner and still merges attributes', () => {
    const existing = { version: 1 as const, blocks: { openkitchen3d: { name: 'Mine' } }, attributes: { a: { sku: 'A' } }, defaults: { ceilingHeight: 3 }, planNotes: 'Mine' };
    const incoming = { version: 1 as const, blocks: { openkitchen3d: { name: 'Theirs' }, opencatio3d: { name: 'Cat' } }, attributes: { b: { sku: 'B' } }, defaults: { ceilingHeight: 2.4 }, planNotes: 'Theirs' };
    const merged = mergeInterchangeState(existing, incoming, id => (id === 'b' ? 'b2' : id));
    expect(merged).toEqual({ version: 1, blocks: { openkitchen3d: { name: 'Mine' }, opencatio3d: { name: 'Cat' } }, attributes: { a: { sku: 'A' }, b2: { sku: 'B' } }, defaults: { ceilingHeight: 3 }, planNotes: 'Mine' });
    expect(mergeInterchangeState(undefined, { version: 1, blocks: {} }, id => id)).toEqual({ version: 1, blocks: {} });
  });

  it('travels with the scan through the store and goes away with one undo', () => {
    loadProject(roomProject());
    const file = kitchen();
    addRoomPlanFloorsToProject(importRoomPlanFloors(file), undefined, interchangeStateFromRoomPlan(file));
    expect(get(currentProject)!.interchange!.blocks.openkitchen3d).toEqual(file.openkitchen3d);
    undo();
    expect(get(currentProject)!.interchange).toBeUndefined();
    redo();
    expect(get(currentProject)!.interchange!.blocks.openkitchen3d).toEqual(file.openkitchen3d);
  });
});

describe('selectImportedElements', () => {
  beforeEach(() => loadProject(roomProject()));

  it('selects the ids on the active floor and resets the tool, placing modes and room selection', () => {
    selectedTool.set('wall'); placingStair.set(true); selectedRoomId.set('room'); selectedElementId.set('a-0');
    const floorId = get(currentProject)!.activeFloorId;
    selectImportedElements(floorId, ['a-1', 'a-2']);
    expect(get(selectedTool)).toBe('select'); expect(get(placingStair)).toBe(false); expect(get(selectedRoomId)).toBeNull();
    expect([...get(selectedElementIds)]).toEqual(['a-1', 'a-2']); expect(get(selectedElementId)).toBeNull();
    selectImportedElements(floorId, ['a-3']);
    expect(get(selectedElementId)).toBe('a-3'); expect(get(selectedElementIds).size).toBe(0);
  });

  it('switches to the floor the scan landed on and ignores unknown floors', () => {
    const result = addRoomPlanFloorsToProject(scan());
    const loft = result.added[1];
    selectedTool.set('wall');
    selectImportedElements(loft.floorId, loft.ids);
    expect(get(currentProject)!.activeFloorId).toBe(loft.floorId);
    expect(get(selectedTool)).toBe('select');
    expect(get(selectedElementId)).toBe(loft.ids[0]);
    selectImportedElements('no-such-floor', ['x']);
    expect(get(currentProject)!.activeFloorId).toBe(loft.floorId);
    expect(get(selectedElementId)).toBe(loft.ids[0]);
  });
});
