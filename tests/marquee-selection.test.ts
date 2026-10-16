import { expect, it } from 'vitest';
import type { Door, Floor } from '$lib/models/types';
import { createDefaultProject } from '$lib/stores/project';
import { findDoorAt, findWindowAt } from '$lib/utils/hitTesting';
import { marqueeSelectionIds } from '$lib/utils/marqueeSelection';
import { rectangleWalls } from './fixtures/project';
import curvedOpenings from './fixtures/curved-openings.openplan.json';

const all = { measurements: true, annotations: true, textAnnotations: true };
const rect = (x1: number, y1: number, x2: number, y2: number) => ({ minX: Math.min(x1, x2), maxX: Math.max(x1, x2), minY: Math.min(y1, y2), maxY: Math.max(y1, y2) });
const door = (id: string, wallId: string, position: number): Door => ({ id, wallId, position, width: 90, height: 210, type: 'single', swingDirection: 'left', flipSide: false });

it('selects openings on a curved wall where they are drawn, never on the straight chord', () => {
  // Wall (-300,0)->(300,0) bowed to (0,300): the door at t=.25 is drawn at (-150,112.5), the window at t=.75 at (150,112.5).
  const floor = curvedOpenings.floors[0] as unknown as Floor;
  expect(findDoorAt({ x: -150, y: 112.5 }, floor.doors, floor.walls, 1)?.id).toBe('curve-door-0');
  expect(findDoorAt({ x: -150, y: 0 }, floor.doors, floor.walls, 1)).toBeNull();
  expect(findWindowAt({ x: 150, y: 112.5 }, floor.windows, floor.walls, 1)?.id).toBe('curve-window-0');
  expect(marqueeSelectionIds(floor, rect(-200, 60, -100, 170), all)).toEqual(['curve-door-0']);
  expect(marqueeSelectionIds(floor, rect(-200, -40, -100, 40), all)).toEqual([]);
  expect(marqueeSelectionIds(floor, rect(100, 60, 200, 170), all)).toEqual(['curve-window-0']);
  expect(marqueeSelectionIds(floor, rect(-320, -20, 320, 320), all)).toEqual(['curve-wall-0', 'curve-door-0', 'curve-window-0']);

  const bow = createDefaultProject('Bow').floors[0];
  bow.walls = [{ id: 'bow', start: { x: 0, y: 0 }, end: { x: 600, y: 0 }, curvePoint: { x: 300, y: -300 }, thickness: 15, height: 250, color: '#eee' }];
  bow.doors = [door('door', 'bow', .5)]; // drawn at (300,-150)
  expect(marqueeSelectionIds(bow, rect(250, -200, 350, -100), all)).toEqual(['door']);
  expect(marqueeSelectionIds(bow, rect(250, -30, 350, 30), all)).toEqual([]);
});

it('takes walls and dimension lines by both ends, other items by centre, and skips hidden layers', () => {
  const floor = createDefaultProject('Marquee').floors[0];
  floor.walls = rectangleWalls();
  floor.doors = [door('door', 'a-0', .5)]; // (200,0)
  floor.furniture = [{ id: 'sofa', catalogId: 'sofa', position: { x: 200, y: 150 }, rotation: 0, scale: { x: 1, y: 1, z: 1 } }];
  floor.columns = [{ id: 'col', position: { x: 390, y: 290 }, rotation: 0, shape: 'round', diameter: 30, height: 280, color: '#ccc' }];
  floor.measurements = [{ id: 'dim', x1: 20, y1: 100, x2: 380, y2: 100 }];
  floor.textAnnotations = [{ id: 'note', x: 200, y: 200, text: 'Hall', fontSize: 16, color: '#000', rotation: 0 }];
  expect(marqueeSelectionIds(floor, rect(-10, -10, 410, 310), all)).toEqual(['a-0', 'a-1', 'a-2', 'a-3', 'door', 'sofa', 'col', 'note', 'dim']);
  expect(marqueeSelectionIds(floor, rect(150, -10, 250, 210), all)).toEqual(['door', 'sofa', 'note']);
  expect(marqueeSelectionIds(floor, rect(-10, -10, 410, 310), { measurements: false, annotations: true, textAnnotations: false })).toEqual(['a-0', 'a-1', 'a-2', 'a-3', 'door', 'sofa', 'col']);
});
