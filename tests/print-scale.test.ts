import { expect, it, vi } from 'vitest';
import { calculatePrintLayout, printBounds, type PrintOptions } from '$lib/utils/printLayout';
import { createPrintPDF, renderPrintPage } from '$lib/utils/scaledPrint';
import { roomProject } from './fixtures/project';
import { resolveRooms } from '$lib/utils/roomDetection';
import { placeCustomModel } from '$lib/services/customModels';
import { recordingContext } from './fixtures/recording-context';

const options: PrintOptions = { pageSize: 'a4', orientation: 'landscape', scale: 50 };
const bounds = { minX: 0, minY: 0, maxX: 1000, maxY: 500 };

it('preserves a long edited room name across PDF schedule pages', () => {
  const project = roomProject(), floor = project.floors[0];
  floor.rooms = [{ ...resolveRooms(floor)[0], name: 'Room section '.repeat(500) + 'END-ROOM-NAME' }];
  const canvas = { getContext: () => null, toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=' } as unknown as HTMLCanvasElement;
  const pdf = createPrintPDF(canvas, project, options);
  expect(pdf.getNumberOfPages()).toBeGreaterThan(2);
  expect(pdf.output()).toContain('END-ROOM-NAME');
});

it.each([25, 50, 100, 200] as const)('prints one metre at the actual 1:%s scale', scale => {
  const layout = calculatePrintLayout(bounds, { ...options, scale });
  expect(100 * layout.mmPerCm).toBeCloseTo(1000 / scale);
});

it('keeps numeric scale fixed when changing paper or orientation', () => {
  for (const pageSize of ['letter', 'a4'] as const) for (const orientation of ['portrait', 'landscape'] as const) {
    expect(calculatePrintLayout(bounds, { ...options, pageSize, orientation }).mmPerCm).toBe(0.2);
  }
});

it('detects overflow instead of silently shrinking the plan', () => {
  const fixed = calculatePrintLayout(bounds, { ...options, scale: 25 });
  expect(fixed.fits).toBe(false);
  expect(fixed.mmPerCm).toBe(0.4);
  const fit = calculatePrintLayout(bounds, { ...options, scale: 'fit' });
  expect(fit.fits).toBe(true);
  expect(fit.scaleLabel).toBe('Fit to page');
});

it('bounds include wall thickness, curved walls, mirrored furniture, and no-wall drawings', () => {
  const floor = roomProject().floors[0];
  floor.walls[0].curvePoint = { x: -300, y: -300 };
  expect(printBounds(floor)?.minX).toBeLessThan(-300);
  floor.walls = [];
  expect(printBounds(floor)).toBeNull();
  floor.furniture = [{ id: 'f', catalogId: 'sofa', position: { x: 0, y: 0 }, width: 200, depth: 100, rotation: 90, scale: { x: -1, y: 1, z: 1 } }];
  const b = printBounds(floor)!;
  expect(b.maxX - b.minX).toBeCloseTo(100);
  expect(b.maxY - b.minY).toBeCloseTo(200);
});

it('renders a 10m wall as 200mm and embeds the same page at exact PDF dimensions', () => {
  const project = roomProject();
  project.floors[0].walls = [{ ...project.floors[0].walls[0], start: { x: 0, y: 0 }, end: { x: 1000, y: 0 } }];
  const moveTo = vi.fn(), lineTo = vi.fn();
  const context = new Proxy({ moveTo, lineTo, measureText: () => ({ width: 30 }) }, { get: (o, k) => o[k as keyof typeof o] ?? (() => {}) });
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
  const canvas = { width: 0, height: 0, getContext: () => context, toDataURL: () => png } as unknown as HTMLCanvasElement;
  const layout = renderPrintPage(canvas, project, options)!;
  expect(layout.fits).toBe(true);
  expect(lineTo.mock.calls[0][0] - moveTo.mock.calls[0][0]).toBeCloseTo(200 * 6);
  const pdf = createPrintPDF(canvas, project, options);
  expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(297);
  expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(210);
  expect(pdf.output()).toContain('/Subtype /Image');
  const imageMatrix = pdf.output().match(/([\d.]+) 0 0 ([\d.]+) [\d.]+ [\d.]+ cm/)!;
  expect(Number(imageMatrix[1]) * 25.4 / 72).toBeCloseTo(297, 6);
  expect(Number(imageMatrix[2]) * 25.4 / 72).toBeCloseTo(210, 6);
  expect(() => createPrintPDF(canvas, project, { ...options, scale: 25 })).toThrow('does not fit');
});

it('localizes the printed sheet and schedule without changing scale or room data', () => {
  const project = roomProject();
  project.name = 'My {value} project';
  project.floors[0].rooms = [{ ...resolveRooms(project.floors[0])[0], name: 'Original room name', floorTexture: 'none' }];
  const before = JSON.stringify(project);
  const fillText = vi.fn();
  const context = new Proxy({ fillText, measureText: () => ({ width: 30 }) }, { get: (o, k) => o[k as keyof typeof o] ?? (() => {}) });
  const canvas = { width: 0, height: 0, getContext: () => context, toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=' } as unknown as HTMLCanvasElement;
  const english = renderPrintPage(canvas, project, options)!;
  fillText.mockClear();
  const portuguese = renderPrintPage(canvas, project, options, 'pt')!;
  expect(portuguese).toEqual(english);
  expect(fillText.mock.calls.some(call => call[0] === 'Escala: 1:50')).toBe(true);
  expect(fillText.mock.calls.some(call => call[0] === project.name)).toBe(true);
  const footer = fillText.mock.calls.find(call => String(call[0]).startsWith('OpenPlan3D'))!;
  expect(footer[0]).toContain('Imprima em 100%');
  expect(footer[3]).toBe(portuguese.pageWidth - 24);
  const pdf = createPrintPDF(canvas, project, options, 'pt');
  expect(pdf.output()).toContain('Tabela de ambientes');
  expect(pdf.output()).toContain('Original room name');
  expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(english.pageWidth);
  expect(JSON.stringify(project)).toBe(before);
});

it('labels a placed custom model with its saved name on the printed sheet', () => {
  const source = roomProject();
  source.floors[0].walls = [];
  source.customModels = [{ id: 'armchair', name: 'Grandma {name} Armchair', assetName: 'armchair.glb', sourceFilename: 'armchair.glb',
    sha256: 'ab'.repeat(32), byteLength: 1024, width: 100, depth: 80, height: 90 }];
  const project = placeCustomModel(source, 'armchair', { x: 200, y: 150 });
  const before = JSON.stringify(project);
  const fillText = vi.fn();
  const context = new Proxy({ fillText, measureText: () => ({ width: 30 }) }, { get: (o, k) => o[k as keyof typeof o] ?? (() => {}) });
  const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
  for (const language of ['en', 'pt'] as const) {
    fillText.mockClear();
    renderPrintPage(canvas, project, options, language);
    const text = fillText.mock.calls.map(call => call[0]);
    expect(text).toContain('Grandma {name} Armchair');
    expect(text).not.toContain('Unknown furniture');
  }
  expect(JSON.stringify(project)).toBe(before);
});

it('keeps furniture captions inside the drawing area when fitted or at a fixed scale', () => {
  const source = roomProject();
  source.floors[0].walls = [];
  const name = 'Mid-century walnut sideboard with brass handles (living room)';
  source.customModels = [{ id: 'sideboard', name, assetName: 'sideboard.glb', sourceFilename: `${name}.glb`,
    sha256: 'cd'.repeat(32), byteLength: 1024, width: 60, depth: 60, height: 80 }];
  const project = placeCustomModel(source, 'sideboard', { x: 0, y: 0 });
  // A second item 20 m away makes the plan wide, so the sideboard sits at the sheet's left edge.
  project.floors[0].furniture.push({ id: 'far', catalogId: 'unknown-model', position: { x: 2000, y: 0 }, rotation: 0,
    scale: { x: 1, y: 1, z: 1 }, width: 60, depth: 60 });
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
  for (const scale of ['fit', 100] as const) {
    const { context, texts } = recordingContext();
    const canvas = { width: 0, height: 0, getContext: () => context, toDataURL: () => png } as unknown as HTMLCanvasElement;
    const layout = renderPrintPage(canvas, project, { ...options, scale })!;
    expect(layout.fits).toBe(true);
    // Canvas pixels per millimetre, as renderPrintPage scales the sheet.
    const px = canvas.width / layout.pageWidth, py = canvas.height / layout.pageHeight, { area } = layout;
    for (const caption of [name, 'Unknown furniture']) {
      for (const p of texts.find(text => text.text === caption)!.corners) {
        expect(p.x).toBeGreaterThanOrEqual(area.x * px - 1e-6); expect(p.x).toBeLessThanOrEqual((area.x + area.width) * px + 1e-6);
        expect(p.y).toBeGreaterThanOrEqual(area.y * py - 1e-6); expect(p.y).toBeLessThanOrEqual((area.y + area.height) * py + 1e-6);
      }
    }
    expect(createPrintPDF(canvas, project, { ...options, scale }).internal.pageSize.getWidth()).toBeCloseTo(layout.pageWidth);
  }
});
