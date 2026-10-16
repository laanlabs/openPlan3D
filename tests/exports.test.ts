import { beforeEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { exportAsSVG, exportAsPNG, exportPDF } from '$lib/utils/export';
import { exportDXF, exportDWG } from '$lib/utils/cadExport';
import { exportNotice, exportDXFWithFeedback, exportDWGWithFeedback } from '$lib/stores/exportNotice';
import { placeCustomModel } from '$lib/services/customModels';
import { resolveRooms } from '$lib/utils/roomDetection';
import { benchmarkProject } from './fixtures/render-benchmark';
import { rectangleWalls, roomProject } from './fixtures/project';

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
const canvasCurve = vi.fn();
const canvasRect = vi.fn();
let canvas: HTMLCanvasElement;

beforeEach(() => {
  downloaded = [];
  canvasText.mockClear(); canvasCurve.mockClear(); canvasRect.mockClear(); pdfText.mockClear(); pdfSave.mockClear();
  const ctx = new Proxy({ fillText: canvasText, fillRect: canvasRect, quadraticCurveTo: canvasCurve, measureText: () => ({ width: 30 }) }, {
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

function namedProject() {
  const project = roomProject();
  const floor = project.floors[0];
  floor.rooms = resolveRooms(floor).map(room => ({ ...room, name: 'Kitchen & Dining <East>' }));
  return project;
}

it('localizes vector furniture captions while preserving geometry and source data', async () => {
  const project = namedProject();
  project.floors[0].furniture = [{ id: 'caption-chair', catalogId: 'chair', position: { x: 150, y: 120 }, rotation: 35, scale: { x: -1, y: 1.2, z: 1 } }];
  const before = JSON.stringify(project);
  exportAsSVG(project);
  const englishSVG = await downloaded.at(-1)!.text();
  exportAsSVG(project, 'pt');
  const portugueseSVG = await downloaded.at(-1)!.text();
  expect(portugueseSVG).toContain('Poltrona');
  expect(portugueseSVG.replaceAll('Poltrona', 'Armchair')).toBe(englishSVG);
  exportDXF(project);
  const englishDXF = await downloaded.at(-1)!.text();
  exportDXF(project, 'pt');
  const portugueseDXF = await downloaded.at(-1)!.text();
  expect(portugueseDXF).toContain('Poltrona');
  // Entity handles are freshly allocated for every drawing; normalize references
  // while comparing every other DXF tag, including all coordinates and layers.
  const withoutHandles = (dxf: string) => {
    const lines = dxf.trim().split(/\r?\n/);
    return lines.flatMap((code, i) => i % 2 || /^(5|105|3[2345][0-9])$/.test(code.trim()) ? [] : [[code, lines[i + 1]]]);
  };
  expect(withoutHandles(portugueseDXF.replaceAll('Poltrona', 'Armchair'))).toEqual(withoutHandles(englishDXF));
  expect(JSON.stringify(project)).toBe(before);
});

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

it('exports DWG as a DXF download and reports whether anything was written', async () => {
  // No window.alert exists in this environment, so a blocking dialog would throw here.
  expect(exportDWG(namedProject())).toBe(true);
  expect(downloaded).toHaveLength(1);
  expect(downloaded[0].type).toBe('application/dxf');
  expect(await downloaded[0].text()).toContain('Kitchen & Dining <East>');
  const empty = namedProject(); empty.floors[0].walls = [];
  expect(exportDWG(empty)).toBe('empty');
  expect(downloaded).toHaveLength(1);
});

it('localizes the PDF title block, schedule and summary labels and names OpenPlan3D', async () => {
  await exportPDF(namedProject());
  let text = pdfText.mock.calls.map(call => String(call[0]));
  expect(text).toContain('Created with OpenPlan3D');
  expect(text).toContain('Room Schedule');
  expect(text).toContain('Units: m, cm');
  expect(text.some(value => /^Date: /.test(value))).toBe(true);
  expect(text.some(value => /^1 rooms  ·  4 walls  ·  0 doors/.test(value))).toBe(true);
  expect(text.some(value => value.includes('Open 3D'))).toBe(false);
  pdfText.mockClear();
  await exportPDF(namedProject(), 'pt');
  text = pdfText.mock.calls.map(call => String(call[0]));
  expect(text).toContain('Criado com OpenPlan3D');
  expect(text).toContain('Tabela de ambientes');
  expect(text).toContain('Revestimento do piso');
  expect(text).toContain('Unidades: m, cm');
  expect(text.some(value => /^Data: /.test(value))).toBe(true);
  expect(text.some(value => /^1 ambientes  ·  4 paredes/.test(value))).toBe(true);
  expect(text).not.toContain('Room Schedule');
});

it('uses the saved name when drawing the PNG export', async () => {
  await exportAsPNG(canvas, namedProject());
  expect(canvasText.mock.calls.map(call => call[0])).toContain('Kitchen & Dining <East>');
});

it('uses saved names and distinct textures for same-name rooms in the PDF schedule', async () => {
  const project = roomProject();
  const floor = project.floors[0];
  floor.walls.push(...rectangleWalls('b', 600));
  floor.rooms = resolveRooms(floor).map((room, i) => ({ ...room, name: 'Bedroom', floorTexture: i ? 'tile' : 'carpet' }));
  await exportPDF(project);
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
  await exportAsPNG(canvas, project);
  expect(canvasText).toHaveBeenCalledWith('Kitchen & Dining <East>', 387.5, 187.5);
  canvasText.mockClear();
  await exportPDF(project);
  expect(canvasText).toHaveBeenCalledWith('Kitchen & Dining <East>', 387.5, 187.5);
  expect(JSON.stringify(project)).toBe(before);
});

it('frames labels moved outside the walls and bounds large raster allocations', async () => {
  const project = namedProject();
  project.floors[0].rooms[0].labelOffset = { x: -1000, y: -1000 };
  exportAsSVG(project);
  const svg = await downloaded.at(-1)!.text();
  expect(svg).toContain('<text x="65" y="63"'); // ink bounds plus 50 cm padding
  await exportAsPNG(canvas, project);
  expect(canvasText).toHaveBeenCalledWith('Kitchen & Dining <East>', 95, 93);
  project.floors[0].rooms[0].labelOffset = { x: 100000, y: 100000 };
  await exportAsPNG(canvas, project);
  expect(Math.max(canvas.width, canvas.height)).toBe(4096);
  expect([canvas.width, canvas.height].every(Number.isInteger)).toBe(true);
  await exportPDF(project);
  expect(Math.max(canvas.width, canvas.height)).toBe(4096);
  expect([canvas.width, canvas.height].every(Number.isInteger)).toBe(true);
});

it('draws curved wall paths in SVG and raster exports rather than endpoint chords', async () => {
  const project = namedProject();
  project.floors[0].walls[0].curvePoint = { x: 200, y: -600 };
  exportAsSVG(project);
  const svg = await downloaded.at(-1)!.text();
  expect(svg).toContain('Q 257.5 -242.5 457.5 357.5');
  await exportAsPNG(canvas, project);
  expect(canvasCurve).toHaveBeenCalledWith(287.5, -212.5, 487.5, 387.5);
  const lengths = canvasText.mock.calls.map(c => String(c[0])).filter(s => /^\d+ cm$/.test(s)).map(Number.parseFloat);
  expect(Math.max(...lengths)).toBeGreaterThan(740); expect(Math.max(...lengths)).toBeLessThan(760);
  canvasCurve.mockClear(); await exportPDF(project);
  expect(canvasCurve).toHaveBeenCalledWith(287.5, -212.5, 487.5, 387.5);
  exportDXF(project);
  const dxf = await downloaded.at(-1)!.text();
  expect((dxf.match(/\nLWPOLYLINE\n/g) ?? []).length).toBe(4); // one joined curve outline + 3 straight walls
});

it('keeps large room schedules above the title block and repeats headings', async () => {
  const project = benchmarkProject('large'), floor = project.floors[0], extra = project.floors[1];
  extra.walls.forEach(w => { w.start.x += 2200; w.end.x += 2200; });
  floor.walls.push(...extra.walls); floor.rooms.push(...extra.rooms);
  floor.rooms.forEach((room, i) => { room.name = `Suite ${i + 1}`; });
  await exportPDF(project);
  const rows = pdfText.mock.calls.filter(call => /^Suite /.test(call[0]));
  expect(rows).toHaveLength(32);
  expect(rows.every(call => call[2] >= 38 && call[2] < 174)).toBe(true);
  expect(pdfText.mock.calls.filter(call => call[0] === 'Room Schedule')).toHaveLength(3);
  const total = pdfText.mock.calls.find(call => call[0] === 'TOTAL')!;
  expect(total[2]).toBeLessThan(174);
});

it('does not probe unrelated canvases when exporting the optional 3D page', async () => {
  const unrelated = { getContext: vi.fn(() => { throw new Error('Must not probe'); }) };
  document.querySelectorAll = vi.fn(() => [unrelated]) as never;
  await exportPDF(namedProject());
  expect(unrelated.getContext).not.toHaveBeenCalled();
  expect(pdfText.mock.calls.some(call => call[0] === '3D Perspective View')).toBe(false);
});
it('skips a lost main 3D context', async () => {
  const toDataURL = vi.fn();
  document.querySelector = vi.fn(() => ({width:100,height:100,getContext:()=>({isContextLost:()=>true}),toDataURL})) as never;
  await exportPDF(namedProject());
  expect(toDataURL).not.toHaveBeenCalled();
  expect(pdfText.mock.calls.some(call => call[0] === '3D Perspective View')).toBe(false);
});

it('does not capture a viewport for an empty project floor', async () => {
 const project=namedProject(); project.floors[0].walls=[];
 expect(await exportAsPNG(canvas, project)).toBe(false);
 expect(downloaded).toHaveLength(0);
});

it('reports whether an SVG or DXF was downloaded so the editor can explain an empty floor', () => {
 expect(exportAsSVG(namedProject())).toBe(true); expect(downloaded).toHaveLength(1);
 const empty = namedProject(); empty.floors[0].walls = [];
 expect(exportAsSVG(empty)).toBe(false); expect(exportDXF(empty)).toBe('empty');
 const floorless = namedProject(); floorless.floors = [];
 expect(exportAsSVG(floorless)).toBe(false); expect(exportDXF(floorless)).toBe('empty');
 expect(downloaded).toHaveLength(1);
});

it('tells an empty floor from one holding only entourage CAD cannot draw, which SVG still exports', () => {
  const project = roomProject(), floor = project.floors[0];
  floor.walls = [];
  project.customEntourage = [{ id: 'photo', name: 'Photo', dataUrl: 'data:image/png;base64,AAAA', aspect: 1 }];
  const item = { position: { x: 0, y: 0 }, width: 100, rotation: 0 };
  for (const entourage of [[{ ...item, id: 'upload', defId: 'photo' }], [{ ...item, id: 'clear', defId: 'person', opacity: 0 }]]) {
    floor.entourage = entourage;
    expect(exportDXF(project)).toBe('unsupported');
    expect(exportDWG(project)).toBe('unsupported');
    expect(downloaded).toHaveLength(0);
    exportDXFWithFeedback(project);
    expect(get(exportNotice)).toEqual({ title: 'exportNotice.dxfTitle', message: 'exportNotice.dxfUnsupported' });
    exportDWGWithFeedback(project);
    expect(get(exportNotice)).toEqual({ title: 'exportNotice.dwgErrorTitle', message: 'exportNotice.dwgUnsupported' });
    expect(exportAsSVG(project)).toBe(true);
    expect(downloaded.splice(0).map(blob => blob.type)).toEqual(['image/svg+xml']);
  }
  // Entourage no export can draw leaves the floor empty; a faint built-in symbol is CAD linework.
  floor.entourage = [{ ...item, id: 'missing', defId: 'unknown' }];
  expect(exportDXF(project)).toBe('empty');
  exportDWGWithFeedback(project);
  expect(get(exportNotice)?.message).toBe('exportNotice.dwgEmpty');
  floor.entourage = [{ ...item, id: 'faint', defId: 'person', opacity: 0.25 }];
  exportDWGWithFeedback(project);
  expect(get(exportNotice)?.message).toBe('exportNotice.dwgFallback');
  expect(downloaded.map(blob => blob.type)).toEqual(['application/dxf']);
});

it('frames an oversized rotated furniture symbol consistently in PNG and PDF', async()=>{
 const project=namedProject();project.floors[0].furniture=[{id:'large',catalogId:'unknown',position:{x:-600,y:-600},rotation:45,width:800,depth:300,scale:{x:1,y:1,z:1}}];
 await exportAsPNG(null,project);const size={width:canvas.width,height:canvas.height};
 expect(size.width).toBeGreaterThan(3000);
 await exportPDF(project);expect({width:canvas.width,height:canvas.height}).toEqual(size);
});

it('exports rotated multiline text annotations in all plan formats', async()=>{
 const project=namedProject(),floor=project.floors[0];
 floor.textAnnotations=[{id:'note',x:-800,y:-500,text:'Saved <note>\nSecond line',fontSize:24,color:'#123456',rotation:30}];
 await exportAsPNG(null,project);expect(canvasText.mock.calls.map(c=>c[0])).toContain('Saved <note>');
 canvasText.mockClear();await exportPDF(project);expect(canvasText.mock.calls.map(c=>c[0])).toContain('Second line');
 exportAsSVG(project);const svg=await downloaded.at(-1)!.text();
 expect(svg).toContain('Saved &lt;note&gt;');expect(svg).toContain('<tspan');expect(svg).toContain('rotate(30');
 exportDXF(project);const dxf=await downloaded.at(-1)!.text();
 expect(dxf).toContain('Saved <note>');expect(dxf).toContain('Second line');expect(dxf).toContain('TEXT_123456');
 expect(dxf).toMatch(/\n420\n1193046\n/);
});
it('includes saved dimension labels in PNG, PDF, SVG and DXF',async()=>{
 const project=namedProject();project.floors[0].annotations=[{id:'dim',x1:-600,y1:-400,x2:-200,y2:-400,offset:-200,label:'Saved dimension'}];
 await exportAsPNG(null,project);expect(canvasText.mock.calls.map(c=>c[0])).toContain('Saved dimension');
 canvasText.mockClear();await exportPDF(project);expect(canvasText.mock.calls.map(c=>c[0])).toContain('Saved dimension');
 exportAsSVG(project);expect(await downloaded.at(-1)!.text()).toContain('Saved dimension');
 exportDXF(project);expect(await downloaded.at(-1)!.text()).toContain('Saved dimension');
});
it('exports standalone measurement labels in all formats and frames outside endpoints',async()=>{
 const project=namedProject();project.floors[0].measurements=[{id:'measure',x1:-1000,y1:-600,x2:-600,y2:-600}];
 await exportAsPNG(null,project);expect(canvasText.mock.calls.map(c=>c[0])).toContain('4 m');expect(canvas.width).toBeGreaterThan(3000);
 canvasText.mockClear();await exportPDF(project);expect(canvasText.mock.calls.map(c=>c[0])).toContain('4 m');
 exportAsSVG(project);const svg=await downloaded.at(-1)!.text();expect(svg).toContain('4 m</text>');expect(svg).toContain('<circle');
 exportDXF(project);const dxf=await downloaded.at(-1)!.text();expect(dxf).toContain('MEASUREMENTS');expect(dxf).toContain('4 m');
});
it.each([[304.8, "10'"], [23.8*2.54, "2'"]])('uses imperial units for a %s cm measurement',async(length,label)=>{
 const {get}=await import('svelte/store');const {projectSettings}=await import('$lib/stores/settings');const previous=get(projectSettings);
 try {
  projectSettings.set({...previous,units:'imperial'});
  const project=namedProject();project.floors[0].measurements=[{id:'feet',x1:0,y1:0,x2:length as number,y2:0}];
  await exportAsPNG(null,project);expect(canvasText.mock.calls.map(c=>c[0])).toContain(label);
  canvasText.mockClear();await exportPDF(project);expect(canvasText.mock.calls.map(c=>c[0])).toContain(label);
  exportAsSVG(project);expect(await downloaded.at(-1)!.text()).toContain(String(label).replace("'", '&apos;')+'</text>');
  exportDXF(project);expect(await downloaded.at(-1)!.text()).toContain(label);
 } finally {projectSettings.set(previous);}
});


it.each([false, true])('exports missing-catalog furniture with shared dimensions (saved=%s)', async saved => {
  const project = roomProject(), floor = project.floors[0];
  floor.walls = []; floor.rooms = []; floor.doors = []; floor.windows = [];
  floor.furniture = [{ id: 'missing', catalogId: 'unavailable-model', position: { x: 100, y: 200 },
    rotation: 30, scale: { x: -2, y: 0.5, z: 1 },
    ...(saved ? { width: 160, depth: 80 } : {}) }];
  const before = structuredClone(project);
  const width = saved ? 320 : 100, depth = saved ? 40 : 25;
  exportAsSVG(project);
  const svg = await downloaded.at(-1)!.text();
  expect(svg).toContain(`data-width="${width}" data-depth="${depth}"`);
  expect(svg).toContain('Unknown furniture');
  await exportAsPNG(canvas, project);
  expect(canvasCurve).toHaveBeenCalledWith(width/2,-depth/2,width/2,expect.any(Number));
  expect(canvasText.mock.calls.map(c => c[0])).toContain('Unknown furniture');
  canvasRect.mockClear(); canvasCurve.mockClear(); canvasText.mockClear();
  await exportPDF(project);
  expect(canvasCurve).toHaveBeenCalledWith(width/2,-depth/2,width/2,expect.any(Number));
  expect(canvasText.mock.calls.map(c => c[0])).toContain('Unknown furniture');
  exportDXF(project);
  const dxf = await downloaded.at(-1)!.text();
  expect(dxf).toContain('Unknown furniture');
  const lines = dxf.trim().split(/\r?\n/);
  const pairs = Array.from({ length: lines.length / 2 }, (_, i) => [lines[i*2].trim(), lines[i*2+1].trim()]);
  const start = pairs.findIndex(([code, value]) => code === '0' && value === 'LWPOLYLINE');
  expect(start).toBeGreaterThan(-1);
  const vertices: { x: number; y: number }[] = [];
  for (let i = start + 1; i < pairs.length && pairs[i][0] !== '0'; i++) {
    if (pairs[i][0] === '10') vertices.push({ x: Number(pairs[i][1]), y: Number(pairs[i+1][1]) });
  }
  const angle = Math.PI / 6;
  for (const [i, [x, y]] of [[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]].entries()) {
    expect(vertices[i].x).toBeCloseTo(100 + x*Math.cos(angle)-y*Math.sin(angle));
    expect(vertices[i].y).toBeCloseTo(-200 - x*Math.sin(angle)-y*Math.cos(angle));
  }
  expect(project).toEqual(before);
});

it('labels placed custom models with their saved name in SVG, DXF, PNG and PDF, as the editor does', async () => {
  const source = roomProject(), floor = source.floors[0];
  floor.walls = []; floor.rooms = []; floor.doors = []; floor.windows = [];
  source.customModels = [{ id: 'credenza', name: 'Walnut & Oak <Credenza>', assetName: 'credenza.glb', sourceFilename: 'Credenza.glb',
    sha256: 'a'.repeat(64), byteLength: 20, width: 123.5, depth: 67, height: 89 }];
  const project = placeCustomModel(source, 'credenza', { x: 100, y: 200 });
  const before = structuredClone(project);
  const svgs: string[] = [];
  for (const language of ['en', 'pt'] as const) {
    exportAsSVG(project, language);
    const svg = await downloaded.at(-1)!.text();
    expect(svg).toContain('>Walnut &amp; Oak &lt;Credenza&gt;</text>');
    expect(svg).not.toContain('Unknown furniture');
    svgs.push(svg);
    exportDXF(project, language);
    const dxf = await downloaded.at(-1)!.text();
    const lines = dxf.trim().split(/\r?\n/).map(line => line.trim());
    const entities: Record<string, string>[] = []; let entity: Record<string, string> = {};
    for (let i = 0; i < lines.length; i += 2) {
      if (lines[i] === '0') { entity = {}; entities.push(entity); }
      entity[lines[i]] = lines[i + 1];
    }
    const label = entities.find(e => e['0'] === 'TEXT' && e['1'] === 'Walnut & Oak <Credenza>');
    expect(label?.['8']).toBe('FURNITURE');
    expect([label?.['10'], label?.['20']]).toEqual(['100', '-200']);
    expect(dxf).not.toContain('Unknown furniture');
  }
  // User-authored names are retained verbatim in every interface language.
  expect(svgs[1]).toBe(svgs[0]);
  for (const render of [() => exportAsPNG(null, project), () => exportPDF(project, 'pt')]) {
    canvasText.mockClear();
    await render();
    const captions = canvasText.mock.calls.map(call => call[0]);
    expect(captions).toContain('Walnut & Oak <Credenza>');
    expect(captions).not.toContain('Unknown furniture');
  }
  expect(project).toEqual(before);
});

it('frames a long custom-model caption in SVG, PNG and PDF instead of clipping it at the edge', async () => {
  // Text advance in proportion to length and font size, as in a monospaced font.
  let font = '10px sans-serif';
  const context = new Proxy({ measureText: (text: string) => ({ width: text.length * Number(/([\d.]+)px/.exec(font)![1]) * 0.5 }) }, {
    get: (target, key) => key === 'font' ? font : target[key as keyof typeof target] ?? (() => {}),
    set: (_, key, value) => { if (key === 'font') font = value; return true; },
  });
  canvas.getContext = (() => context) as never;
  const source = roomProject();
  source.floors[0].walls = [];
  const name = 'Mid-century walnut sideboard with brass handles (living room)';
  source.customModels = [{ id: 'sideboard', name, assetName: 'sideboard.glb', sourceFilename: `${name}.glb`,
    sha256: 'b'.repeat(64), byteLength: 20, width: 60, depth: 60, height: 80 }];
  const project = placeCustomModel(source, 'sideboard', { x: 100, y: 200 });
  // A 60 cm symbol takes the largest caption font, 0.7 × 12 units, so the name is far wider than the symbol.
  const ink = name.length * 12 * 0.7 * 0.5;
  exportAsSVG(project);
  const svg = await downloaded.at(-1)!.text();
  const width = Number(/viewBox="0 0 ([\d.]+) /.exec(svg)![1]);
  const x = Number(/data-width="60" data-depth="60" transform="translate\(([\d.]+),/.exec(svg)![1]);
  expect(svg).toContain(`>${name}</text>`);
  // The caption keeps the SVG's 50-unit margin on both sides.
  expect(x - ink / 2).toBeCloseTo(50);
  expect(width - x - ink / 2).toBeCloseTo(50);
  await exportAsPNG(null, project);
  const raster = { width: canvas.width, height: canvas.height };
  expect(raster.width).toBe(Math.ceil((ink + 2 * 80) * 2));
  await exportPDF(project);
  expect({ width: canvas.width, height: canvas.height }).toEqual(raster);
});

it('keeps DXF tags paired and the SVG well-formed when saved text holds line breaks or control characters', async () => {
  const source = roomProject(), floor = source.floors[0];
  floor.rooms = resolveRooms(floor).map(room => ({ ...room, name: 'Living\r\nroom\u0007' }));
  floor.textAnnotations = [{ id: 'note', x: 200, y: 100, text: 'First line\r\nSecond\u0000 line', fontSize: 16, color: '#123456', rotation: 0 }];
  floor.annotations = [{ id: 'dim', x1: 0, y1: 400, x2: 300, y2: 400, offset: 40, label: 'Saved\ndimension\u001b' }];
  source.customModels = [{ id: 'credenza', name: 'Walnut\nCredenza\u0007', assetName: 'credenza.glb', sourceFilename: 'Credenza.glb',
    sha256: 'a'.repeat(64), byteLength: 20, width: 123.5, depth: 67, height: 89 }];
  const project = placeCustomModel(source, 'credenza', { x: 200, y: 150 });
  project.floors[0].furniture[0].color = '#654321\u0007';
  const before = structuredClone(project);
  exportDXF(project);
  // CAD readers take every other line as an integer group code, whichever line ending they split on.
  const lines = (await downloaded.at(-1)!.text()).split(/\r\n|\r|\n/);
  expect(lines.length % 2).toBe(0);
  expect(lines.filter((_, i) => i % 2 === 0).every(code => /^\s*\d+$/.test(code))).toBe(true);
  const values = lines.filter((_, i) => i % 2 === 1);
  expect(values).toEqual(expect.arrayContaining(['Living room', 'First line ', 'Second line', 'Saved dimension', 'Walnut Credenza']));
  expect(values.join('')).not.toMatch(/\p{Cc}/u);
  exportAsSVG(project);
  const svg = await downloaded.at(-1)!.text();
  // XML 1.0 has no representation for these, so a viewer would reject the whole file.
  expect(svg).not.toMatch(/[\0-\x08\x0B\x0C\x0E-\x1F]/);
  expect(svg).toContain('>Walnut\nCredenza</text>');
  expect(svg).toContain('>Living\r\nroom</text>');
  expect(svg).toContain('#654321');
  expect(project).toEqual(before);
});


it('draws detailed catalog furniture in both raster exports with readable mirrored captions', async () => {
  const project=roomProject(), floor=project.floors[0];
  floor.walls=[];floor.rooms=[];floor.doors=[];floor.windows=[];
  floor.furniture=[{id:'chair',catalogId:'chair',position:{x:100,y:200},rotation:30,scale:{x:-1,y:1,z:1}}];
  const before=structuredClone(project);
  for(const render of [()=>exportAsPNG(canvas,project),async()=>await exportPDF(project)]) {
    canvasCurve.mockClear();canvasText.mockClear();
    await render();
    expect(canvasCurve.mock.calls.length).toBeGreaterThan(4); // back, seat and arms, not a single rectangle
    expect(canvasText.mock.calls.map(call=>call[0])).toContain('Armchair');
    expect(project).toEqual(before);
  }
});


it.each(['straight','l-shaped','u-shaped','spiral'] as const)('draws %s stairs in all plan formats even without walls', async stairType => {
  const project=roomProject(),floor=project.floors[0];
  floor.walls=[];floor.rooms=[];floor.furniture=[];floor.doors=[];floor.windows=[];
  floor.stairs=[{id:'stair',position:{x:-600,y:700},width:120,depth:300,rotation:37,stairType,riserCount:15,direction:'down'}];
  const before=structuredClone(project);
  const label=stairType==='straight'||stairType==='spiral'?'DN':`DN (${stairType})`;
  await exportAsPNG(canvas,project);
  expect(canvasText.mock.calls.map(c=>c[0])).toContain(label);expect(downloaded).toHaveLength(1);
  canvasText.mockClear();
  await exportPDF(project);
  expect(canvasText.mock.calls.map(c=>c[0])).toContain(label);expect(pdfSave).toHaveBeenCalledOnce();
  exportAsSVG(project);
  const svg=await downloaded.at(-1)!.text();
  expect(svg).toContain('data-stair="stair"');expect(svg).toContain(label);
  expect(svg).toContain('rotate(37)');expect(svg).not.toMatch(/NaN|Infinity|<image/);
  exportDXF(project);
  const dxf=await downloaded.at(-1)!.text();expect(dxf).toContain('STAIRS');expect(dxf).toContain(label);
  expect(dxf).not.toMatch(/NaN|Infinity/);
  expect(project).toEqual(before);
});

it('exports an entourage-only SVG with vector symbols and embedded custom images',async()=>{
 const project=roomProject(),floor=project.floors[0];floor.walls=[];floor.rooms=[];floor.furniture=[];floor.doors=[];floor.windows=[];
 project.customEntourage=[{id:'custom',name:'Custom',dataUrl:'data:image/png;base64,AAAA',aspect:2}];
 floor.entourage=[{id:'vector',defId:'car-sedan',position:{x:-1000,y:-1000},width:460,rotation:30,opacity:.4},{id:'image',defId:'custom',position:{x:1000,y:1000},width:200,rotation:-45,opacity:.7},{id:'missing',defId:'unknown',position:{x:0,y:0},width:50,rotation:0}];
 const before=structuredClone(project);exportAsSVG(project);const svg=await downloaded[0].text();
 expect(svg).toContain('data-entourage="vector"');expect(svg).toContain('opacity="0.4"');expect(svg).toContain('rotate(30)');
 expect(svg).toContain('href="data:image/png;base64,AAAA"');expect(svg).toContain('width="200" height="400"');expect(svg).toContain('preserveAspectRatio="none"');
 expect(svg).not.toContain('data-entourage="missing"');expect(svg).not.toMatch(/NaN|Infinity/);expect(project).toEqual(before);
});
it('freezes PDF plan and optional 3D capture before awaiting a custom image',async()=>{
 let image:EventTarget & {complete:boolean;naturalWidth:number};
 vi.stubGlobal('Image',class extends EventTarget {complete=false;naturalWidth=0;constructor(){super();image=this;}});
 const source={width:100,height:100,getContext:()=>({isContextLost:()=>false}),toDataURL:vi.fn(()=>'data:image/png;base64,'+'A'.repeat(200))};
 document.querySelector=vi.fn(()=>source) as never;
 const project=namedProject();project.customEntourage=[{id:'pdf-snapshot',name:'test',dataUrl:'data:image/png;base64,AAAA',aspect:1}];
 project.floors[0].entourage=[{id:'e',defId:'pdf-snapshot',position:{x:1000,y:1000},width:100,rotation:0}];
 const name=project.name,pending=exportPDF(project);expect(source.toDataURL).toHaveBeenCalledOnce();expect(pdfSave).not.toHaveBeenCalled();
 project.name='Later edit';project.floors[0].entourage=[];
 image!.naturalWidth=50;image!.dispatchEvent(new Event('load'));await pending;
 expect(pdfSave).toHaveBeenCalledWith(`${name}.pdf`);expect(source.toDataURL).toHaveBeenCalledOnce();
});
