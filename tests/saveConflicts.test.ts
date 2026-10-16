import { mockStorage, rawRecords, failWrites } from './fixtures/indexeddb';
import { beforeEach, expect, it, vi } from 'vitest';
import { createLocalStore, ProjectConflictError, PROJECTS_STORAGE_KEY as key } from '$lib/services/datastore';
import { roomProject } from './fixtures/project';

let data: Map<string, string>;
beforeEach(() => {
  data = mockStorage();
});

async function twoTabs() {
  const first = createLocalStore(), second = createLocalStore();
  const project = roomProject(); await first.save(project);
  return { first, second, a: (await first.load(project.id))!, b: (await second.load(project.id))! };
}

function controlledLocks() {
  const queue: (() => void)[] = [];
  const request = vi.fn((_name: string, run: () => unknown) => new Promise((resolve, reject) => {
    queue.push(() => { try { resolve(run()); } catch (error) { reject(error); } });
  }));
  vi.stubGlobal('window', {});
  vi.stubGlobal('navigator', { locks: { request } });
  return { request, release: () => queue.shift()!() };
}

it('rejects repeated saves from an older tab and retains the newer saved bytes', async () => {
  const { first, second, a, b } = await twoTabs();
  a.name = 'Newer version'; await first.save(a);
  const raw = await rawRecords();
  b.name = 'Older tab edits';
  await expect(second.save(b)).rejects.toBeInstanceOf(ProjectConflictError);
  await expect(second.save(b)).rejects.toBeInstanceOf(ProjectConflictError);
  expect(await rawRecords()).toEqual(raw);
  expect(b.name).toBe('Older tab edits');
});

it('accepts edits after explicitly reopening the latest saved version', async () => {
  const { first, second, a } = await twoTabs();
  a.name = 'Newer version'; await first.save(a);
  const reopened = (await second.load(a.id))!;
  reopened.name = 'Reviewed latest'; await second.save(reopened);
  expect((await first.load(a.id))!.name).toBe('Reviewed latest');
});

it('does not confuse another project changing with a conflict', async () => {
  const { first, second, b } = await twoTabs();
  const neighbor = roomProject(); await first.save(neighbor);
  neighbor.name = 'Other project edits'; await first.save(neighbor);
  await expect(second.assertCurrent(b.id)).resolves.toBeUndefined();
  b.name = 'Independent edit'; await second.save(b);
  expect((await first.load(neighbor.id))!.name).toBe('Other project edits');
});

it('refuses an unobserved existing ID instead of assuming it is safe to overwrite', async () => {
  const first = createLocalStore(), second = createLocalStore(), project = roomProject();
  await first.save(project);
  await expect(second.save({ ...project, name: 'Collision' })).rejects.toBeInstanceOf(ProjectConflictError);
});

it('does not allow an open tab to recreate a project deleted elsewhere', async () => {
  const { first, second, a, b } = await twoTabs();
  await first.list(); await first.delete(a.id);
  await expect(second.save(b)).rejects.toBeInstanceOf(ProjectConflictError);
  expect(await first.has(a.id)).toBe(false);
});

it('guards deleting a stale library card until the library has been refreshed', async () => {
  const { first, second, a } = await twoTabs();
  await second.list();
  a.name = 'Changed since listing'; await first.save(a);
  const raw = await rawRecords();
  await expect(second.delete(a.id)).rejects.toBeInstanceOf(ProjectConflictError);
  expect(await rawRecords()).toEqual(raw);
  await second.list(); await second.delete(a.id);
  expect(await first.has(a.id)).toBe(false);
});

it('does not silently rebase an open editor when its library is listed', async () => {
  const { first, second, a, b } = await twoTabs();
  a.name = 'Newer version'; await first.save(a);
  await second.list();
  await expect(second.save(b)).rejects.toBeInstanceOf(ProjectConflictError);
});

it('does not advance the saved baseline when a write fails, so retry can succeed', async () => {
  const { first, a } = await twoTabs();
  a.name = 'Retry this edit';
  const restore = failWrites();
  await expect(first.save(a)).rejects.toMatchObject({ name: 'QuotaExceededError' });
  restore();
  await first.save(a);
  expect((await first.load(a.id))!.name).toBe('Retry this edit');
});

it('does not erase the migrated library when legacy storage is removed', async () => {
  const { first, second, b } = await twoTabs();
  data.delete(key);
  await second.save(b);
  expect(await first.has(b.id)).toBe(true);
});

it('creates an independent recovery copy without rebasing the conflicting original', async () => {
  const { first, second, a, b } = await twoTabs();
  a.name = 'Newer version'; await first.save(a);
  b.name = 'My alternative'; b.floors[0].walls[0].thickness = 42.5;
  const copy = await second.saveCopy(b);
  expect(copy.id).not.toBe(b.id);
  expect(copy.name).toBe('My alternative (Recovered copy)');
  expect(copy.floors).toEqual(b.floors);
  expect(b.id).toBe(a.id);
  expect((await first.load(a.id))!.name).toBe('Newer version');
  expect((await first.load(copy.id))!.floors[0].walls[0].thickness).toBe(42.5);
  await expect(second.save(b)).rejects.toBeInstanceOf(ProjectConflictError);
  copy.name = 'Continue editing copy'; await second.save(copy);
});

