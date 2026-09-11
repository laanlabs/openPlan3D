import { beforeEach, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { addFloor, beginUndoGroup, currentProject, endUndoGroup, loadProject, redo, undo, undoHistoryStore } from '$lib/stores/project';
import { roomProject } from './fixtures/project';

beforeEach(() => loadProject(roomProject()));
const state = () => JSON.stringify(get(currentProject));

it('does not discard Redo or add history for an unchanged group', () => {
  addFloor(undefined, 'empty');
  const edited = state();
  undo();
  const before = state();
  const history = get(undoHistoryStore);
  beginUndoGroup();
  beginUndoGroup();
  endUndoGroup();
  endUndoGroup('Unchanged gesture');
  expect(state()).toBe(before);
  expect(get(undoHistoryStore)).toEqual(history);
  redo();
  expect(state()).toBe(edited);
});

it('cannot restore a previous project when an in-flight group ends after loading', () => {
  beginUndoGroup();
  addFloor(undefined, 'empty');
  const replacement = roomProject();
  replacement.id = 'replacement-project';
  loadProject(replacement);
  const before = state();
  endUndoGroup('Stale gesture');
  undo();
  expect(state()).toBe(before);
  expect(get(undoHistoryStore).entries).toHaveLength(0);
  addFloor(undefined, 'empty');
  undo();
  expect(state()).toBe(before);
});

it('commits nested edits once and drops the superseded Redo branch', () => {
  addFloor(undefined, 'empty');
  undo();
  const before = state();
  beginUndoGroup();
  addFloor('New branch', 'empty');
  beginUndoGroup();
  addFloor('Nested edit', 'empty');
  endUndoGroup();
  endUndoGroup('Grouped floors');
  const edited = state();
  expect(get(undoHistoryStore).entries.map(entry => entry.description)).toEqual(['Grouped floors']);
  redo();
  expect(state()).toBe(edited);
  undo();
  expect(state()).toBe(before);
  redo();
  expect(state()).toBe(edited);
});
