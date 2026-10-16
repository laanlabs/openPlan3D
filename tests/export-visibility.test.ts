import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { exportAsSVG, exportAsPNG, exportPDF } from '$lib/utils/export';
import { exportDXF } from '$lib/utils/cadExport';
import { renderPrintPage } from '$lib/utils/scaledPrint';
import { planContentHidden, planExportVisibility, visiblePlanFloor } from '$lib/utils/exportVisibility';
import { layerVisibility } from '$lib/stores/project';
import { projectSettings, type ProjectSettings } from '$lib/stores/settings';
import type { Project } from '$lib/models/types';
import { roomProject } from './fixtures/project';

// Same harness as tests/exports.test.ts: jsPDF is mocked and every raster export
// draws into a proxied canvas whose fillText calls are recorded.
const { pdfSave } = vi.hoisted(() => ({ pdfSave: vi.fn() }));
vi.mock('jspdf', () => ({ default: class {
  constructor() {
    return new Proxy({ save: pdfSave, splitTextToSize: (value: string) => [value],
      internal: { pageSize: { getWidth: () => 297, getHeight: () => 210 } },
    }, { get: (target, key) => target[key as keyof typeof target] ?? (() => {}) });
  }
} }));

let downloaded: Blob[];
const canvasText = vi.fn();
let canvas: HTMLCanvasElement;
let previousSettings: ProjectSettings;
const previousLayers = get(layerVisibility);

