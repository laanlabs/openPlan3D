import { readProject } from '$lib/utils/projectValidation';
import { randomId } from '$lib/utils/randomId';

export const DATABASE_NAME = 'openplan3d-local';
export const PROJECTS_STORAGE_KEY = 'floorplan_projects';
export const LIBRARY_CHANGE_KEY = 'openplan3d-library-change';
export const STORES = ['projects', 'thumbnails', 'history', 'meta'] as const;
export type StoreName = typeof STORES[number];
type Legacy = Record<string, string>;

export function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') throw new Error('Browser storage is unavailable. Allow site storage or download your project as JSON.');
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DATABASE_NAME, 1);
    let blocked = false;
    req.onupgradeneeded = () => {
      if (blocked) { req.transaction?.abort(); return; }
      for (const name of STORES) req.result.createObjectStore(name);
    };
    req.onblocked = () => {
      blocked = true;
      reject(new Error('Close other OpenPlan3D tabs, then retry loading to update browser storage. Your saved projects have not been removed.'));
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

/** Only await IndexedDB requests inside run: other work can let a transaction expire. */
export async function transaction<T>(db: IDBDatabase, stores: StoreName[], mode: IDBTransactionMode,
  run: (tx: IDBTransaction) => Promise<T>, signal?: AbortSignal): Promise<T> {
  const tx = db.transaction(stores, mode);
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new DOMException('The storage transaction was interrupted. Try saving again.', 'AbortError'));
    tx.onerror = () => {}; // Request errors abort; completion, not request success, confirms a save.
  });
  // Observe aborts even when a synchronous validation error stops run first.
  void done.catch(() => {});
  const abort = () => { try { tx.abort(); } catch {} };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    if (signal?.aborted) throw new DOMException('Restore cancelled.', 'AbortError');
    const value = await run(tx);
    await done;
    return value;
  } catch (error) {
    try { tx.abort(); } catch {}
    await done.catch(() => {});
    if (signal?.aborted) throw new DOMException('Restore cancelled.', 'AbortError');
    throw error;
  } finally { signal?.removeEventListener('abort', abort); }
}

function legacyStorage(): Legacy {
  const result: Legacy = Object.create(null);
  const library = localStorage.getItem(PROJECTS_STORAGE_KEY);
  if (library !== null) result[PROJECTS_STORAGE_KEY] = library;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('floorplan_thumb_') || key?.startsWith('vh_')) {
      const raw = localStorage.getItem(key);
      if (raw !== null) result[key] = raw;
    }
  }
  return result;
}

function library(raw?: string): Record<string, string> {
  try {
    const value = JSON.parse(raw ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(v => typeof v !== 'string')) throw new Error();
    return Object.assign(Object.create(null), value);
  } catch {
    throw new Error('The saved project library could not be read. Download a backup before attempting recovery.');
  }
}

/** Import once in a single transaction; leave all source bytes untouched for recovery.
 * Older releases may still write localStorage. Preserve their subsequent changes as
 * separate copies, never overwrite or resurrect a project in the new library.
 */
