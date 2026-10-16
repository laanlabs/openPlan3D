import { rawRecords, putRaw } from './fixtures/indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { openProject } from '$lib/services/projectOpening';
import { createLocalStore, localStore } from '$lib/services/datastore';
import { currentProject, loadProject, updateProjectName } from '$lib/stores/project';
import { initAutoSave, markClean, saveConflict, saveError, saveState } from '$lib/stores/saveStatus';
import { roomProject } from './fixtures/project';

vi.mock('$lib/stores/versionHistory', () => ({ saveSnapshot: vi.fn() }));
let stop: () => void;
let storage: Map<string, string>;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  loadProject(roomProject());
  markClean();
  await localStore.save(get(currentProject)!);
  stop = initAutoSave();
});
afterEach(() => { stop(); markClean(); vi.useRealTimers(); });

it('saves pending current edits before importing, then saves the candidate separately', async () => {
  const previousId = get(currentProject)!.id;
  updateProjectName('Keep these latest edits');
  const candidate = roomProject();
  const saved = vi.spyOn(localStore, 'save');
  const opened = await openProject(() => candidate);
  expect(saved.mock.calls.map(([p]) => p.id)).toEqual([previousId, candidate.id]);
  expect((await localStore.load(previousId))!.name).toBe('Keep these latest edits');
  expect((await localStore.load(opened!.id))!.floors).toEqual(candidate.floors);
  expect(get(saveState)).toBe('saved');
  expect(get(currentProject)).toBe(opened);
});

it('does not write the previous project again when it is already saved', async () => {
  const saved = vi.spyOn(localStore, 'save');
  await openProject(roomProject, 'new');
  expect(saved).toHaveBeenCalledOnce();
});

it('validates before any save or state change, even with pending current edits', async () => {
  updateProjectName('Unsaved but safe');
  const before = get(currentProject), raw = await rawRecords();
  const candidate: any = roomProject(); candidate.floors[0].walls[0].start = null;
  const saved = vi.spyOn(localStore, 'save');
  await expect(openProject(() => candidate)).rejects.toThrow('walls[0].start');
  expect(saved).not.toHaveBeenCalled();
  expect(get(currentProject)).toBe(before);
  expect(await rawRecords()).toEqual(raw);
  expect(get(saveState)).toBe('unsaved');
});

it('retains current work and refuses replacement after a failed current save', async () => {
  updateProjectName('Cannot lose this');
  const before = get(currentProject), raw = await rawRecords();
  vi.spyOn(localStore, 'save').mockRejectedValue(new DOMException('Full', 'QuotaExceededError'));
  await expect(openProject(roomProject)).rejects.toThrow('Your current plan could not be saved. Browser storage is full');
  expect(get(currentProject)).toBe(before);
  expect(await rawRecords()).toEqual(raw);
  expect(get(saveState)).toBe('unsaved');
});

it('imports a current-ID collision as a copy without changing the input or losing pending edits', async () => {
  const candidate = structuredClone(get(currentProject)!);
  updateProjectName('Current revised plan');
  const opened = await openProject(() => candidate);
  expect(opened!.id).not.toBe(candidate.id);
  expect(opened!.name).toBe(`${candidate.name} (Imported copy)`);
  expect(opened!.floors).toEqual(candidate.floors);
  expect((await localStore.load(candidate.id))!.name).toBe('Current revised plan');
  expect(candidate.name).toBe('Regression plan');
  expect((await localStore.list())).toHaveLength(2);
});

it('preserves a different saved entry with a colliding ID, including unreadable geometry', async () => {
  const candidate = roomProject(); candidate.id = '__proto__';
  await putRaw('projects', candidate.id, '{original damaged bytes');
  expect(await localStore.has(candidate.id)).toBe(true);
  const opened = await openProject(() => candidate);
  expect(opened!.id).not.toBe(candidate.id);
  expect((await rawRecords())[candidate.id]).toBe('{original damaged bytes');
});

it('keeps a candidate available for export if its own save fails after preserving the old work', async () => {
  const previousId = get(currentProject)!.id;
  updateProjectName('Preserved first');
  const candidate = roomProject(), save = localStore.save;
  vi.spyOn(localStore, 'save').mockImplementation(p => p.id === candidate.id
    ? Promise.reject(new DOMException('Full', 'QuotaExceededError')) : save(p));
  const opened = await openProject(() => candidate);
  expect(get(currentProject)).toBe(opened);
  expect(get(saveState)).toBe('unsaved');
  expect(get(saveError)).toContain('Browser storage is full');
  expect((await localStore.load(previousId))!.name).toBe('Preserved first');
  expect(await localStore.has(candidate.id)).toBe(false);
});

