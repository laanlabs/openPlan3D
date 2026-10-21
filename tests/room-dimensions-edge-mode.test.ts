import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { drawRooms } from '$lib/utils/canvasRenderer';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import { interiorRoomExtent } from '$lib/utils/interiorArea';
import { planContentBounds } from '$lib/utils/planContentBounds';
import { printPageLayout } from '$lib/utils/printLayout';
import { getRoomPolygon, resolveRooms } from '$lib/utils/roomDetection';
import { projectSettings, type ProjectSettings } from '$lib/stores/settings';
import type { Floor, Point, Wall } from '$lib/models/types';
import { rectangleWalls, roomProject } from './fixtures/project';

// Issue #121: with Settings > Dimensions > Measure walls set to Edge to edge,
// the wall dimension lines showed the clear span but a room's Internal
// Dimensions still gave its centreline outline, 4 m x 3 m for a room whose
// walls read 3.85 m and 2.85 m.

let previous: ProjectSettings;
beforeEach(() => {
  previous = get(projectSettings);
  // Room fills load floor textures; nothing loads in Node.
  vi.stubGlobal('Image', class { complete = false; naturalWidth = 0; onload: unknown; onerror: unknown; set src(_value: string) {} });
});
afterEach(() => { projectSettings.set(previous); vi.unstubAllGlobals(); });

function recordingContext() {
  const texts: string[] = [];
  const ctx = new Proxy({
    fillText: (text: string) => { texts.push(String(text)); },
    measureText: (text: string) => { texts.push(String(text)); return { width: 8 * String(text).length }; },
  }, { get: (target, key) => target[key as keyof typeof target] ?? (() => {}) }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts };
}

function settings(mode: 'centerline' | 'edge'): ProjectSettings {
  return { ...get(projectSettings), units: 'metric', showDimensions: true, showInternalDimensions: true, wallMeasureMode: mode };
}

function roomDimensionLabels(floor: Floor, mode: 'centerline' | 'edge') {
  const { ctx, texts } = recordingContext();
  const cs: CanvasState = { ctx, width: 800, height: 600, zoom: 1, camX: 200, camY: 150 };
  drawRooms(cs, floor, resolveRooms(floor), null, false, true, settings(mode));
  return texts.filter(text => text.includes(' × '));
}

function floorWith(walls: Wall[]): Floor {
  const floor = roomProject().floors[0];
  floor.walls = walls;
  return floor;
}

const wall = (id: string, start: Point, end: Point, thickness = 15, extra: Partial<Wall> = {}): Wall =>
  ({ id, start, end, thickness, height: 250, color: '#eeeeee', ...extra });

it('labels a room with its centreline size, or its clear size when walls are measured edge to edge', () => {
  const floor = floorWith(rectangleWalls());
  expect(roomDimensionLabels(floor, 'centerline')).toEqual(['4 m × 3 m']);
  expect(roomDimensionLabels(floor, 'edge')).toEqual(['3.85 m × 2.85 m']);
});

it('takes each wall\'s own thickness off the clear size', () => {
  const [top, right, bottom, left] = rectangleWalls();
  const floor = floorWith([{ ...top, thickness: 20 }, { ...right, thickness: 10 }, { ...bottom, thickness: 10 }, { ...left, thickness: 30 }]);
  // 400 - 30/2 - 10/2 wide, 300 - 20/2 - 10/2 deep.
  expect(roomDimensionLabels(floor, 'edge')).toEqual(['3.8 m × 2.85 m']);
});

it('measures the faces of an L-shaped room, a slanted wall and a curved wall', () => {
  const l = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 200 }, { x: 200, y: 200 }, { x: 200, y: 400 }, { x: 0, y: 400 }];
  const lWalls = l.map((p, i) => wall(`l${i}`, p, l[(i + 1) % l.length]));
  expect(interiorRoomExtent(l, lWalls)).toEqual({ minX: 7.5, minY: 7.5, maxX: 392.5, maxY: 392.5 });

  // A right triangle: the slanted wall's inner face cuts the corner it spans.
  const tri = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 0, y: 300 }];
  const triWalls = tri.map((p, i) => wall(`t${i}`, p, tri[(i + 1) % 3], 10));
  const box = interiorRoomExtent(tri, triWalls)!;
  expect(box.minX).toBeCloseTo(5, 6);
  expect(box.minY).toBeCloseTo(5, 6);
  // The inner face of the hypotenuse x + y = 300 lies 5 cm in: x + y = 300 - 5 * sqrt(2).
  expect(box.maxX).toBeCloseTo(300 - 5 * Math.SQRT2 - 5, 4);
  expect(box.maxY).toBeCloseTo(300 - 5 * Math.SQRT2 - 5, 4);

  // A curved wall is measured along the facets the editor draws.
  const [top, right, bottom, left] = rectangleWalls();
  const curved = { ...right, curvePoint: { x: 460, y: 150 } };
  const ring = getRoomPolygon(resolveRooms(floorWith([top, curved, bottom, left]))[0], [top, curved, bottom, left]);
  const bulge = interiorRoomExtent(ring, [top, curved, bottom, left])!;
  expect(bulge.minX).toBeCloseTo(7.5, 6);
  expect(bulge.maxX).toBeGreaterThan(400);
  expect(bulge.maxX).toBeLessThan(Math.max(...ring.map(p => p.x)) - 7.5 + 1e-6);
});

