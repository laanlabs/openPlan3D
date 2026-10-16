import { expect, it } from 'vitest';
import type { FurnitureItem } from '$lib/models/types';
import { drawFurnitureItem } from '$lib/utils/canvasRenderer';
import { furnitureCaptionBounds, furnitureCaptionLayout } from '$lib/utils/furnitureCaption';
import { recordingContext } from './fixtures/recording-context';

const base: FurnitureItem = { id: 'item', catalogId: 'unknown-model', position: { x: 120, y: -40 }, rotation: 0, scale: { x: 1, y: 1, z: 1 }, width: 90, depth: 60 };

it.each([
  ['a long custom-model name', {}, 'Mid-century walnut sideboard with brass handles (living room)', 1],
  ['a rotated, mirrored catalog sofa on a printed sheet', { catalogId: 'sofa', width: undefined, depth: undefined, rotation: 30, scale: { x: -1, y: 1.5, z: 1 } }, undefined, 3.6],
  ['a quarter-turned unknown item at a small scale', { rotation: 90 }, undefined, 0.6],
  ['an item turned past half a turn', { rotation: -135, width: 300, depth: 140 }, 'Corner unit', 1],
] as const)('measures the caption drawFurnitureItem draws for %s', (_, overrides, caption, zoom) => {
  const item = { ...base, ...overrides } as FurnitureItem;
  const { context, texts } = recordingContext();
  drawFurnitureItem({ ctx: context, width: 0, height: 0, zoom, camX: 0, camY: 0 }, item, false, caption);
  // The caption is the last text drawn; canvas units are zoom × plan centimetres here.
  const drawn = texts.at(-1)!;
  expect(drawn.text).toBe(caption ?? (item.catalogId === 'sofa' ? 'Sofa' : 'Unknown furniture'));
  expect([drawn.align, drawn.baseline]).toEqual(['center', 'middle']);
  expect(drawn.font).toBe(`${furnitureCaptionLayout(item, zoom)!.size}px sans-serif`);
  const bounds = furnitureCaptionBounds(item, caption, recordingContext().context, zoom)!;
  const xs = drawn.corners.map(p => p.x / zoom), ys = drawn.corners.map(p => p.y / zoom);
  expect(bounds.minX).toBeCloseTo(Math.min(...xs), 9); expect(bounds.maxX).toBeCloseTo(Math.max(...xs), 9);
  expect(bounds.minY).toBeCloseTo(Math.min(...ys), 9); expect(bounds.maxY).toBeCloseTo(Math.max(...ys), 9);
});

it('reports no caption where drawFurnitureItem draws none', () => {
  const item = { ...base, width: 30, depth: 30 };
  const { context, texts } = recordingContext();
  drawFurnitureItem({ ctx: context, width: 0, height: 0, zoom: 0.5, camX: 0, camY: 0 }, item, false, 'Too small to label');
  expect(texts).toHaveLength(0);
  expect(furnitureCaptionLayout(item, 0.5)).toBeNull();
  expect(furnitureCaptionBounds(item, 'Too small to label', recordingContext().context, 0.5)).toBeNull();
  expect(furnitureCaptionLayout(item)).not.toBeNull();
});