it('keeps all saved bytes intact when a recovery copy cannot fit in storage', async () => {
  const { second, b } = await twoTabs();
  const before = await rawRecords(), original = structuredClone(b);
  const restore = failWrites();
  await expect(second.saveCopy(b)).rejects.toMatchObject({ name: 'QuotaExceededError' });
  expect(await rawRecords()).toEqual(before); expect(b).toEqual(original);
  restore();
  expect((await second.saveCopy(b)).id).not.toBe(b.id);
});

it('freezes pending writes before acquiring the browser lock', async () => {
  const { first, a } = await twoTabs();
  const locks = controlledLocks();
  a.name = 'At save time';
  const pending = first.save(a);
  a.name = 'Later edit'; a.floors[0].walls[0].thickness = 80;
  locks.release(); await pending;
  const saved = JSON.parse((await rawRecords())[a.id]);
  expect(saved.name).toBe('At save time'); expect(saved.floors[0].walls[0].thickness).toBe(15);
  const retry = first.save(a); locks.release(); await retry;
  expect((await first.load(a.id))!.name).toBe('Later edit');
});

it('serializes concurrent writes and rereads the full library inside the lock', async () => {
  const first = createLocalStore(), second = createLocalStore();
  const locks = controlledLocks(), a = roomProject(), b = roomProject();
  const one = first.save(a), two = second.save(b);
  expect(data.has(key)).toBe(false);
  expect(locks.request.mock.calls.map(([name]) => name)).toEqual(['openplan3d-project-library', 'openplan3d-project-library']);
  locks.release(); await one;
  locks.release(); await two;
  expect(Object.keys(await rawRecords()).sort()).toEqual([a.id, b.id].sort());
});

it('rejects the second simultaneous writer to the same project', async () => {
  const { first, second, a, b } = await twoTabs();
  const locks = controlledLocks();
  a.name = 'First writer'; b.name = 'Second writer';
  const one = first.save(a), two = second.save(b);
  const rejected = expect(two).rejects.toBeInstanceOf(ProjectConflictError);
  locks.release(); await one;
  locks.release(); await rejected;
  expect((await first.load(a.id))!.name).toBe('First writer');
});

it('discards a pending save if its project was reopened before the lock arrived', async () => {
  const { first, a } = await twoTabs();
  const locks = controlledLocks(), before = await rawRecords();
  a.name = 'Old pending edit';
  const pending = first.save(a), rejected = expect(pending).rejects.toBeInstanceOf(ProjectConflictError);
  await first.load(a.id);
  locks.release(); await rejected;
  expect(await rawRecords()).toEqual(before);
});

it('does not overwrite a newer project thumbnail from a stale editor', async () => {
  const { first, second, a } = await twoTabs();
  a.name = 'Changed'; await first.save(a);
  await first.saveThumbnail(a.id, 'new thumbnail');
  await second.saveThumbnail(a.id, 'old thumbnail');
  expect(await first.getThumbnail(a.id)).toBe('new thumbnail');
});

it('checks copy IDs against the library while holding the mutation lock', async () => {
  const { first, a } = await twoTabs();
  const uuid = vi.fn().mockReturnValueOnce(a.id).mockReturnValueOnce('fresh-copy-id');
  vi.stubGlobal('crypto', { randomUUID: uuid });
  const copy = await first.saveCopy(a);
  expect(copy.id).toBe('fresh-copy-id'); expect(uuid.mock.calls.length).toBeGreaterThanOrEqual(2);
  expect((await first.load(a.id))!.name).toBe(a.name);
});

it('keeps refusing the deleting tab\'s own retained revision, so re-importing it must take a new ID', async () => {
  const { first, a } = await twoTabs();
  await first.list(); await first.delete(a.id);
  expect(await first.has(a.id)).toBe(false);
  await expect(first.assertCurrent(a.id)).rejects.toBeInstanceOf(ProjectConflictError);
  await expect(first.save(a)).rejects.toBeInstanceOf(ProjectConflictError);
  expect(await rawRecords()).toEqual({});
});

it('fails a save with blocked storage outside the library lock: the lock callback itself never rejects', async () => {
  // Firefox reports a Web Locks callback whose promise rejects at once as an uncaught page error.
  let rejectedInsideLock = false;
  const request = vi.fn((_name: string, run: () => Promise<unknown>) => {
    const result = run();
    result.catch(() => { rejectedInsideLock = true; });
    return result;
  });
  vi.stubGlobal('window', {});
  vi.stubGlobal('navigator', { locks: { request } });
  vi.spyOn(indexedDB, 'open').mockImplementation(() => { throw new DOMException('Access is denied for this document.', 'SecurityError'); });
  await expect(createLocalStore().save(roomProject())).rejects.toMatchObject({ name: 'SecurityError' });
  expect(request).toHaveBeenCalledWith('openplan3d-project-library', expect.any(Function));
  expect(rejectedInsideLock).toBe(false);
});
