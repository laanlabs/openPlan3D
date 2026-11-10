import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { projectPackageBytes } from '$lib/services/projectPackage';
import { projectToPreparedRoomPlan } from '$lib/utils/interchange';
import { readProject } from '$lib/utils/projectValidation';
import { detectRooms } from '$lib/utils/roomDetection';
import { mergeRoomPlanFloors } from '$lib/utils/roomplanMerge';
import { createProjectFromRoomPlan, importRoomPlan, importRoomPlanFloors, validateRoomPlan, DEFAULT_ROOMPLAN_OPTIONS, type RoomPlanImportOptions } from '$lib/utils/roomplanImport';
import { roomProject } from './fixtures/project';

// Bodies the iPhone exporter (openplan3d-ios 09eaa13) builds once its editor has collapsed a wall,
// pretty-printed. The server refused both with 422 until October 2026:
// - collapsed-wall: the starter room after the north wall's end handle is dragged next to its start.
//   The wall exports 0 long and still carries its 1.2 m window; the welded east wall follows into a diagonal.
// - collapsed-jog: dragging the corner beside a 3 cm scan jog welds both of the jog's ends together.
const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const starter = load('handoff-collapsed-wall.json');
const jog = load('handoff-collapsed-jog.json');
const collapsed = (data: any): string => data.walls.find((wall: any) => wall.dimensions[0] === 0).identifier;
const others = (data: any): string[] => data.walls.map((wall: any) => wall.identifier).filter((id: string) => id !== collapsed(data));
// The geometry choices offered by the iPhone share sheet and the Build tab's import dialog.
const straightening: RoomPlanImportOptions[] = [DEFAULT_ROOMPLAN_OPTIONS,
  { straighten: true, orthogonal: false, mergeDistance: 15 }, { straighten: false, orthogonal: true, mergeDistance: 15 }];

it('accepts a wall the iPhone editor collapsed and leaves it out, still enclosing the room', () => {
  for (const data of [starter, jog]) {
    expect(() => validateRoomPlan(data)).not.toThrow();
    const floor = importRoomPlan(data);
    expect(floor.walls.map(wall => wall.id)).toEqual(others(data));
    expect(detectRooms(floor.walls)).toHaveLength(1);
  }
});

it('leaves collapsed walls out whatever geometry choices the import makes', () => {
  for (const options of straightening) {
    for (const data of [starter, jog]) {
      const ids = importRoomPlan(data, options).walls.map(wall => wall.id);
      expect(ids).not.toContain(collapsed(data));
      expect(ids.length).toBeGreaterThanOrEqual(3);
    }
  }
});

it('drops the openings on a collapsed wall instead of moving them, whatever the geometry choices', () => {
  expect(starter.windows[0].parentIdentifier).toBe(collapsed(starter));
  // Straightening removes a zero-length wall on its own too, but would move its window onto the west wall.
  for (const options of [undefined, ...straightening]) {
    const floor = importRoomPlan(starter, options);
    expect(floor.windows).toEqual([]);
    expect(floor.doors.map(door => door.id)).toEqual([starter.doors[0].identifier]);
  }
  expect(importRoomPlan({ ...starter, openplanImportOptions: { straighten: true, orthogonal: true } }).windows).toEqual([]);
});

it('imports an upper floor whose only wall collapsed as an empty floor, keeping the others', () => {
  // Each floor is validated and imported on its own, so a floor of collapsed walls must not refuse the plan.
  const data = structuredClone(starter);
  const north = data.walls.find((wall: any) => wall.identifier === collapsed(data));
  north.story = 1;
  data.windows[0].story = 1;
  data.stories.push({ index: 1, name: 'Loft' });
  const floors = createProjectFromRoomPlan(data, 'Two floors').floors;
  expect(floors.map(floor => [floor.level, floor.walls.length, floor.windows.length])).toEqual([[0, 3, 0], [1, 0, 0]]);
});

it('opens, packages and re-exports the imported plan', () => {
  for (const data of [starter, jog]) {
    const project = createProjectFromRoomPlan(data, 'Collapsed wall');
    expect(() => readProject(project)).not.toThrow();
    expect(() => projectPackageBytes(project)).not.toThrow();
    const exported = projectToPreparedRoomPlan(project) as any;
    expect(() => validateRoomPlan(exported)).not.toThrow();
    expect(exported.walls).toHaveLength(others(data).length);
  }
});

it('adds such a plan to an open project without the collapsed wall', () => {
  const base = roomProject();
  const before = base.floors[0].walls.length;
  const { project } = mergeRoomPlanFloors(base, importRoomPlanFloors(starter));
  expect(project.floors[0].walls).toHaveLength(before + 3);
  expect(() => projectPackageBytes(project)).not.toThrow();
});

it('keeps a wall of any real length with its openings, dropping only length 0 and rounding', () => {
  // The iPhone and OpenKitchen3D write raw lengths, and their length fields can leave a real sliver of a few mm.
  const data = structuredClone(starter);
  const north = data.walls.find((wall: any) => wall.identifier === collapsed(starter));
  for (const [length, kept] of [[0.003, true], [1e-6, true], [5e-7, false], [1e-12, false], [0, false]] as const) {
    north.dimensions[0] = length;
    const floor = importRoomPlan(data);
    expect(floor.walls.some(wall => wall.id === north.identifier)).toBe(kept);
    expect(floor.windows.map(window => window.wallId)).toEqual(kept ? [north.identifier] : []);
  }
});

it('names the size that is wrong', () => {
  const sized = (key: string, dimensions: unknown[]) => {
    const data = structuredClone(starter);
    (key === 'walls' ? data.walls[1] : data.doors[0]).dimensions = dimensions;
    return () => validateRoomPlan(data);
  };
  const reason = (path: string, text: string) => `Invalid RoomPlan file: ${path}.dimensions ${text}. No project was imported.`;
  expect(sized('walls', [-0.01, 2.4, 0.12])).toThrow(reason('walls[1]', 'must have a nonnegative length'));
  expect(sized('walls', [4, 0, 0.12])).toThrow(reason('walls[1]', 'must have a positive height'));
  expect(sized('walls', [4, 2.4, -0.1])).toThrow(reason('walls[1]', 'must have a nonnegative depth'));
  expect(sized('walls', [4])).toThrow(reason('walls[1]', 'must list a finite width and height, and optionally depth, in metres'));
  expect(sized('doors', [0, 2, 0.12])).toThrow(reason('doors[0]', 'must have a positive width'));
});
