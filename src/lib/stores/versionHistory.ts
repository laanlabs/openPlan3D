import { writable, get } from 'svelte/store';
import { currentProject, loadProject } from './project';
import { readProject } from '$lib/utils/projectValidation';
import type { Project } from '$lib/models/types';
import { readRecord, updateRecord } from '$lib/services/localDatabase';
import { storageErrorMessage } from '$lib/services/datastore';
import { readSnapshotStorage, writeSnapshotStorage } from '$lib/utils/snapshotStorage';

export interface Snapshot {
  timestamp: number;
  description: string;
  data: string; // JSON-stringified project
}

const MAX_SNAPSHOTS = 10;
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const snapshotError = writable<string | null>(null);

function parseSnapshots(raw: string | null): Snapshot[] {
  if (raw === null) return [];
  try {
    const snapshots = readSnapshotStorage(raw) as Snapshot[];
    if (!Array.isArray(snapshots) || snapshots.some(item => !item ||
        typeof item.timestamp !== 'number' || !Number.isFinite(item.timestamp) ||
        typeof item.description !== 'string' || typeof item.data !== 'string')) throw new Error();
    return snapshots;
  } catch {
    throw new Error('Version history could not be read. Download a backup before clearing damaged versions.');
  }
}

export async function getSnapshots(projectId: string): Promise<Snapshot[]> {
  return parseSnapshots(await readRecord('history', projectId));
}

/** Keep the raw history bytes available even if a snapshot cannot be opened. */
export async function downloadSnapshotBackup(projectId: string) {
  const raw = await readRecord('history', projectId);
  if (raw === null) throw new Error('No saved version history was found.');
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'openplan3d-version-history-backup.json'; link.click();
  URL.revokeObjectURL(url);
}

export const snapshotsStore = writable<Snapshot[]>([]);
let refreshRequest = 0;
const writeErrors = new Map<string, string>();
const unchanged = Symbol('unchanged');

/** With onlyIfChanged, a plan equal to the newest stored version is left alone: repeating it would only evict older versions. */
async function appendSnapshot(project: Project, description: string, onlyIfChanged: boolean) {
  // Freeze now: the editor may keep changing while storage is busy.
  const snapshot = { timestamp: Date.now(), description, data: JSON.stringify(project) };
  try {
    await updateRecord('history', project.id, raw => {
      const snapshots = parseSnapshots(raw);
      if (onlyIfChanged && snapshots.at(-1)?.data === snapshot.data) throw unchanged;
      return writeSnapshotStorage([...snapshots, snapshot].slice(-MAX_SNAPSHOTS));
    });
  } catch (error) {
    if (error === unchanged) return;
    const message = storageErrorMessage(error);
    writeErrors.set(project.id, message);
    if (get(currentProject)?.id === project.id) snapshotError.set(message);
    throw new Error(message); // Failed writes retain all previous versions, with no pruning retry.
  }
  writeErrors.delete(project.id);
  if (get(currentProject)?.id === project.id) await refreshSnapshots();
}

export async function saveSnapshot(project: Project, description: string, onlyIfChanged = false) {
  try { await appendSnapshot(project, description, onlyIfChanged); return true; }
  catch { return false; }
}

export async function restoreSnapshot(projectId: string, index: number, expected?: Snapshot): Promise<boolean> {
  const before = get(currentProject);
  try {
    const snapshots = await getSnapshots(projectId);
    if (get(currentProject) !== before || before?.id !== projectId) return false;
    if (!Number.isInteger(index) || index < 0 || index >= snapshots.length ||
        (expected && JSON.stringify(snapshots[index]) !== JSON.stringify(expected))) {
      throw new Error('This version changed. Close and reopen version history, then choose it again.');
    }
    const project = readProject(JSON.parse(snapshots[index].data));
    if (project.id !== projectId) throw new Error('This version belongs to a different project.');
    // Loading clears Undo and the next autosave overwrites the library copy: keep the version being replaced first.
    await appendSnapshot(before, 'Before restore', true);
    if (get(currentProject) !== before) return false;
    loadProject(project);
    snapshotError.set(null);
    return true;
  } catch (error) {
    if (get(currentProject) === before) snapshotError.set(`${error instanceof Error ? error.message : 'Could not read this version.'} Your current plan has not changed.`);
    return false;
  }
}

export async function deleteAllSnapshots(projectId: string) {
  await updateRecord('history', projectId, () => null);
  writeErrors.delete(projectId);
  if (get(currentProject)?.id === projectId) await refreshSnapshots();
}

export async function refreshSnapshots() {
  const request = ++refreshRequest, p = get(currentProject);
  try {
    const snapshots = p ? await getSnapshots(p.id) : [];
    if (request === refreshRequest && get(currentProject)?.id === p?.id) {
      snapshotsStore.set(snapshots);
      snapshotError.set(p ? writeErrors.get(p.id) ?? null : null);
    }
  } catch (error) {
    if (request !== refreshRequest || get(currentProject)?.id !== p?.id) return;
    snapshotsStore.set([]);
    snapshotError.set(storageErrorMessage(error));
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function initVersionHistory() {
  if (intervalId) return;
  intervalId = setInterval(() => {
    const p = get(currentProject);
    if (p) void saveSnapshot(p, 'Auto-save', true);
  }, SNAPSHOT_INTERVAL_MS);
  const p = get(currentProject);
  if (p) void saveSnapshot(p, 'Session start', true);
}

export function stopVersionHistory() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
}

export function snapshotOnAction(description: string) {
  const p = get(currentProject);
  if (p) void saveSnapshot(p, description);
}
