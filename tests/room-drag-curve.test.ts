import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import { beginUndoGroup, createDefaultProject, currentProject, endUndoGroup, loadProject, moveWallGeometryDuringDrag, undo, undoHistoryStore } from '$lib/stores/project';
import { resolveRoomGeometry } from '$lib/utils/roomDetection';
import { translatedWallGeometry, wallGeometryOf } from '$lib/utils/wallTranslation';
import { rectangleWalls } from './fixtures/project';

/** The regression plan with its top wall bowed outward into a bay. */
function bayProject() {
  const project = createDefaultProject('Bay');
  project.floors[0].walls = rectangleWalls();
  project.floors[0].walls[0].curvePoint = { x: 200, y: -150 };
  return project;
}

it('translates a wall rigidly: a curved wall keeps its control point beside its endpoints', () => {
  const [bay, straight] = bayProject().floors[0].walls;
  expect(wallGeometryOf(bay)).toEqual({ start: { x: 0, y: 0 }, end: { x: 400, y: 0 }, curvePoint: { x: 200, y: -150 } });
  expect(wallGeometryOf(bay).curvePoint).not.toBe(bay.curvePoint);
  expect(translatedWallGeometry(bay, 100, 50)).toEqual({ start: { x: 100, y: 50 }, end: { x: 500, y: 50 }, curvePoint: { x: 300, y: -100 } });
  expect(translatedWallGeometry(straight, -10, 0)).toEqual({ start: { x: 390, y: 0 }, end: { x: 390, y: 300 }, curvePoint: undefined });
});

it('a room drag moves a bay window wall without changing its shape or area, as one history entry', () => {
  loadProject(bayProject());
  const floor = () => get(currentProject)!.floors[0];
  const [{ room }] = resolveRoomGeometry(floor());
  expect(room.walls).toContain('a-0');
  const before = structuredClone(floor().walls);
  // The canvas keeps every boundary wall's press-time geometry and replays each frame from it.
  const origins = new Map(room.walls.map(id => [id, wallGeometryOf(floor().walls.find(w => w.id === id)!)]));
  beginUndoGroup();
  for (const [dx, dy] of [[40, 20], [100, 50]]) for (const [id, origin] of origins) moveWallGeometryDuringDrag(id, translatedWallGeometry(origin, dx, dy));
  endUndoGroup('Moved plan geometry');
  expect(floor().walls[0]).toEqual({ ...before[0], start: { x: 100, y: 50 }, end: { x: 500, y: 50 }, curvePoint: { x: 300, y: -100 } });
  expect(floor().walls.slice(1)).toEqual(before.slice(1).map(w => ({ ...w, start: { x: w.start.x + 100, y: w.start.y + 50 }, end: { x: w.end.x + 100, y: w.end.y + 50 } })));
  const [{ room: moved }] = resolveRoomGeometry(floor());
  expect(moved.area).toBeCloseTo(room.area);
  expect(get(undoHistoryStore).entries.map(entry => entry.description)).toEqual(['Moved plan geometry']);
  undo();
  expect(floor().walls).toEqual(before);
});