beforeEach(() => {
  downloaded = []; canvasText.mockClear(); pdfSave.mockClear();
  previousSettings = get(projectSettings);
  const ctx = new Proxy({ fillText: canvasText, measureText: (text: string) => ({ width: text.length * 6 }) }, {
    get: (target, key) => target[key as keyof typeof target] ?? (() => {}),
  });
  canvas = { width: 400, height: 300, getContext: () => ctx, toDataURL: () => 'data:image/png;base64,test',
    toBlob: (callback: BlobCallback) => callback(new Blob(['png'])) } as unknown as HTMLCanvasElement;
  vi.stubGlobal('document', { createElement: (tag: string) => tag === 'canvas' ? canvas : { click: vi.fn() }, querySelectorAll: () => [], querySelector: () => null });
  // Room floor patterns load texture images in the Print Layout.
  vi.stubGlobal('Image', class { complete = false; naturalWidth = 0; onload: unknown; onerror: unknown; set src(_value: string) {} });
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { downloaded.push(blob as Blob); return 'blob:test'; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => { projectSettings.set(previousSettings); layerVisibility.set(previousLayers); });

const defaults = { walls: true, doors: true, windows: true, furniture: true, stairs: true, columns: true, entourage: true,
  measurements: true, annotations: true, textAnnotations: true, roomLabels: true };
const defaultDimensions = { showDimensions: true, showExternalDimensions: true, showInternalDimensions: false };

/** A shell like the one in the report: walls, a note, a stair, a saved dimension, a measurement and furniture. */
function shellProject(): Project {
  const project = roomProject(), floor = project.floors[0];
  floor.textAnnotations = [{ id: 'note', x: 200, y: -60, text: 'Front porch', fontSize: 16, color: '#1e293b', rotation: 0 }];
  floor.stairs = [{ id: 'stair', position: { x: 100, y: 150 }, width: 90, depth: 250, rotation: 0, riserCount: 14, direction: 'up', stairType: 'straight' }];
  floor.annotations = [{ id: 'dim', x1: 0, y1: 320, x2: 400, y2: 320, offset: 30, label: 'Approx 13 ft' }];
  floor.measurements = [{ id: 'measure', x1: 20, y1: 40, x2: 220, y2: 40 }];
  floor.furniture = [{ id: 'chair', catalogId: 'chair', position: { x: 300, y: 150 }, rotation: 0, scale: { x: 1, y: 1, z: 1 } }];
  floor.columns = [{ id: 'column', position: { x: 350, y: 250 }, rotation: 0, shape: 'round', diameter: 30, height: 250, color: '#cccccc' }];
  return project;
}

const WALL_LABEL = /^\d+ cm$/;
/** Text each plan export drew for the project: PNG, PDF and Print Layout canvas text, SVG and DXF file text. */
async function exportedText(project: Project) {
  canvasText.mockClear(); await exportAsPNG(null, project);
  const png = canvasText.mock.calls.map(call => String(call[0]));
  canvasText.mockClear(); await exportPDF(project);
  const pdf = canvasText.mock.calls.map(call => String(call[0]));
  exportAsSVG(project);
  const svg = [...(await downloaded.at(-1)!.text()).matchAll(/>([^<>]+)<\/(?:text|tspan)>/g)].map(match => match[1]);
  exportDXF(project);
  const lines = (await downloaded.at(-1)!.text()).trim().split(/\r?\n/).map(line => line.trim());
  const dxf = lines.flatMap((code, i) => i % 2 === 0 && code === '1' ? [lines[i + 1]] : []);
  canvasText.mockClear(); renderPrintPage(canvas, project, { pageSize: 'letter', orientation: 'landscape', scale: 'fit' });
  const print = canvasText.mock.calls.map(call => String(call[0]));
  return { png, pdf, svg, dxf, print };
}

it('maps the 2D view switches to what the plan exports draw, with every default shown', () => {
  expect(planExportVisibility(defaults, defaultDimensions)).toEqual({ ...defaults, wallDimensions: true, roomDimensions: false });
  // Settings → Dimensions → Dimensions (also the status bar's Automatic dimensions) hides every automatic dimension.
  expect(planExportVisibility(defaults, { ...defaultDimensions, showDimensions: false, showInternalDimensions: true }))
    .toMatchObject({ wallDimensions: false, roomDimensions: false, annotations: true, measurements: true });
  expect(planExportVisibility(defaults, { ...defaultDimensions, showExternalDimensions: false }).wallDimensions).toBe(false);
  expect(planExportVisibility(defaults, { ...defaultDimensions, showInternalDimensions: true }).roomDimensions).toBe(true);
  // Wall lengths are drawn with their walls, on screen and in the files.
  expect(planExportVisibility({ ...defaults, walls: false }, defaultDimensions)).toMatchObject({ walls: false, wallDimensions: false });
  for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
    expect(planExportVisibility({ ...defaults, [key]: false }, defaultDimensions)[key]).toBe(false);
  }
});

it('leaves hidden layers out of the floor an export draws and keeps the walls rooms and openings need', () => {
  const project = shellProject(), floor = project.floors[0], before = structuredClone(floor);
  const hidden = planExportVisibility({ ...defaults, walls: false, doors: false, furniture: false, stairs: false, textAnnotations: false, annotations: false }, defaultDimensions);
  const shown = visiblePlanFloor(floor, hidden);
  expect(shown.walls).toBe(floor.walls);
  expect(shown.rooms).toBe(floor.rooms);
  expect([shown.doors, shown.furniture, shown.stairs, shown.textAnnotations, shown.annotations]).toEqual([[], [], [], [], []]);
  expect(shown.measurements).toEqual(floor.measurements);
  expect(shown.columns).toEqual(floor.columns);
  expect(floor).toEqual(before);
  // A floor whose only content is hidden would export an empty file; walls always count as content.
  const notes = roomProject().floors[0]; notes.walls = [];
  notes.textAnnotations = [{ id: 'n', x: 0, y: 0, text: 'Label', fontSize: 16, color: '#000000', rotation: 0 }];
  expect(planContentHidden(notes, planExportVisibility({ ...defaults, textAnnotations: false }, defaultDimensions))).toBe(true);
  expect(planContentHidden(notes, planExportVisibility(defaults, defaultDimensions))).toBe(false);
  expect(planContentHidden(floor, planExportVisibility({ ...defaults, walls: false }, defaultDimensions))).toBe(false);
  notes.textAnnotations = [];
  expect(planContentHidden(notes, planExportVisibility({ ...defaults, textAnnotations: false }, defaultDimensions))).toBe(false);
  expect(planContentHidden(undefined, planExportVisibility(defaults, defaultDimensions))).toBe(false);
});

it('still exports wall lengths, notes, stairs and every layer by default', async () => {
  const project = shellProject(), before = structuredClone(project);
  const text = await exportedText(project);
  for (const format of ['png', 'pdf', 'svg', 'dxf'] as const) {
    expect(text[format].filter(value => WALL_LABEL.test(value)), format).toHaveLength(4);
    for (const label of ['Front porch', 'UP', 'Approx 13 ft', '2 m', 'Room 1']) expect(text[format], `${format} ${label}`).toContain(label);
  }
  for (const label of ['Front porch', 'UP', 'Approx 13 ft', '2 m', 'Room 1 (12.0 m²)', 'Armchair']) expect(text.print).toContain(label);
  expect(project).toEqual(before);
});

it.each([
  ['Settings → Dimensions → Dimensions (or Automatic dimensions) off', () => projectSettings.update(s => ({ ...s, showDimensions: false }))],
  ['External Dimensions off', () => projectSettings.update(s => ({ ...s, showExternalDimensions: false }))],
])('leaves wall lengths out of PNG, PDF, SVG and DXF with %s, as on screen', async (_name, hide) => {
  hide();
  const text = await exportedText(shellProject());
  for (const format of ['png', 'pdf', 'svg', 'dxf'] as const) {
    expect(text[format].filter(value => WALL_LABEL.test(value)), format).toEqual([]);
    // Only the automatic dimensions go: the user's own notes, stairs and saved dimensions stay.
    for (const label of ['Front porch', 'UP', 'Approx 13 ft']) expect(text[format], `${format} ${label}`).toContain(label);
  }
});

it('leaves hidden layers and room labels out of PNG, PDF, SVG, DXF and the Print Layout', async () => {
  layerVisibility.update(v => ({ ...v, annotations: false, measurements: false, textAnnotations: false, stairs: false, furniture: false, roomLabels: false }));
  const project = shellProject(), before = structuredClone(project);
  const text = await exportedText(project);
  for (const format of ['png', 'pdf', 'svg', 'dxf', 'print'] as const) {
    for (const label of ['Front porch', 'UP', 'Approx 13 ft', '2 m', 'Armchair', '12.0 m²', 'Room 1', 'Room 1 (12.0 m²)']) {
      expect(text[format], `${format} ${label}`).not.toContain(label);
    }
  }
  for (const format of ['png', 'pdf', 'svg', 'dxf'] as const) expect(text[format].filter(value => WALL_LABEL.test(value)), format).toHaveLength(4);
  expect(project).toEqual(before);
});

it('leaves hidden walls and their lengths out but keeps the rooms traced from them', async () => {
  layerVisibility.update(v => ({ ...v, walls: false }));
  const project = shellProject();
  exportAsSVG(project);
  const svg = await downloaded.at(-1)!.text();
  expect(svg).not.toContain('stroke="#333"');
  expect(svg).toContain('fill-opacity="0.4"');
  exportDXF(project);
  const dxf = (await downloaded.at(-1)!.text()).trim().split(/\r?\n/).map(line => line.trim());
  const layers = dxf.flatMap((code, i) => i % 2 === 0 && code === '8' ? [dxf[i + 1]] : []);
  expect(layers).not.toContain('WALLS');
  const text = await exportedText(project);
  for (const format of ['png', 'pdf', 'svg', 'dxf'] as const) {
    expect(text[format].filter(value => WALL_LABEL.test(value)), format).toEqual([]);
    expect(text[format], format).toContain('Room 1');
  }
});

it('frames the exported drawing on what is shown, not on hidden notes far away', async () => {
  const project = shellProject();
  project.floors[0].textAnnotations.push({ id: 'far', x: 5000, y: 0, text: 'Far note', fontSize: 16, color: '#1e293b', rotation: 0 });
  const width = async () => { exportAsSVG(project); return Number((await downloaded.at(-1)!.text()).match(/viewBox="0 0 ([\d.]+)/)![1]); };
  expect(await width()).toBeGreaterThan(5000);
  layerVisibility.update(v => ({ ...v, textAnnotations: false }));
  expect(await width()).toBeLessThan(700);
  await exportAsPNG(null, project);
  expect(canvas.width).toBeLessThan(1400);
});

it('prints room width × depth only while automatic dimensions and Internal Dimensions are on', () => {
  const project = shellProject();
  const printed = () => { canvasText.mockClear(); renderPrintPage(canvas, project, { pageSize: 'a4', orientation: 'landscape', scale: 50 }); return canvasText.mock.calls.map(call => String(call[0])); };
  expect(printed().some(text => text.includes(' × '))).toBe(false);
  projectSettings.update(s => ({ ...s, showInternalDimensions: true }));
  expect(printed()).toContain('4 m × 3 m');
  projectSettings.update(s => ({ ...s, showDimensions: false }));
  expect(printed().some(text => text.includes(' × '))).toBe(false);
});
