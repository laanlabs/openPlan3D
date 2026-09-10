import { expect, it } from 'vitest';
import { planContentBounds, hasPlanContent } from '$lib/utils/planContentBounds';
import type { Floor } from '$lib/models/types';

const context = { save() {}, restore() {}, measureText(text: string) { return { width: text.length * 10 }; } } as unknown as CanvasRenderingContext2D;
const options = { context, entourageAspect: () => 2 };
const empty = () => ({ walls: [], furniture: [], stairs: [], columns: [], entourage: [], measurements: [], annotations: [], textAnnotations: [] }) as unknown as Floor;

it('returns null for an empty floor', () => expect(planContentBounds(empty(), options)).toBeNull());
it('frames rotated stairs without walls', () => {
  const floor = empty();
  floor.stairs = [{ position: { x: 1000, y: -1000 }, width: 100, depth: 300, rotation: 90, stairType: 'straight' }] as Floor['stairs'];
  const before = structuredClone(floor);
  expect(planContentBounds(floor, options)).toEqual({ minX: 850, maxX: 1150, minY: -1050, maxY: -950 });
  expect(floor).toEqual(before);
});
it('includes unknown furniture with explicit dimensions', () => {
  const floor = empty();
  floor.furniture = [{ catalogId: 'unknown', position: { x: 0, y: 0 }, width: 100, depth: 200, rotation: 0 }] as Floor['furniture'];
  expect(planContentBounds(floor, options)).toEqual({ minX: -50.25, maxX: 50.25, minY: -100.25, maxY: 100.25 });
});
it('includes custom entourage aspect and rotation', () => {
  const floor = empty();
  floor.entourage = [{ defId: 'custom', position: { x: 0, y: 0 }, width: 100, rotation: 90 }] as Floor['entourage'];
  const b = planContentBounds(floor, options)!;
  expect(b.maxX).toBeCloseTo(100); expect(b.maxY).toBeCloseTo(50);
});
it('includes measurement and offset dimension endpoints', () => {
  const floor = empty();
  floor.measurements = [{ x1: -100, y1: -200, x2: 0, y2: 0 }] as Floor['measurements'];
  floor.annotations = [{ x1: 0, y1: 0, x2: 100, y2: 0, offset: 500 }] as Floor['annotations'];
  const bounds = planContentBounds(floor, options)!;
  expect(bounds.minX).toBeLessThan(-100); expect(bounds.maxX).toBeGreaterThan(100);
  expect(bounds.minY).toBeLessThan(-200); expect(bounds.maxY).toBeGreaterThan(500);
  expect(planContentBounds(floor, { ...options, measurementsVisible: false, dimensionsVisible: false })).toBeNull();
});
it('includes text-only floors and loaded rotated backgrounds', () => {
  const floor = empty();
  floor.textAnnotations = [{ x: 4000, y: -3000, text: 'Far note', fontSize: 20, rotation: 0 }] as Floor['textAnnotations'];
  expect(planContentBounds(floor, options)!.minX).toBeLessThan(4000);
  floor.textAnnotations = [];
  floor.backgroundImage = { position: { x: 10, y: 20 }, scale: 2, rotation: 90 } as Floor['backgroundImage'];
  const b = planContentBounds(floor, { ...options, backgroundSize: { width: 100, height: 200 } })!;
  expect(b.minX).toBeCloseTo(-190); expect(b.maxY).toBeCloseTo(120);
});

it('recognizes non-wall content for empty-state and minimap visibility', () => {
  expect(hasPlanContent(empty())).toBe(false);
  for (const key of ['stairs', 'columns', 'entourage', 'measurements', 'annotations', 'textAnnotations'] as const) {
    const floor = empty();
    (floor as any)[key] = [{}];
    expect(hasPlanContent(floor)).toBe(true);
  }
  expect(hasPlanContent({ ...empty(), backgroundImage: {} } as Floor)).toBe(true);
});

it('includes moved room labels and their minimum screen-size height only when supplied', () => {
  const floor = empty();
  const room = { id: 'room', name: 'Moved room', area: 1, labelOffset: { x: 3000, y: -2000 } } as any;
  const polygon = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
  const before = structuredClone(room);
  expect(planContentBounds(floor, options)).toBeNull();
  const normal = planContentBounds(floor, { ...options, roomLabels: [{ room, polygon }], zoom: 1 })!;
  const distant = planContentBounds(floor, { ...options, roomLabels: [{ room, polygon }], zoom: .1 })!;
  expect(normal.minX).toBeLessThan(3050); expect(normal.maxX).toBeGreaterThan(3050);
  expect(normal.maxY).toBeLessThan(-1900);
  expect(distant.maxY - distant.minY).toBeGreaterThan(normal.maxY - normal.minY);
  expect(room).toEqual(before);
});

it('includes long dimension captions at their minimum screen size', () => {
  const floor = empty();
  floor.annotations = [{ x1: 0, y1: 0, x2: 100, y2: 0, offset: 0, label: 'Long dimension caption' }] as Floor['annotations'];
  const normal = planContentBounds(floor, options)!;
  const small = planContentBounds(floor, { ...options, zoom: .01 })!;
  expect(small.maxX - small.minX).toBeGreaterThan((normal.maxX - normal.minX) * 50);
});

it('includes automatic wall dimensions on both possible display sides at low zoom', () => {
  const floor = empty();
  floor.walls = [{ id: 'wall', start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, thickness: 20 }] as Floor['walls'];
  const before = structuredClone(floor);
  const hidden = planContentBounds(floor, options)!;
  const shown = planContentBounds(floor, { ...options, zoom: .01,
    automaticDimensions: { external: true, internal: false, edge: false } })!;
  expect(shown.minY).toBeLessThan(-2000); expect(shown.maxY).toBeGreaterThan(2000);
  expect(shown.minX).toBeLessThan(hidden.minX); expect(shown.maxX).toBeGreaterThan(hidden.maxX);
  expect(floor).toEqual(before);
});

it('includes internal room dimensions independently of room-name labels', () => {
  const polygon = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
  const floor = empty();
  const bounds = planContentBounds(floor, { ...options, zoom: .01,
    automaticDimensions: { external: false, internal: true, edge: false },
    dimensionRooms: [{ room: {} as any, polygon }] })!;
  expect(bounds.maxY).toBeGreaterThan(1300);
  expect(bounds.maxX - bounds.minX).toBeGreaterThan(1000);
});

it('omits hidden note bounds without modifying the note or the default export bounds', () => {
  const floor=empty();
  floor.textAnnotations=[{id:'note',x:8000,y:-9000,text:'Hidden\nnote',fontSize:16,rotation:30,color:'#123456'}];
  const before=structuredClone(floor), visible=planContentBounds(floor,options);
  expect(visible).not.toBeNull();
  expect(planContentBounds(floor,{...options,textAnnotationsVisible:false})).toBeNull();
  expect(planContentBounds(floor,options)).toEqual(visible);
  expect(floor).toEqual(before);
});
