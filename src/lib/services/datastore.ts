import { readProject } from '$lib/utils/projectValidation';
import type { Project } from '$lib/models/types';
import { withDatabase, transaction, request, records, readRecord, libraryBackup, notifyLibraryChange } from './localDatabase';
import { requestPersistentStorage } from './storagePersistence';
export { PROJECTS_STORAGE_KEY, LIBRARY_CHANGE_KEY } from './localDatabase';

export interface DataStore {
  has(id: string): Promise<boolean>;
  assertCurrent(id: string): Promise<void>;
  saveCopy(project: Project, suffix?: string): Promise<Project>;
  save(project: Project): Promise<void>;
  load(id: string): Promise<Project | null>;
  list(): Promise<{ id: string; name: string; updatedAt: string }[]>;
  delete(id: string): Promise<void>;
  duplicate(id: string): Promise<Project | null>;
  saveThumbnail(id: string, dataUrl: string): Promise<void>;
  getThumbnail(id: string): Promise<string | null>;
  getThumbnails(): Promise<Record<string, string>>;
}


export class ProjectConflictError extends Error {
  constructor() {
    super('This project changed or was deleted in another tab. Save your version as a copy or download a JSON backup to keep both versions.');
    this.name = 'ProjectConflictError';
  }
}

/** Keep in-document saves ordered; IndexedDB transactions also protect browsers without Web Locks.
 *  The lock callback never rejects: Firefox reports a lock callback that rejects at once (indexedDB.open with
 *  site data blocked) as an uncaught error even though the request's promise is handled, so the outcome is
 *  carried out of the lock and rethrown here. */
async function mutateLibrary<T>(change: () => Promise<T>): Promise<T> {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.locks?.request) {
    const outcome = await navigator.locks.request('openplan3d-project-library', async () => {
      try { return { ok: true as const, value: await change() }; }
      catch (error) { return { ok: false as const, error }; }
    });
    if (!outcome.ok) throw outcome.error;
    return outcome.value;
  }
  // IndexedDB compare-and-write transactions remain atomic without Web Locks.
  return change();
}

export function storageErrorMessage(error: unknown): string {
  const e = error as { name?: string; code?: number; message?: string } | null;
  if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
    return 'Browser storage is full. Download your project as JSON, then free space by deleting projects you have backed up.';
  }
  if (e?.name === 'SecurityError') {
    return 'Browser storage is unavailable. Allow site storage or download your project as JSON.';
  }
  return e?.message || 'Could not save to browser storage. Download your project as JSON to keep a copy.';
}

/** Preserve the original bytes, including a damaged library, for manual recovery. */
export async function downloadLibraryBackup() {
  const raw = await libraryBackup();
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'openplan3d-library-backup.json';
  link.click();
  URL.revokeObjectURL(url);
}

