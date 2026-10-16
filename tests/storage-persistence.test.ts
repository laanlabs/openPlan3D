import { mockStorage, failWrites } from './fixtures/indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { get } from 'svelte/store';
import { translate } from '$lib/i18n';
import { createDefaultProject } from '$lib/stores/project';

// Every test gets fresh modules: "asked once" is per page, the localStorage flag per browser.
let data: Map<string, string>;
beforeEach(() => { vi.resetModules(); data = mockStorage(); });

async function modules() {
  const persistence = await import('$lib/services/storagePersistence');
  const { localStore, storageErrorMessage } = await import('$lib/services/datastore');
  return { ...persistence, localStore, storageErrorMessage };
}

/** A browser with this StorageManager, after the person has clicked or typed (unless told otherwise). */
function browser(storage: unknown, hasBeenActive = true) {
  vi.stubGlobal('navigator', { storage, userActivation: { hasBeenActive } });
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));
const unavailable = 'Browser storage is unavailable. Allow site storage or download your project as JSON.';

describe('persistent storage request', () => {
  it('asks once, after the first committed save, and remembers that for later page loads', async () => {
    const persisted = vi.fn(async () => false), persist = vi.fn(async () => true);
    browser({ persisted, persist });
    const { localStore, storagePersistence, PERSIST_REQUESTED_KEY } = await modules();
    const shell = createDefaultProject('First floor shell');
    await localStore.save(shell);
    await vi.waitFor(() => expect(get(storagePersistence)).toBe(true));
    expect(persist).toHaveBeenCalledTimes(1);
    expect(data.get(PERSIST_REQUESTED_KEY)).toBe('true');

    shell.name = 'First floor with doors';
    await localStore.save(shell);
    await localStore.duplicate(shell.id);
    await settle();
    expect(persist).toHaveBeenCalledTimes(1);

    vi.resetModules(); // Reload the page in the same browser.
    await (await modules()).localStore.save(createDefaultProject('Second floor'));
    await settle();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persisted).toHaveBeenCalledTimes(1);
  });

  it('accepts a refusal without asking again on later saves or page loads', async () => {
    const persist = vi.fn(async () => false);
    browser({ persisted: async () => false, persist });
    const { localStore, storagePersistence } = await modules();
    const project = createDefaultProject();
    await localStore.save(project);
    await vi.waitFor(() => expect(get(storagePersistence)).toBe(false));
    await localStore.save(project);
    vi.resetModules();
    await (await modules()).localStore.save(createDefaultProject());
    await settle();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('does not prompt when the library is already persistent', async () => {
    const persist = vi.fn(async () => true);
    browser({ persisted: async () => true, persist });
    const { localStore, storagePersistence, PERSIST_REQUESTED_KEY } = await modules();
    await localStore.save(createDefaultProject());
    await vi.waitFor(() => expect(get(storagePersistence)).toBe(true));
    expect(persist).not.toHaveBeenCalled();
    expect(data.has(PERSIST_REQUESTED_KEY)).toBe(false);
  });

  it.each([
    ['no navigator', undefined],
    ['no StorageManager', {}],
    ['no persist()', { storage: { persisted: async () => false } }],
  ])('saves normally and asks nothing when the browser lacks the API: %s', async (_, navigator) => {
    vi.stubGlobal('navigator', navigator);
    const { localStore, requestPersistentStorage, PERSIST_REQUESTED_KEY } = await modules();
    await expect(requestPersistentStorage()).resolves.toBeNull();
    const project = createDefaultProject();
    await expect(localStore.save(project)).resolves.toBeUndefined();
    expect(await localStore.load(project.id)).toEqual(project);
    expect(data.has(PERSIST_REQUESTED_KEY)).toBe(false);
  });

  it('treats a rejected request as asked, and the save still succeeds', async () => {
    const persist = vi.fn(async () => { throw new DOMException('Denied', 'NotAllowedError'); });
    browser({ persisted: async () => false, persist });
    const { localStore, requestPersistentStorage, PERSIST_REQUESTED_KEY } = await modules();
    await expect(requestPersistentStorage()).resolves.toBeNull();
    const project = createDefaultProject();
    await expect(localStore.save(project)).resolves.toBeUndefined();
    vi.resetModules();
    await (await modules()).localStore.save(createDefaultProject());
    await settle();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(data.get(PERSIST_REQUESTED_KEY)).toBe('true');
  });

  it.each([
    ['persisted() throws', () => ({ storage: { persisted() { throw new TypeError('Illegal invocation'); }, persist: async () => true } })],
    ['the StorageManager getter throws', () => ({ get storage() { throw new DOMException('The operation is insecure.', 'SecurityError'); } })],
  ])('never fails a save when the Storage API throws: %s', async (_, navigator) => {
    vi.stubGlobal('navigator', navigator());
    const { localStore, requestPersistentStorage } = await modules();
    await expect(requestPersistentStorage()).resolves.toBeNull();
    const project = createDefaultProject();
    await expect(localStore.save(project)).resolves.toBeUndefined();
    expect(await localStore.load(project.id)).toEqual(project);
  });

  it('never makes a save wait for the answer, even while Firefox’s prompt stays open', async () => {
    const persist = vi.fn(() => new Promise<boolean>(() => {}));
    browser({ persisted: async () => false, persist });
    const { localStore } = await modules();
    const project = createDefaultProject();
    await localStore.save(project);
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    project.name = 'Edited while the prompt is open';
    await localStore.save(project);
    expect((await localStore.load(project.id))?.name).toBe('Edited while the prompt is open');
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('waits for a person’s action: a save made while a page loads does not ask', async () => {
    const persist = vi.fn(async () => true), activation = { hasBeenActive: false };
    vi.stubGlobal('navigator', { storage: { persisted: async () => false, persist }, userActivation: activation });
    const { localStore } = await modules();
    const project = createDefaultProject(); // The empty plan a bare /editor link creates and saves.
    await localStore.save(project);
    await settle();
    expect(persist).not.toHaveBeenCalled();
    activation.hasBeenActive = true; // The person draws a wall.
    project.name = 'Drawn';
    await localStore.save(project);
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
  });

  it('asks once when several saves commit together', async () => {
    const persist = vi.fn(async () => true);
    browser({ persisted: async () => false, persist });
    const { localStore, requestPersistentStorage } = await modules();
    await Promise.all([localStore.save(createDefaultProject('A')), localStore.save(createDefaultProject('B')), requestPersistentStorage()]);
    await settle();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('does not ask when the save fails', async () => {
    const persist = vi.fn(async () => true);
    browser({ persisted: async () => false, persist });
    const { localStore } = await modules();
    failWrites();
    await expect(localStore.save(createDefaultProject())).rejects.toMatchObject({ name: 'QuotaExceededError' });
    await settle();
    expect(persist).not.toHaveBeenCalled();
  });

  it('asks after a saved copy, and after restoring a library backup or importing a package', async () => {
    const persist = vi.fn(async () => true);
    browser({ persisted: async () => false, persist });
    const { localStore } = await modules();
    await localStore.saveCopy(createDefaultProject('Shell'));
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));

    vi.resetModules(); data.clear();
    const { prepareLibraryRestore } = await import('$lib/services/libraryRestore');
    const backedUp = createDefaultProject('Backed up');
    const backup = JSON.stringify({ format: 'openplan3d-library', version: 1, projects: { [backedUp.id]: JSON.stringify(backedUp) }, thumbnails: {}, history: {} });
    await expect(prepareLibraryRestore(backup).restore()).resolves.toMatchObject({ projects: [{ name: 'Backed up (Restored copy)' }] });
    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(2));
  });

  it('asks at most once per page when localStorage cannot remember it', async () => {
    const persist = vi.fn(async () => true);
    browser({ persisted: async () => false, persist });
    vi.stubGlobal('localStorage', { getItem() { throw new DOMException('Denied', 'SecurityError'); }, setItem() { throw new DOMException('Full', 'QuotaExceededError'); } });
    const { requestPersistentStorage } = await modules();
    await expect(requestPersistentStorage()).resolves.toBe(true);
    await expect(requestPersistentStorage()).resolves.toBeUndefined();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('blocked site storage still reaches the storage-unavailable message and never asks', async () => {
    const persist = vi.fn(async () => true);
    browser({ persisted: async () => false, persist });
    const denied = (): never => { throw new DOMException('Access is denied for this document.', 'SecurityError'); };
    vi.stubGlobal('localStorage', { get length() { return denied(); }, key: denied, getItem: denied, setItem: denied, removeItem: denied });
    vi.stubGlobal('indexedDB', { open: denied });
    const { localStore, storageErrorMessage } = await modules();
    for (const attempt of [() => localStore.list(), () => localStore.save(createDefaultProject())]) {
      const error = await attempt().catch(error => error);
      expect(error).toMatchObject({ name: 'SecurityError' });
      expect(storageErrorMessage(error)).toBe(unavailable);
    }
    await settle();
    expect(persist).not.toHaveBeenCalled();
  });
});

describe('library storage note', () => {
  it.each([
    [false, false, true, true],
    [null, false, true, true],
    [true, false, true, false],
    [undefined, false, true, false],
    [false, true, true, false],
    [null, false, false, false],
  ] as const)('persistent %s, dismissed %s, projects shown %s: note shown %s', async (persistence, dismissed, active, shown) => {
    const { showStorageNote } = await modules();
    expect(showStorageNote(persistence, dismissed, active)).toBe(shown);
  });

  const checks: [string, (persist: () => Promise<boolean>) => object, boolean | null][] = [
    ['granted', persist => ({ storage: { persisted: async () => true, persist } }), true],
    ['best-effort', persist => ({ storage: { persisted: async () => false, persist } }), false],
    ['no API', () => ({}), null],
    ['throws', persist => ({ storage: { persisted: async () => { throw new DOMException('The operation is insecure.', 'SecurityError'); }, persist } }), null],
  ];
  it.each(checks)('checks without prompting: %s', async (_, browserWith, expected) => {
    const persist = vi.fn(async () => true);
    vi.stubGlobal('navigator', browserWith(persist));
    const { checkStoragePersistence, storagePersistence } = await modules();
    await expect(checkStoragePersistence()).resolves.toBe(expected);
    expect(get(storagePersistence)).toBe(expected);
    expect(persist).not.toHaveBeenCalled();
  });

  it('keeps a grant made while an older check was still pending', async () => {
    let answerCheck: (value: boolean) => void = () => {};
    const persisted = vi.fn()
      .mockImplementationOnce(() => new Promise<boolean>(resolve => { answerCheck = resolve; }))
      .mockImplementation(async () => false);
    browser({ persisted, persist: async () => true });
    const { checkStoragePersistence, requestPersistentStorage, storagePersistence } = await modules();
    const check = checkStoragePersistence();
    await expect(requestPersistentStorage()).resolves.toBe(true);
    answerCheck(false);
    await check;
    expect(get(storagePersistence)).toBe(true);
  });

  it('remembers a dismissal in this browser', async () => {
    const { storageNoteDismissed, dismissStorageNote, STORAGE_NOTE_DISMISSED_KEY } = await modules();
    expect(storageNoteDismissed()).toBe(false);
    dismissStorageNote();
    expect(storageNoteDismissed()).toBe(true);
    expect(data.has(STORAGE_NOTE_DISMISSED_KEY)).toBe(true);
    vi.resetModules();
    expect((await modules()).storageNoteDismissed()).toBe(true);
  });

  it('works in memory when site storage is blocked', async () => {
    const denied = (): never => { throw new DOMException('Access is denied for this document.', 'SecurityError'); };
    vi.stubGlobal('localStorage', { getItem: denied, setItem: denied });
    vi.stubGlobal('navigator', { get storage() { return denied(); } });
    const { storageNoteDismissed, dismissStorageNote, checkStoragePersistence } = await modules();
    expect(storageNoteDismissed()).toBe(false);
    expect(() => dismissStorageNote()).not.toThrow();
    expect(storageNoteDismissed()).toBe(true);
    await expect(checkStoragePersistence()).resolves.toBeNull();
  });

  it('is quoted in the user guide exactly as the library shows it', () => {
    const guide = readFileSync(new URL('../docs/user-guide.md', import.meta.url), 'utf8').replace(/\s+/g, ' ');
    expect(guide).toContain(`"${translate('en', 'library.storageNote', { backup: translate('en', 'library.backup') })}"`);
    expect(guide).toContain('### Persistent storage');
  });
});
