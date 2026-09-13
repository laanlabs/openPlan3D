import { beforeEach, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { addFloor, currentProject, jumpToUndoStep, loadProject, redo, undo, undoHistoryStore, updateFloorElevation, updateFloorSlabThickness } from '$lib/stores/project';
import { roomProject } from './fixtures/project';

beforeEach(() => loadProject(roomProject()));
const state = () => JSON.stringify(get(currentProject));

function edits() {
  const states = [state()];
  addFloor(undefined, 'empty');
  states.push(state());
  const floor = get(currentProject)!.activeFloorId;
  updateFloorElevation(floor, 410);
  states.push(state());
  updateFloorSlabThickness(floor, 24);
  states.push(state());
  return { states, entries: [...get(undoHistoryStore).entries] };
}

it('replays each jumped action with its original state, description and timestamp', () => {
  const { states, entries } = edits();
  jumpToUndoStep(0);
  expect(state()).toBe(states[0]);
  for (let i = 1; i < states.length; i++) {
    redo();
    expect(state()).toBe(states[i]);
    expect(get(undoHistoryStore).entries).toEqual(entries.slice(0, i));
  }
});

it('retains the existing redo tail when jumping back after Undo', () => {
  const { states, entries } = edits();
  undo();
  jumpToUndoStep(0);
  expect(state()).toBe(states[0]);
  for (let i = 1; i < states.length; i++) {
    redo();
    expect(state()).toBe(states[i]);
    expect(get(undoHistoryStore).entries).toEqual(entries.slice(0, i));
  }
});

it('ignores invalid or current indices without changing either history stack', () => {
  const { states, entries } = edits();
  undo();
  for (const index of [NaN, Infinity, -1, .5, 3, 2]) {
    jumpToUndoStep(index);
    expect(state()).toBe(states[2]);
    expect(get(undoHistoryStore).entries).toEqual(entries.slice(0, 2));
  }
  redo();
  expect(state()).toBe(states[3]);
  expect(get(undoHistoryStore).entries).toEqual(entries);
});
