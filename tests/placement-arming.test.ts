import { beforeEach, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { placingColumn, placingColumnShape, placingEntourageId, placingFurnitureId, placingStair, selectedTool } from '$lib/stores/project';
import { toggleColumnPlacement, toggleStairPlacement } from '$lib/utils/placementArming';

const arming = () => ({ tool: get(selectedTool), stair: get(placingStair), column: get(placingColumn), shape: get(placingColumnShape), furniture: get(placingFurnitureId), entourage: get(placingEntourageId) });

beforeEach(() => {
  selectedTool.set('select'); placingStair.set(false); placingColumn.set(false); placingColumnShape.set('round');
  placingFurnitureId.set(null); placingEntourageId.set(null);
});

it('arms a stair for the select tool, drops furniture and entourage, and the same button cancels it', () => {
  selectedTool.set('wall'); placingFurnitureId.set('sofa'); placingEntourageId.set('tree');
  toggleStairPlacement();
  expect(arming()).toEqual({ tool: 'select', stair: true, column: false, shape: 'round', furniture: null, entourage: null });
  toggleStairPlacement();
  expect(arming()).toMatchObject({ tool: 'select', stair: false, column: false });
});

it('swaps the column shape while armed and cancels on the armed shape', () => {
  toggleColumnPlacement('round');
  expect(arming()).toMatchObject({ tool: 'select', stair: false, column: true, shape: 'round' });
  toggleColumnPlacement('square');
  expect(arming()).toMatchObject({ column: true, shape: 'square' });
  toggleColumnPlacement('square');
  expect(arming()).toMatchObject({ column: false, shape: 'square' });
});

it('never leaves a stair and a column armed together', () => {
  toggleStairPlacement(); toggleColumnPlacement('round');
  expect(arming()).toMatchObject({ stair: false, column: true });
  toggleStairPlacement();
  expect(arming()).toMatchObject({ stair: true, column: false });
});

it('switches the tool before arming, so a canvas that disarms on tool changes keeps the new arming', () => {
  // Mirrors the canvas's selectedTool subscription, which drops stair/column arming on every change.
  const unsubscribe = selectedTool.subscribe(() => { placingStair.set(false); placingColumn.set(false); });
  selectedTool.set('door');
  toggleStairPlacement();
  expect(arming()).toMatchObject({ tool: 'select', stair: true, column: false });
  selectedTool.set('wall');
  expect(get(placingStair)).toBe(false);
  toggleColumnPlacement('square');
  expect(arming()).toMatchObject({ tool: 'select', stair: false, column: true, shape: 'square' });
  unsubscribe();
});