it('can open an in-memory project without overwriting an unreadable library', async () => {
  storage.set('floorplan_projects', '{original library bytes');
  const candidate = roomProject();
  const opened = await openProject(() => candidate, 'new');
  expect(opened!.id).not.toBe(candidate.id);
  expect(get(currentProject)).toBe(opened);
  expect(get(saveState)).toBe('unsaved');
  expect(get(saveError)).toContain('library could not be read');
  expect(storage.get('floorplan_projects')).toBe('{original library bytes');
});

it('can open a first in-memory project when browser storage is denied', async () => {
  currentProject.set(null); markClean();
  vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
  const opened = await openProject(roomProject);
  expect(get(currentProject)).toBe(opened);
  expect(opened).not.toBeNull();
  expect(get(saveState)).toBe('unsaved');
  expect(get(saveError)).toContain('Browser storage is unavailable');
});

it('does not replace a current project edited during its pending save', async () => {
  updateProjectName('First edit');
  const write = deferred<void>(), started = deferred<void>();
  vi.spyOn(localStore, 'save').mockImplementationOnce(() => { started.resolve(); return write.promise; });
  const pending = openProject(roomProject);
  await started.promise;
  updateProjectName('Later edit');
  write.resolve();
  await expect(pending).rejects.toThrow('Your current plan could not be saved');
  expect(get(currentProject)!.name).toBe('Later edit');
  expect(get(saveState)).toBe('unsaved');
});

it('does not discard edits made while checking destination storage', async () => {
  const checking = deferred<boolean>(), started = deferred<void>();
  vi.spyOn(localStore, 'has').mockImplementationOnce(() => { started.resolve(); return checking.promise; });
  const pending = openProject(roomProject);
  await started.promise;
  updateProjectName('Edited during destination check');
  checking.resolve(false);
  await expect(pending).rejects.toThrow('Your plan changed while preparing');
  expect(get(currentProject)!.name).toBe('Edited during destination check');
});

it('lets the latest import win when an older file finishes reading later', async () => {
  const old = deferred<unknown>();
  const first = openProject(() => old.promise);
  const latest = await openProject(roomProject);
  old.resolve(roomProject());
  expect(await first).toBeNull();
  expect(get(currentProject)).toBe(latest);
  expect(await localStore.list()).toHaveLength(2);
});

it('suppresses an outdated file error after a newer import succeeds', async () => {
  const old = deferred<unknown>();
  const first = openProject(() => old.promise);
  const latest = await openProject(roomProject);
  old.reject(new Error('Old file failed'));
  expect(await first).toBeNull();
  expect(get(currentProject)).toBe(latest);
});

it('ignores a read that completes after navigation or component teardown', async () => {
  const old = deferred<unknown>(), lifetime = new AbortController();
  const before = get(currentProject);
  const pending = openProject(() => old.promise, 'import', lifetime.signal);
  lifetime.abort(); old.resolve(roomProject());
  expect(await pending).toBeNull();
  expect(get(currentProject)).toBe(before);
});

it('ignores an import if another project was loaded during the file read', async () => {
  const old = deferred<unknown>(), pending = openProject(() => old.promise);
  const next = roomProject(); loadProject(next); markClean();
  old.resolve(roomProject());
  expect(await pending).toBeNull();
  expect(get(currentProject)).toBe(next);
});

it.each([['this tab', () => localStore], ['another tab', createLocalStore]])(
  'imports the backup of an open plan deleted in %s as a copy that keeps saving', async (_tab, store) => {
    const deleted = get(currentProject)!, backup = JSON.parse(JSON.stringify(deleted));
    const library = store(); await library.list(); await library.delete(deleted.id);
    // Back in the library this tab starts a new plan, then imports the backup from the editor.
    const fresh = (await openProject(roomProject, 'new'))!;
    const restored = (await openProject(() => backup))!;
    expect(restored.id).not.toBe(deleted.id);
    expect(restored.name).toBe('Regression plan (Imported copy)');
    expect(restored.floors).toEqual(deleted.floors);
    expect(get(saveState)).toBe('saved'); expect(get(saveConflict)).toBe(false);
    updateProjectName('Edited after restoring');
    await vi.runAllTimersAsync();
    await vi.waitFor(() => expect(get(saveState)).toBe('saved'));
    expect((await localStore.list()).map(p => p.id).sort()).toEqual([fresh.id, restored.id].sort());
    expect((await localStore.load(restored.id))!.name).toBe('Edited after restoring');
  });
