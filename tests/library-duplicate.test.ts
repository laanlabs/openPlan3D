import { mockStorage, putRaw, rawRecords } from './fixtures/indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { createLocalStore, localStore } from '$lib/services/datastore';
import { loadProject, updateProjectName, updateWall } from '$lib/stores/project';
import { autoSave, initAutoSave, markClean, saveConflict, saveError, saveState } from '$lib/stores/saveStatus';
import { roomProject } from './fixtures/project';

vi.mock('$lib/stores/versionHistory', () => ({ saveSnapshot: vi.fn() }));

/** Web Locks as browsers grant them within an origin: one holder per name, the others in request order. */
function grantLocksInOrder() {
  const tails = new Map<string, Promise<unknown>>();
  vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('navigator', { locks: { request(name: string, task: () => Promise<unknown>) {
    const run = (tails.get(name) ?? Promise.resolve()).then(task);
    tails.set(name, run.catch(() => {}));
    return run;
  } } });
}

beforeEach(() => { mockStorage(); });
afterEach(() => { markClean(); });

/** Edit a saved plan, then leave the editor the way its toolbar does: start the save, do not wait for it. */
async function leaveEditorWithUnsavedEdits() {
  const plan = roomProject(); plan.name = 'Shell';
  await localStore.save(plan);
  loadProject((await localStore.load(plan.id))!); markClean();
  const stop = initAutoSave();
  updateWall(plan.floors[0].walls[0].id, { thickness: 30 });
  updateProjectName('Shell with porch');
  if (get(saveState) === 'unsaved') void autoSave();
  stop();
  return plan;
}

it('duplicates the edits the editor was still saving, and that save still lands', async () => {
  grantLocksInOrder();
  const plan = await leaveEditorWithUnsavedEdits();
  const copy = (await localStore.duplicate(plan.id))!;
  expect(copy.name).toBe('Shell with porch (Copy)');
  expect(copy.floors[0].walls[0].thickness).toBe(30);
  await vi.waitFor(() => expect(get(saveState)).toBe('saved'));
  expect(get(saveError)).toBeNull();
  const saved = (await createLocalStore().load(plan.id))!;
  expect(saved.name).toBe('Shell with porch');
  expect(saved.floors[0].walls[0].thickness).toBe(30);
});

it('never turns the save the editor queued into a conflict, even without Web Locks', async () => {
  const plan = await leaveEditorWithUnsavedEdits();
  await localStore.duplicate(plan.id);
  await vi.waitFor(() => expect(get(saveState)).toBe('saved'));
  expect(get(saveConflict)).toBe(false);
  expect((await createLocalStore().load(plan.id))!.name).toBe('Shell with porch');
});

it('still refuses to copy an entry whose saved project names another ID, as opening it does', async () => {
  await putRaw('projects', 'entry', JSON.stringify({ ...roomProject(), id: 'another' }));
  const before = await rawRecords();
  await expect(createLocalStore().duplicate('entry')).rejects.toThrow('does not match its library entry');
  expect(await rawRecords()).toEqual(before);
});
