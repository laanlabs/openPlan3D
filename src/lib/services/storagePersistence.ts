import { writable } from 'svelte/store';

/** Set when this browser has been asked once, so Firefox's permission prompt never repeats. */
export const PERSIST_REQUESTED_KEY = 'openplan3d-persist-requested';
/** Set when the library's storage note has been hidden in this browser. */
export const STORAGE_NOTE_DISMISSED_KEY = 'openplan3d-storage-note-dismissed';

/**
 * true: the browser keeps the library until the person clears it.
 * false: best-effort storage, which the browser may delete to free space.
 * null: unknown, because the Storage API is missing or the check failed.
 */
export type StoragePersistence = boolean | null;

/** The browser's latest answer; undefined until checked. */
export const storagePersistence = writable<StoragePersistence | undefined>(undefined);

type Manager = { persisted?: () => Promise<boolean>; persist?: () => Promise<boolean> };

function manager(): Manager | undefined {
  try { return typeof navigator === 'undefined' ? undefined : navigator.storage ?? undefined; }
  catch { return undefined; }
}

/** Sticky activation: a save made while a page loads, before any click or key press, does not ask. */
function interacted(): boolean {
  try { return (navigator as { userActivation?: { hasBeenActive?: boolean } }).userActivation?.hasBeenActive ?? true; }
  catch { return true; }
}

function remembered(key: string): boolean {
  try { return localStorage.getItem(key) !== null; } catch { return false; }
}

function remember(key: string) {
  try { localStorage.setItem(key, 'true'); } catch { /* The in-memory state still applies to this page. */ }
}

let asked = false;

/**
 * Ask once per browser to keep the library in persistent storage, after a person's
 * action has committed work to it. Firefox shows a permission prompt; Chromium and
 * Safari decide without asking. Never rejects; saves never wait for it.
 * Resolves to whether the library is persistent (null when the browser cannot
 * tell), or undefined when it did not check.
 */
export async function requestPersistentStorage(): Promise<StoragePersistence | undefined> {
  if (asked) return undefined;
  try {
    const storage = manager();
    if (typeof storage?.persist !== 'function') { asked = true; return null; }
    if (!interacted()) return undefined;
    asked = true;
    if (remembered(PERSIST_REQUESTED_KEY)) return undefined;
    if (typeof storage.persisted === 'function' && (await storage.persisted()) === true) {
      storagePersistence.set(true);
      return true;
    }
    // Remember before asking: reloading while Firefox's prompt is open must not ask again.
    remember(PERSIST_REQUESTED_KEY);
    const granted = (await storage.persist()) === true;
    storagePersistence.set(granted);
    return granted;
  } catch {
    asked = true;
    return null;
  }
}

/** Ask, without prompting, whether the browser keeps the library. Never rejects. */
export async function checkStoragePersistence(): Promise<StoragePersistence> {
  let result: StoragePersistence = null;
  try {
    const storage = manager();
    if (typeof storage?.persisted === 'function') result = (await storage.persisted()) === true;
  } catch { result = null; }
  // A grant made while this check was pending must not be undone by its older answer.
  storagePersistence.update(current => current === true ? true : result);
  return result;
}

let dismissedHere = false;

export function storageNoteDismissed(): boolean {
  return dismissedHere || remembered(STORAGE_NOTE_DISMISSED_KEY);
}

export function dismissStorageNote() {
  dismissedHere = true;
  remember(STORAGE_NOTE_DISMISSED_KEY);
}

/** Recommend a library backup while saved projects are shown and the browser has not promised to keep them. */
export function showStorageNote(persistence: StoragePersistence | undefined, dismissed: boolean, active: boolean): boolean {
  return active && !dismissed && (persistence === false || persistence === null);
}
