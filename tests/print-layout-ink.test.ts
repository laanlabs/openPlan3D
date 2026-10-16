import { beforeEach, expect, it, vi } from 'vitest';
import { renderPrintPage } from '$lib/utils/scaledPrint';
import { stairPlanBounds } from '$lib/utils/stairPlanGeometry';
import { getRoomPolygon, resolveRooms, roomLabelPosition } from '$lib/utils/roomDetection';
import type { Project } from '$lib/models/types';
import { roomProject } from './fixtures/project';

const fit = { pageSize: 'letter', orientation: 'landscape', scale: 'fit' } as const;

beforeEach(() => {
  // Room floor patterns and uploaded symbols load images; these report a decoded image.
  vi.stubGlobal('Image', class { complete = true; naturalWidth = 10; onload: unknown; onerror: unknown; set src(_value: string) {} });
});

/** A page canvas whose text measures 0.6 em per character, so captions grow with their font as on a real canvas. */
function pageCanvas() {
  const calls: string[] = [];
  const target: Record<string, unknown> = { font: '10px sans-serif',
    measureText(text: string) {
      const px = Number(/([\d.]+)px/.exec(String(target.font))![1]), width = text.length * px * 0.6;
      return { width, actualBoundingBoxLeft: width / 2, actualBoundingBoxRight: width / 2, actualBoundingBoxAscent: px * 0.75, actualBoundingBoxDescent: px * 0.25 };
    },
    fillText: (text: string) => { calls.push(`text:${text}`); },
    drawImage: () => { calls.push('image'); },
  };
  const context = new Proxy(target, { get: (o, key) => o[key as string] ?? (() => {}) });
  return { canvas: { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement, calls };
}

/** The plan rectangle the page's drawing area shows; the sheet clips everything outside it. */
function printedArea(project: Project) {
  const layout = renderPrintPage(pageCanvas().canvas, project, fit)!;
  const halfWidth = layout.area.width / 2 / layout.mmPerCm, halfHeight = layout.area.height / 2 / layout.mmPerCm;
  return { minX: layout.center.x - halfWidth, maxX: layout.center.x + halfWidth, minY: layout.center.y - halfHeight,
    maxY: layout.center.y + halfHeight, zoom: layout.mmPerCm * 6, fits: layout.fits };
}

it('keeps the second run of an L-shaped stair beside the walls on a Fit page', () => {
  const project = roomProject();
  const stair = { id: 'l', position: { x: 450, y: 150 }, width: 90, depth: 260, rotation: 0, riserCount: 14, direction: 'up', stairType: 'l-shaped' } as const;
  project.floors[0].stairs = [{ ...stair }];
  const area = printedArea(project), footprint = stairPlanBounds(stair);
  expect(area.fits).toBe(true);
  expect(area.maxX).toBeGreaterThanOrEqual(footprint.maxX);
  expect(area.minY).toBeLessThanOrEqual(footprint.minY);
});

it('keeps a spiral stair caption below the circle on a Fit page', () => {
  const project = roomProject();
  project.floors[0].stairs = [{ id: 's', position: { x: 200, y: 400 }, width: 150, depth: 150, rotation: 0, riserCount: 12, direction: 'up', stairType: 'spiral' }];
  const area = printedArea(project);
  // drawStair centres "UP" 12 px (at 1 px per cm) below the 75 cm radius.
  expect(area.maxY).toBeGreaterThanOrEqual(400 + 75 + 12 + 2);
});

it('keeps every line of a multi-line note at the edge of the plan on a Fit page', () => {
  const project = roomProject();
  project.floors[0].textAnnotations = [{ id: 'n', x: 200, y: -80, text: 'Front porch\napprox 12 ft\ncheck', fontSize: 16, color: '#1e293b', rotation: 0 }];
  const area = printedArea(project);
  // Three 16 cm lines 19.2 cm apart: the first line's glyphs reach 19.2 cm + 0.75 em above the note's centre.
  expect(area.minY).toBeLessThanOrEqual(-80 - 19.2 - 12);
});

it('keeps a room label moved outside the walls on a Fit page', () => {
  const project = roomProject(), floor = project.floors[0];
  floor.rooms = resolveRooms(floor).map(room => ({ ...room, name: 'Kitchen', floorTexture: 'none', labelOffset: { x: 0, y: -250 } }));
  const anchor = roomLabelPosition(floor.rooms[0], getRoomPolygon(floor.rooms[0], floor.walls));
  const area = printedArea(project);
  expect(anchor.y).toBeLessThan(-90);
  expect(area.minY).toBeLessThanOrEqual(anchor.y - 13 * 0.75);
});

it('keeps a measurement caption above the walls on a Fit page', () => {
  const project = roomProject();
  project.floors[0].measurements = [{ id: 'm', x1: 0, y1: -40, x2: 400, y2: -40 }];
  const area = printedArea(project);
  // The bold 12 px caption sits 6 px above the line (within a hundredth of a millimetre on paper).
  expect(area.minY).toBeLessThanOrEqual(-40 - (6 + 12 * 0.75) / area.zoom + 0.01);
});

it('draws uploaded entourage under the notes and stairs, as the editor does', () => {
  const project = roomProject(), floor = project.floors[0];
  project.customEntourage = [{ id: 'photo', name: 'Site photo', dataUrl: 'data:image/png;base64,iVBORw0KGgo=', aspect: 1 }];
  floor.entourage = [{ id: 'e', defId: 'photo', position: { x: 200, y: 150 }, width: 380, rotation: 0 }];
  floor.textAnnotations = [{ id: 'n', x: 200, y: 150, text: 'Front porch', fontSize: 16, color: '#1e293b', rotation: 0 }];
  floor.stairs = [{ id: 's', position: { x: 100, y: 150 }, width: 90, depth: 250, rotation: 0, riserCount: 14, direction: 'up', stairType: 'straight' }];
  const { canvas, calls } = pageCanvas();
  renderPrintPage(canvas, project, fit);
  expect(calls).toContain('image');
  expect(calls.indexOf('image')).toBeLessThan(calls.indexOf('text:Front porch'));
  expect(calls.indexOf('image')).toBeLessThan(calls.indexOf('text:UP'));
});
