import { readProject } from '$lib/utils/projectValidation';
import { isRoomPlanJson } from '$lib/utils/roomplanValidation';
import { readSnapshotStorage, writeSnapshotStorage } from '$lib/utils/snapshotStorage';
import { migrateLegacy, notifyLibraryChange, request, transaction, withDatabase } from './localDatabase';
import { requestPersistentStorage } from './storagePersistence';

type StringMap = Record<string, string>;
type Version = { timestamp: number; description: string; data: string; [key: string]: unknown };
type PreparedProject = { sourceId: string; raw: string; thumbnail?: string; versions: Version[] };
export type RestoreEntry = Readonly<{ id: string; name: string; restorable: boolean; versions: number; warnings: readonly string[] }>;
export type RestoreResult = Readonly<{ projects: readonly { id: string; name: string }[]; recoveryArchives: number }>;
export interface LibraryRestorePreview {
  readonly entries: readonly RestoreEntry[];
  readonly projectCount: number;
  readonly recoveryArchives: number;
  readonly warnings: readonly string[];
  restore(signal?: AbortSignal): Promise<RestoreResult>;
}

const newId = () => globalThis.crypto?.randomUUID?.() ?? `restore-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function stringMap(value: unknown, label: string): StringMap {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(raw => typeof raw !== 'string')) {
    throw new Error(`${label} must contain project IDs and saved text. No projects were restored.`);
  }
  return Object.assign(Object.create(null), value);
}

/** Download JSON saves one project; restore it as a one-project library that keeps the file's bytes for recovery. */
function singleProject(data: Record<string, unknown>, raw: string): StringMap {
  const projects: StringMap = Object.create(null);
  projects[typeof data.id === 'string' && data.id.trim() ? data.id : 'project'] = raw;
  return projects;
}

/** A parsed file that holds a whole library: a current backup, or the project map an older release saved. */
export function isLibraryBackup(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const value = data as Record<string, unknown>;
  if (value.format === 'openplan3d-library') return true;
  const saved = Object.values(value);
  return !Array.isArray(value.floors) && saved.length > 0 && saved.every(raw => typeof raw === 'string') &&
    saved.some(raw => /^\s*\{/.test(raw as string));
}

/** Thrown by a plan-file reader handed a library backup, so its caller can open Restore library backup with that file. */
export class LibraryBackupFileError extends Error {
  constructor() {
    super('This file is a library backup. Use Restore library backup on the Projects page to add its projects.');
    this.name = 'LibraryBackupFileError';
  }
}

/** JSON.parse alone silently drops repeated keys. Check keys in each object,
 * including escaped spellings, while skipping encoded project/history strings.
 */
function parseBackup(raw: string): Record<string, unknown> {
  let value;
  try { value = JSON.parse(raw); }
  catch { throw new Error('This backup is not readable JSON. No projects were restored.'); }
  const objects: (Set<string> | null)[] = [];
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '{') objects.push(new Set());
    else if (char === '[') objects.push(null);
    else if (char === '}' || char === ']') objects.pop();
    else if (char === '"') {
      let end = i;
      do {
        end = raw.indexOf('"', end + 1);
        let slashes = 0;
        for (let k = end - 1; k > i && raw[k] === '\\'; k--) slashes++;
        if (slashes % 2 === 0) break;
      } while (end !== -1);
      let next = end + 1;
      while (/\s/.test(raw[next] ?? '') && next < raw.length) next++;
      const keys = objects.at(-1);
      if (keys && raw[next] === ':') {
        const key = JSON.parse(raw.slice(i, end + 1));
        if (keys.has(key)) throw new Error(`This backup repeats the key “${String(key).slice(0, 80)}”. No projects were restored.`);
        keys.add(key);
      }
      i = end;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose a library backup JSON file. No projects were restored.');
  return value;
}

/** Pure validation and preview. Private serialized candidates cannot be changed by
 * UI state while restoration waits for a transaction. No database access here.
 */
export function prepareLibraryRestore(raw: string, sourceName = 'Library backup', suffix = 'Restored copy'): LibraryRestorePreview {
  const copyName = (name: string) => `${name || 'Untitled Project'} (${suffix})`;
  const data = parseBackup(raw);
  const bundle = data.format === 'openplan3d-library';
  if (bundle && data.version !== 1) throw new Error('This library backup version is not supported. No projects were restored.');
  if (!bundle && isRoomPlanJson(data)) throw new Error('This is a RoomPlan scan or an interchange JSON file, not a backup. Open it with Import JSON in the editor. No projects were restored.');
  const projects = !bundle && Array.isArray(data.floors) ? singleProject(data, raw) : stringMap(bundle ? data.projects : data, 'The project library');
  const thumbnails = stringMap(bundle ? data.thumbnails ?? {} : {}, 'Thumbnails');
  const history = stringMap(bundle ? data.history ?? {} : {}, 'Version history');
  const recovery = stringMap(bundle ? data.recovery ?? {} : {}, 'Recovery archives');
  const retainedProjects: StringMap = Object.create(null), retainedThumbnails: StringMap = Object.create(null), retainedHistory: StringMap = Object.create(null);
  const candidates: PreparedProject[] = [], entries: RestoreEntry[] = [], warnings: string[] = [];
  for (const [id, projectRaw] of Object.entries(projects)) {
    const notes: string[] = [];
    let project;
    try {
      project = readProject(JSON.parse(projectRaw));
      if (project.id !== id) throw new Error('The project ID does not match its library entry.');
    } catch (error) {
      retainedProjects[id] = projectRaw;
      entries.push(Object.freeze({ id, name: id, restorable: false, versions: 0,
        warnings: Object.freeze([error instanceof SyntaxError ? 'This saved project is not readable JSON.' : error instanceof Error ? error.message : 'This project could not be read.']) }));
      continue;
    }
    let versions: Version[] = [];
    if (history[id] !== undefined) {
      let damaged = 0;
      try {
        const snapshots = readSnapshotStorage(history[id]) as any[];
        if (!Array.isArray(snapshots)) throw new Error();
        for (const item of snapshots) {
          try {
            if (!item || typeof item.timestamp !== 'number' || !Number.isFinite(item.timestamp) ||
                typeof item.description !== 'string' || typeof item.data !== 'string') throw new Error();
            const version = readProject(JSON.parse(item.data));
            if (version.id !== id) throw new Error();
            versions.push({ ...item, data: JSON.stringify(version) });
          } catch { damaged++; }
        }
        if (damaged) notes.push(`${damaged} damaged version${damaged === 1 ? '' : 's'} kept for recovery.`);
        if (versions.length > 10) notes.push('The latest 10 valid versions will be restored; the full history is kept for recovery.');
        if (damaged || versions.length > 10) retainedHistory[id] = history[id];
        versions = versions.slice(-10);
      } catch {
        retainedHistory[id] = history[id];
        notes.push('Unreadable version history kept for recovery.');
      }
    }
    let thumbnail: string | undefined;
    if (thumbnails[id] !== undefined) {
      if (/^data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/]*={0,2}$/.test(thumbnails[id])) thumbnail = thumbnails[id];
      else { retainedThumbnails[id] = thumbnails[id]; notes.push('Unsupported preview image kept for recovery.'); }
    }
    candidates.push({ sourceId: id, raw: JSON.stringify(project), thumbnail, versions });
    entries.push(Object.freeze({ id, name: project.name || 'Untitled Project', restorable: true, versions: versions.length, warnings: Object.freeze(notes) }));
  }
  const restorableIds = new Set(candidates.map(p => p.sourceId));
  for (const [id, raw] of Object.entries(history)) if (!restorableIds.has(id)) retainedHistory[id] = raw;
  for (const [id, raw] of Object.entries(thumbnails)) if (!restorableIds.has(id)) retainedThumbnails[id] = raw;
  const unavailable = entries.length - candidates.length;
  if (unavailable) warnings.push(`${unavailable} damaged project${unavailable === 1 ? '' : 's'} will be kept for recovery instead of opened.`);
  const orphans = new Set([...Object.keys(history), ...Object.keys(thumbnails)].filter(id => !Object.hasOwn(projects, id))).size;
  if (orphans) warnings.push(`Attachments for ${orphans} missing project${orphans === 1 ? '' : 's'} will be kept for recovery.`);
  // Carry prior recovery archives as flat opaque records, never nest an entire
  // backup within its next backup or reactivate deleted legacy projects.
  const archives = Object.entries(recovery).map(([id, raw]) => ({ id, raw }));
  const metadata = bundle ? Object.fromEntries(Object.entries(data).filter(([key]) =>
    !['format', 'version', 'projects', 'thumbnails', 'history', 'recovery'].includes(key))) : {};
  const legacy = metadata.legacy;
  if (legacy && typeof legacy === 'object' && !Array.isArray(legacy) && Object.values(legacy).every(snapshot =>
      snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) && Object.keys(snapshot).length === 0)) delete metadata.legacy;
  if (Object.keys(retainedProjects).length || Object.keys(retainedHistory).length || Object.keys(retainedThumbnails).length || Object.keys(metadata).length) {
    archives.push({ id: newId(), raw: JSON.stringify({ format: 'openplan3d-recovery', version: 1, sourceName,
      projects: retainedProjects, history: retainedHistory, thumbnails: retainedThumbnails, metadata }) });
  }
  if (archives.length) warnings.push(`${archives.length} recovery archive${archives.length === 1 ? '' : 's'} will be included in future library backups.`);

  let active: Promise<RestoreResult> | undefined, completed: RestoreResult | undefined;
  const restore = (signal?: AbortSignal): Promise<RestoreResult> => {
    if (completed) return Promise.resolve(completed);
    if (active) return active;
    if (signal?.aborted) return Promise.reject(new DOMException('Restore cancelled.', 'AbortError'));
    if (!candidates.length && !archives.length) return Promise.reject(new Error('This backup contains no projects or recovery data.'));
    active = withDatabase(db => transaction(db, ['projects', 'thumbnails', 'history', 'meta'], 'readwrite', async tx => {
      await migrateLegacy(tx, true);
      const saved: { id: string; name: string }[] = [];
      const store = tx.objectStore('projects');
      for (const candidate of candidates) {
        let id: string, attempts = 0;
        do {
          if (++attempts > 5) throw new Error('Could not choose a restored project ID. Try restoring again.');
          id = newId();
        } while (await request(store.get(id)) !== undefined || Object.hasOwn(projects, id));
        const project = JSON.parse(candidate.raw);
        project.id = id; project.name = copyName(project.name); project.updatedAt = new Date();
        await request(store.add(JSON.stringify(project), id));
        if (candidate.thumbnail) await request(tx.objectStore('thumbnails').add(candidate.thumbnail, id));
        if (candidate.versions.length) {
          const versions = candidate.versions.map(item => {
            const project = JSON.parse(item.data);
            project.id = id; project.name = copyName(project.name);
            return { ...item, data: JSON.stringify(project) };
          });
          await request(tx.objectStore('history').add(writeSnapshotStorage(versions), id));
        }
        saved.push({ id, name: project.name });
      }
      for (const archive of archives) {
        const meta = tx.objectStore('meta');
        let id = archive.id, attempts = 0;
        while (true) {
          const existing = await request(meta.get(`library-recovery:${id}`));
          if (existing === archive.raw) break;
          if (existing === undefined) { await request(meta.add(archive.raw, `library-recovery:${id}`)); break; }
          if (++attempts > 5) throw new Error('Could not preserve recovery data. Try restoring again.');
          id = newId();
        }
      }
      return Object.freeze({ projects: Object.freeze(saved.map(p => Object.freeze(p))), recoveryArchives: archives.length });
    }, signal), { migrate: false }).then(result => {
      completed = result;
      for (const project of result.projects) notifyLibraryChange(project.id);
      void requestPersistentStorage();
      return result;
    }).finally(() => { active = undefined; });
    return active;
  };
  return Object.freeze({ entries: Object.freeze(entries), projectCount: candidates.length, recoveryArchives: archives.length, warnings: Object.freeze(warnings), restore });
}