export async function migrateLegacy(tx: IDBTransaction, preserveUnreadable = false) {
  const meta = tx.objectStore('meta');
  const previous: Legacy | undefined = await request(meta.get('legacy-current'));
  const current = legacyStorage();
  if (previous && Object.keys(previous).length === Object.keys(current).length &&
      Object.entries(current).every(([key, raw]) => previous[key] === raw)) return;
  const projects = tx.objectStore('projects');
  let entries: Record<string, string>;
  try { entries = library(current[PROJECTS_STORAGE_KEY]); }
  catch (error) {
    if (!preserveUnreadable) throw error;
    // Explicit restoration can preserve a damaged old map and continue using
    // the new library. These markers commit in the same transaction as restore.
    if (!previous) meta.add(current, 'legacy-original');
    meta.put(current, 'legacy-current');
    return;
  }
  if (!previous) {
    for (const [id, raw] of Object.entries(entries)) projects.add(raw, id);
    for (const [key, raw] of Object.entries(current)) {
      if (key.startsWith('floorplan_thumb_')) tx.objectStore('thumbnails').add(raw, key.slice(16));
      if (key.startsWith('vh_')) tx.objectStore('history').add(raw, key.slice(3));
    }
    meta.add(current, 'legacy-original');
  } else {
    let before: Record<string, string>;
    try { before = library(previous[PROJECTS_STORAGE_KEY]); }
    catch { before = Object.create(null); }
    for (const [id, raw] of Object.entries(entries)) {
      if (before[id] === raw || await request(projects.get(id)) === raw) continue;
      // Invalid bytes stay available in the full backup. Only validation errors
      // are skippable; any failure while storing a recovery must abort migration.
      let copy;
      try {
        copy = readProject(JSON.parse(raw));
      } catch { continue; }
      const link: { id: string; raw: string } | undefined = await request(meta.get(`recovered:${id}`));
      // Continuing work in an old tab updates its untouched recovery copy.
      // Editing/deleting that copy in the new app makes the next recovery independent.
      const reuse = link && await request(projects.get(link.id)) === link.raw;
      if (reuse) copy.id = link.id;
      else {
        let attempts = 0;
        do {
          if (++attempts > 5) throw new Error('Could not choose a recovery project ID. Try loading again.');
          copy.id = globalThis.crypto?.randomUUID?.() ?? `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        } while (await request(projects.get(copy.id)) !== undefined);
      }
      copy.name = `${copy.name || 'Untitled Project'} (Recovered from older tab)`;
      const recoveredRaw = JSON.stringify(copy);
      if (reuse) projects.put(recoveredRaw, copy.id); else projects.add(recoveredRaw, copy.id);
      meta.put({ id: copy.id, raw: recoveredRaw }, `recovered:${id}`);
      const thumb = current[`floorplan_thumb_${id}`];
      if (thumb) tx.objectStore('thumbnails').put(thumb, copy.id);
    }
  }
  meta.put(current, 'legacy-current');
}

export async function withDatabase<T>(run: (db: IDBDatabase) => Promise<T>, options: { migrate?: boolean } = {}): Promise<T> {
  const db = await openDatabase();
  try {
    if (options.migrate !== false) await transaction(db, [...STORES], 'readwrite', tx => migrateLegacy(tx));
    return await run(db);
  }
  finally { db.close(); }
}

export function readRecord(store: StoreName, id: string): Promise<string | null> {
  return withDatabase(db => transaction(db, [store], 'readonly', async tx =>
    (await request(tx.objectStore(store).get(id))) ?? null));
}

export function updateRecord(store: StoreName, id: string, update: (raw: string | null) => string | null): Promise<void> {
  return withDatabase(db => transaction(db, [store], 'readwrite', async tx => {
    const records = tx.objectStore(store);
    const raw = update((await request(records.get(id))) ?? null);
    if (raw === null) records.delete(id); else records.put(raw, id);
  }));
}

export async function records(tx: IDBTransaction, name: StoreName): Promise<Record<string, string>> {
  const store = tx.objectStore(name);
  // Settle each request before starting the next: a synchronous getAll failure
  // must not leave a pending key-read promise unobserved when the transaction aborts.
  const keys = await request(store.getAllKeys());
  const values = await request(store.getAll());
  return Object.fromEntries(keys.map((key, index) => [String(key), values[index]]));
}

/** Recovery deliberately bypasses migration and validation, including damaged bytes. */
export async function libraryBackup(): Promise<string> {
  const db = await openDatabase();
  try {
    return await transaction(db, [...STORES], 'readonly', async tx => {
      const [projects, thumbnails, history, original, previous, meta] = await Promise.all([
        records(tx, 'projects'), records(tx, 'thumbnails'), records(tx, 'history'),
        request(tx.objectStore('meta').get('legacy-original')), request(tx.objectStore('meta').get('legacy-current')),
        records(tx, 'meta'),
      ]);
      const current = legacyStorage();
      if (!original && !Object.keys(projects).length && current[PROJECTS_STORAGE_KEY] !== undefined) return current[PROJECTS_STORAGE_KEY];
      return JSON.stringify({ format: 'openplan3d-library', version: 1, projects, thumbnails, history,
        legacy: { original, previous, current },
        recovery: Object.fromEntries(Object.entries(meta).filter(([key]) => key.startsWith('library-recovery:'))
          .map(([key, raw]) => [key.slice('library-recovery:'.length), raw])) });
    });
  } finally { db.close(); }
}

export function notifyLibraryChange(id: string) {
  // A tiny optional signal, never project data. Commit correctness does not depend
  // on notifications or localStorage quota; focus and saves recheck the database.
  try { localStorage.setItem(LIBRARY_CHANGE_KEY, JSON.stringify({ id, nonce: randomId() })); } catch {}
}
