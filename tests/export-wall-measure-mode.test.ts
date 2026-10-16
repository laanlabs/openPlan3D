import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { exportAsSVG, exportAsPNG, exportPDF } from '$lib/utils/export';
import { exportDXF } from '$lib/utils/cadExport';
import { projectSettings, type ProjectSettings } from '$lib/stores/settings';
import { wallDimensionLabel } from '$lib/utils/wallDimensionLabel';
import { wallPlanDimension } from '$lib/utils/wallPlanGeometry';
import type { Project, Wall } from '$lib/models/types';
import { rectangleWalls, roomProject } from './fixtures/project';

// Same export harness as tests/exports.test.ts: jsPDF is mocked, the plan is
// rasterized into a proxied canvas whose fillText calls are recorded.
const { pdfText, pdfSave } = vi.hoisted(() => ({ pdfText: vi.fn(), pdfSave: vi.fn() }));
vi.mock('jspdf', () => ({ default: class {
  constructor() {
    return new Proxy({
      text: pdfText, save: pdfSave, splitTextToSize: (value: string) => [value],
      internal: { pageSize: { getWidth: () => 297, getHeight: () => 210 } },
    }, { get: (target, key) => target[key as keyof typeof target] ?? (() => {}) });
  }
} }));

let downloaded: Blob[];
const canvasText = vi.fn();
let canvas: HTMLCanvasElement;
let previous: ProjectSettings;

beforeEach(() => {
  downloaded = [];
  canvasText.mockClear(); pdfText.mockClear(); pdfSave.mockClear();
  previous = get(projectSettings);
  const ctx = new Proxy({ fillText: canvasText, measureText: () => ({ width: 30 }) }, {
    get: (target, key) => target[key as keyof typeof target] ?? (() => {}),
  });
  canvas = { width: 400, height: 300, getContext: () => ctx, toDataURL: () => 'data:image/png;base64,test',
    toBlob: (callback: BlobCallback) => callback(new Blob(['png'])) } as unknown as HTMLCanvasElement;
  vi.stubGlobal('document', {
    createElement: (tag: string) => tag === 'canvas' ? canvas : { click: vi.fn() },
    querySelectorAll: () => [],
    querySelector: () => null,
  });
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { downloaded.push(blob as Blob); return 'blob:test'; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => projectSettings.set(previous));

const svgLabels = (svg: string) => [...svg.matchAll(/>(\d+ cm)<\/text>/g)].map(m => m[1]).sort();
const canvasLabels = () => canvasText.mock.calls.map(c => String(c[0])).filter(s => /^\d+ cm$/.test(s)).sort();

/** Wall length labels printed by each plan export of the active floor. */
async function exportedLabels(project: Project) {
  exportAsSVG(project);
  const svg = svgLabels(await downloaded.at(-1)!.text());
  canvasText.mockClear(); await exportAsPNG(canvas, project);
  const png = canvasLabels();
  canvasText.mockClear(); await exportPDF(project);
  return { svg, png, pdf: canvasLabels() };
}

it('prints clear-span wall lengths in SVG, PNG and PDF when walls are measured edge to edge', async () => {
  projectSettings.update(s => ({ ...s, wallMeasureMode: 'edge' }));
  const project = roomProject(), before = JSON.stringify(project);
  // 400 x 300 cm centrelines, 15 cm walls abutting at every corner: 7.5 cm off each end
  const clearSpans = ['285 cm', '285 cm', '385 cm', '385 cm'];
  expect(await exportedLabels(project)).toEqual({ svg: clearSpans, png: clearSpans, pdf: clearSpans });
  expect(pdfSave).toHaveBeenCalledOnce();
  expect(JSON.stringify(project)).toBe(before);
});

it('prints clear-span wall lengths in the DXF dimension layer in edge mode and centrelines otherwise', async () => {
  projectSettings.update(s => ({ ...s, wallMeasureMode: 'edge' }));
  exportDXF(roomProject());
  const edge = await downloaded.at(-1)!.text();
  expect(edge).toContain('385 cm'); expect(edge).toContain('285 cm');
  expect(edge).not.toContain('400 cm'); expect(edge).not.toContain('300 cm');
  projectSettings.update(s => ({ ...s, wallMeasureMode: 'centerline' }));
  exportDXF(roomProject());
  const centre = await downloaded.at(-1)!.text();
  expect(centre).toContain('400 cm'); expect(centre).toContain('300 cm');
  expect(centre).not.toContain('385 cm');
});

it('keeps centreline wall lengths in every export when walls are measured centre to centre', async () => {
  projectSettings.update(s => ({ ...s, wallMeasureMode: 'centerline' }));
  const centrelines = ['300 cm', '300 cm', '400 cm', '400 cm'];
  expect(await exportedLabels(roomProject())).toEqual({ svg: centrelines, png: centrelines, pdf: centrelines });
});

it('keeps the faceted centreline length of a curved wall in edge mode', async () => {
  projectSettings.update(s => ({ ...s, wallMeasureMode: 'edge' }));
  const project = roomProject(), walls = project.floors[0].walls;
  walls[0].curvePoint = { x: 200, y: -600 };
  const curved = wallPlanDimension(walls[0]);
  expect(curved.length).toBeGreaterThan(740); expect(curved.length).toBeLessThan(760);
  expect(wallDimensionLabel(walls[0], walls, 'edge')).toEqual(curved);
  const expected = ['285 cm', '285 cm', '385 cm', `${curved.length} cm`].sort();
  expect(await exportedLabels(project)).toEqual({ svg: expected, png: expected, pdf: expected });
});

it('centres the edge-mode label on the clear span and ignores collinear continuations', () => {
  const [first, second] = rectangleWalls();
  const continuation: Wall = { ...second, id: 'next', start: { x: 400, y: 0 }, end: { x: 800, y: 0 } };
  expect(wallDimensionLabel(first, [first, second], 'centerline')).toEqual({ length: 400, point: { x: 200, y: -8 } });
  // Only the shared corner is inset by 7.5 cm: 392.5 cm centred at x = 196.25
  expect(wallDimensionLabel(first, [first, second], 'edge')).toEqual({ length: 393, point: { x: 196.25, y: -8 } });
  expect(wallDimensionLabel(first, [first, continuation], 'edge')).toEqual({ length: 400, point: { x: 200, y: -8 } });
});

it('writes the edge-mode SVG label at the clear-span midpoint of the wall', async () => {
  projectSettings.update(s => ({ ...s, wallMeasureMode: 'edge' }));
  const project = roomProject(), [first, second] = rectangleWalls();
  project.floors[0].walls = [first, second];
  exportAsSVG(project);
  const svg = await downloaded.at(-1)!.text();
  const [, x1, y1] = svg.match(/<line x1="(\S+)" y1="(\S+)" x2="\S+" y2="\S+" stroke="#333" stroke-width="15"/)!;
  expect(svg).toContain(`<text x="${Number(x1) + 196.25}" y="${Number(y1) - 8}"`);
  expect(svg).toContain('>393 cm</text>');
});
