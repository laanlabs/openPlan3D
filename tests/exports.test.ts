import { beforeEach, expect, it, vi } from 'vitest';
import { exportAsSVG, exportAsPNG, exportPDF } from '$lib/utils/export';
import { exportDXF } from '$lib/utils/cadExport';
import { resolveRooms } from '$lib/utils/roomDetection';
import { rectangleWalls, roomProject } from './fixtures/project';

const { pdfText, pdfSave } = vi.hoisted(() => ({ pdfText: vi.fn(), pdfSave: vi.fn() }));
vi.mock('jspdf', () => ({ default: class {
  constructor() {
    return new Proxy({
      text: pdfText, save: pdfSave,
      internal: { pageSize: { getWidth: () => 297, getHeight: () => 210 } },
    }, { get: (target, key) => target[key as keyof typeof target] ?? (() => {}) });
  }
} }));

let downloaded: Blob[];
const canvasText = vi.fn();
const canvasCurve = vi.fn();
let canvas: HTMLCanvasElement;

beforeEach(() => {
  downloaded = [];
  canvasText.mockClear(); canvasCurve.mockClear(); pdfText.mockClear(); pdfSave.mockClear();
  const ctx = new Proxy({ fillText: canvasText, quadraticCurveTo: canvasCurve, measureText: () => ({ width: 30 }) }, {
    get: (target, key) => target[key as keyof typeof target] ?? (() => {}),
  });
  canvas = { width: 400, height: 300, getContext: () => ctx, toDataURL: () => 'data:image/png;base64,test',
    toBlob: (callback: BlobCallback) => callback(new Blob(['png'])) } as unknown as HTMLCanvasElement;
  vi.stubGlobal('document', {
    createElement: (tag: string) => tag === 'canvas' ? canvas : { click: vi.fn() },
    querySelectorAll: () => [],
  });
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { downloaded.push(blob as Blob); return 'blob:test'; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

function namedProject() {
  const project = roomProject();
  const floor = project.floors[0];
  floor.rooms = resolveRooms(floor).map(room => ({ ...room, name: 'Kitchen & Dining <East>' }));
  return project;
}

it('writes the saved room name into a real SVG download with XML escaping', async () => {
  exportAsSVG(namedProject());
  expect(downloaded).toHaveLength(1);
  const svg = await downloaded[0].text();
  expect(svg).toContain('Kitchen &amp; Dining &lt;East&gt;');
  expect(svg).not.toContain('Room 1');
});

it('writes the saved room name into a real DXF download', async () => {
  exportDXF(namedProject());
  expect(downloaded).toHaveLength(1);
  const dxf = await downloaded[0].text();
  expect(dxf).toContain('Kitchen & Dining <East>');
  expect(dxf).not.toContain('Room 1');
});

it('uses the saved name when drawing the PNG export', () => {
  exportAsPNG(canvas, namedProject());
  expect(canvasText.mock.calls.map(call => call[0])).toContain('Kitchen & Dining <East>');
});

it('uses saved names and distinct textures for same-name rooms in the PDF schedule', () => {
  const project = roomProject();
  const floor = project.floors[0];
  floor.walls.push(...rectangleWalls('b', 600));
  floor.rooms = resolveRooms(floor).map((room, i) => ({ ...room, name: 'Bedroom', floorTexture: i ? 'tile' : 'carpet' }));
  exportPDF(project);
  const text = pdfText.mock.calls.map(call => call[0]);
  expect(text.filter(value => value === 'Bedroom')).toHaveLength(2);
  expect(text).toContain('carpet');
  expect(text).toContain('tile');
  expect(text).not.toContain('Room 1');
  expect(pdfSave).toHaveBeenCalledOnce();
});

it('preserves label offsets in SVG, DXF and raster drawing coordinates', async () => {
  const project = namedProject();
  project.floors[0].rooms[0].labelOffset = { x: 100, y: -50 };
  const before = JSON.stringify(project);
  exportAsSVG(project);
  expect(await downloaded.at(-1)!.text()).toContain('<text x="357.5" y="157.5"');
  exportDXF(project);
  const dxf = await downloaded.at(-1)!.text();
  const lines = dxf.trim().split(/\r?\n/).map(line => line.trim());
  const entities: Record<string, string>[] = []; let entity: Record<string, string> = {};
  for (let i = 0; i < lines.length; i += 2) {
    if (lines[i] === '0') { entity = {}; entities.push(entity); }
    entity[lines[i]] = lines[i + 1];
  }
  const label = entities.find(e => e['0'] === 'TEXT' && e['1'] === 'Kitchen & Dining <East>')!;
  expect(label['10']).toBe('300'); expect(label['20']).toBe('-100');
  exportAsPNG(canvas, project);
  expect(canvasText).toHaveBeenCalledWith('Kitchen & Dining <East>', 387.5, 187.5);
  canvasText.mockClear();
  exportPDF(project);
  expect(canvasText).toHaveBeenCalledWith('Kitchen & Dining <East>', 387.5, 187.5);
  expect(JSON.stringify(project)).toBe(before);
});

it('frames labels moved outside the walls and bounds large raster allocations', async () => {
  const project = namedProject();
  project.floors[0].rooms[0].labelOffset = { x: -1000, y: -1000 };
  exportAsSVG(project);
  const svg = await downloaded.at(-1)!.text();
  expect(svg).toContain('<text x="65" y="63"'); // ink bounds plus 50 cm padding
  exportAsPNG(canvas, project);
  expect(canvasText).toHaveBeenCalledWith('Kitchen & Dining <East>', 95, 93);
  project.floors[0].rooms[0].labelOffset = { x: 100000, y: 100000 };
  exportAsPNG(canvas, project);
  expect(Math.max(canvas.width, canvas.height)).toBeLessThanOrEqual(4096);
  exportPDF(project);
  expect(Math.max(canvas.width, canvas.height)).toBeLessThanOrEqual(4096);
});

it('draws curved wall paths in SVG and raster exports rather than endpoint chords', async () => {
  const project = namedProject();
  project.floors[0].walls[0].curvePoint = { x: 200, y: -600 };
  exportAsSVG(project);
  const svg = await downloaded.at(-1)!.text();
  expect(svg).toContain('Q 257.5 -242.5 457.5 357.5');
  exportAsPNG(canvas, project);
  expect(canvasCurve).toHaveBeenCalledWith(287.5, -212.5, 487.5, 387.5);
  const lengths = canvasText.mock.calls.map(c => String(c[0])).filter(s => /^\d+ cm$/.test(s)).map(Number.parseFloat);
  expect(Math.max(...lengths)).toBeGreaterThan(740); expect(Math.max(...lengths)).toBeLessThan(760);
  canvasCurve.mockClear(); exportPDF(project);
  expect(canvasCurve).toHaveBeenCalledWith(287.5, -212.5, 487.5, 387.5);
  exportDXF(project);
  const dxf = await downloaded.at(-1)!.text();
  expect((dxf.match(/\nLWPOLYLINE\n/g) ?? []).length).toBe(19); // 16 curve facets + 3 straight walls
});