/** Each browser document remembers only revisions it actually opened or saved. */
export function createLocalStore(): DataStore {
  const opened = new Map<string, string | null>();
  const listed = new Map<string, string>();
  const generations = new Map<string, number>();
  const check = (id: string, raw: string | null) => {
    if (raw !== (opened.get(id) ?? null)) throw new ProjectConflictError();
  };
  return {
    async has(id) { return (await readRecord('projects', id)) !== null; },

    async assertCurrent(id) { check(id, await readRecord('projects', id)); },

    async save(project) {
      const id = project.id, raw = JSON.stringify(project), generation = generations.get(id);
      await mutateLibrary(async () => {
        await withDatabase(db => transaction(db, ['projects'], 'readwrite', async tx => {
          const projects = tx.objectStore('projects');
          const stored = (await request(projects.get(id))) ?? null;
          if (generation !== generations.get(id)) throw new ProjectConflictError();
          check(id, stored);
          projects.put(raw, id);
        }));
        // A successful request alone is not a committed transaction.
        opened.set(id, raw);
        notifyLibraryChange(id);
      });
      // Committed work can now ask the browser to keep the library; the save never waits.
      void requestPersistentStorage();
    },

    async saveCopy(project, suffix = 'Recovered copy') {
      const copy = readProject(project);
      copy.name = `${copy.name || 'Untitled Project'} (${suffix})`;
      copy.createdAt = copy.updatedAt = new Date();
      return mutateLibrary(async () => {
        await withDatabase(db => transaction(db, ['projects'], 'readwrite', async tx => {
          const projects = tx.objectStore('projects');
          let attempts = 0;
          do {
            if (++attempts > 5) throw new Error('Could not choose a new project ID. Try saving a copy again.');
            copy.id = globalThis.crypto?.randomUUID?.() ?? `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
          } while (await request(projects.get(copy.id)) !== undefined);
          projects.add(JSON.stringify(copy), copy.id);
        }));
        opened.set(copy.id, JSON.stringify(copy));
        notifyLibraryChange(copy.id);
        void requestPersistentStorage();
        return copy;
      });
    },

    async load(id) {
      // Invalidate queued saves immediately, including while this read is waiting.
      generations.set(id, (generations.get(id) ?? 0) + 1);
      const raw = await readRecord('projects', id);
      if (raw === null) { opened.set(id, null); return null; }
      const project = readProject(JSON.parse(raw));
      if (project.id !== id) throw new Error('The saved project ID does not match its library entry. Download a library backup before recovery.');
      opened.set(id, raw);
      return project;
    },

    async list() {
      const all = await withDatabase(db => transaction(db, ['projects'], 'readonly', tx => records(tx, 'projects')));
      const projects = Object.entries(all).map(([id, raw]) => {
        try {
          const p = JSON.parse(raw);
          if (!p || typeof p.name !== 'string' || typeof p.updatedAt !== 'string' || !Number.isFinite(Date.parse(p.updatedAt))) throw new Error();
          return { id, name: p.name, updatedAt: p.updatedAt };
        } catch {
          // Keep damaged entries visible and deletable without hiding healthy or
          // restored projects. Opening still validates; backups retain raw bytes.
          return { id, name: `Unreadable project — ${id}`, updatedAt: new Date(0).toISOString() };
        }
      });
      listed.clear();
      for (const [id, raw] of Object.entries(all)) listed.set(id, raw);
      return projects;
    },

    async delete(id) {
      await mutateLibrary(async () => {
        await withDatabase(db => transaction(db, ['projects', 'thumbnails', 'history'], 'readwrite', async tx => {
          const projects = tx.objectStore('projects');
          const expected = listed.has(id) ? listed.get(id) : opened.get(id);
          if (((await request(projects.get(id))) ?? null) !== (expected ?? null)) throw new ProjectConflictError();
          projects.delete(id);
          tx.objectStore('thumbnails').delete(id);
          tx.objectStore('history').delete(id);
        }));
        // Retain the opened revision so this editor cannot recreate a deleted plan.
        listed.delete(id);
        notifyLibraryChange(id);
      });
    },

    async duplicate(id) {
      // Copying is not opening, so this tab's record of the original stays as it is: a save the
      // editor queued on the way out must still land, not fail as a conflict. Waiting for queued
      // library writes first lets the copy include those edits.
      await mutateLibrary(async () => {});
      const raw = await readRecord('projects', id);
      if (raw === null) return null;
      const original = readProject(JSON.parse(raw));
      if (original.id !== id) throw new Error('The saved project ID does not match its library entry. Download a library backup before recovery.');
      const dup = await this.saveCopy(original, 'Copy');
      const thumb = await this.getThumbnail(id);
      if (thumb) await this.saveThumbnail(dup.id, thumb);
      return dup;
    },

    async saveThumbnail(id, dataUrl) {
      const expected = opened.get(id);
      try {
        await withDatabase(db => transaction(db, ['projects', 'thumbnails'], 'readwrite', async tx => {
          if (expected === undefined || expected === null || await request(tx.objectStore('projects').get(id)) !== expected) return;
          tx.objectStore('thumbnails').put(dataUrl, id);
        }));
      } catch {} // Previews are optional; a failed preview cannot invalidate a saved plan.
    },

    async getThumbnail(id) {
      try { return await readRecord('thumbnails', id); } catch { return null; }
    },

    async getThumbnails() {
      try { return await withDatabase(db => transaction(db, ['thumbnails'], 'readonly', tx => records(tx, 'thumbnails'))); }
      catch { return {}; }
    },
  };
}

export const localStore = createLocalStore();