it('ignores walls that do not reach the room and refuses invalid walls', () => {
  const walls = rectangleWalls();
  const box = interiorRoomExtent(walls.map(w => w.start), walls);
  expect(box).toEqual({ minX: 7.5, minY: 7.5, maxX: 392.5, maxY: 292.5 });
  // A free-standing wall inside the room and a wall elsewhere on the floor leave its size alone.
  expect(interiorRoomExtent(walls.map(w => w.start), [...walls,
    wall('island', { x: 150, y: 150 }, { x: 250, y: 150 }), wall('far', { x: 900, y: 0 }, { x: 900, y: 300 })])).toEqual(box);
  expect(interiorRoomExtent(walls.map(w => w.start), [{ ...walls[0], thickness: 0 }, ...walls.slice(1)])).toBeNull();
  expect(interiorRoomExtent(walls.map(w => w.start).slice(0, 2), walls)).toBeNull();
  // Walls thicker than the room leave nothing inside.
  expect(interiorRoomExtent(walls.map(w => w.start), walls.map(w => ({ ...w, thickness: 700 })))).toBeNull();
});

it('measures again when the walls change but the outline is the one the editor kept', () => {
  const floor = floorWith(rectangleWalls());
  const rooms = resolveRooms(floor), polygons = new Map(rooms.map(room => [room.id, getRoomPolygon(room, floor.walls)]));
  const labels = (walls: Wall[]) => {
    const { ctx, texts } = recordingContext();
    drawRooms({ ctx, width: 800, height: 600, zoom: 1, camX: 200, camY: 150 }, { ...floor, walls }, rooms, null, false, true, settings('edge'), polygons);
    return texts.filter(text => text.includes(' × '));
  };
  expect(labels(floor.walls)).toEqual(['3.85 m × 2.85 m']);
  expect(labels(floor.walls)).toEqual(['3.85 m × 2.85 m']);
  expect(labels(floor.walls.map(w => ({ ...w, thickness: 25 })))).toEqual(['3.75 m × 2.75 m']);
});

it('falls back to the centreline size when no clear size can be measured', () => {
  const walls = rectangleWalls().map(w => ({ ...w, thickness: 700 }));
  expect(roomDimensionLabels(floorWith(walls), 'edge')).toEqual(['4 m × 3 m']);
});

it('sizes the room caption it will draw when fitting the plan', () => {
  const floor = floorWith(rectangleWalls());
  const rooms = resolveRooms(floor).map(room => ({ room, polygon: getRoomPolygon(room, floor.walls) }));
  for (const [edge, label] of [[false, '4 m × 3 m'], [true, '3.85 m × 2.85 m']] as const) {
    const { ctx, texts } = recordingContext();
    planContentBounds(floor, { context: ctx, zoom: 1, units: 'metric', entourageAspect: () => 1,
      automaticDimensions: { external: false, internal: true, edge }, dimensionRooms: rooms });
    expect(texts.filter(text => text.includes(' × '))).toEqual([label]);
  }
});

it('lays out a printed page with the caption the page draws', () => {
  const floor = floorWith(rectangleWalls());
  for (const [mode, label] of [['centerline', '4 m × 3 m'], ['edge', '3.85 m × 2.85 m']] as const) {
    const { ctx, texts } = recordingContext();
    printPageLayout(floor, undefined, { pageSize: 'a4', orientation: 'landscape', scale: 'fit' },
      { context: ctx, pixelsPerMm: 6, roomLabels: false, roomDimensions: true, units: 'metric', wallMeasureMode: mode });
    expect(new Set(texts.filter(text => text.includes(' × ')))).toEqual(new Set([label]));
  }
});
