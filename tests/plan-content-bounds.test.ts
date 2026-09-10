import { expect, it } from 'vitest';
import { planContentBounds } from '$lib/utils/planContentBounds';
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
  expect(planContentBounds(floor, options)).toEqual({ minX: -100, maxX: 100, minY: -200, maxY: 500 });
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
