import { get } from 'svelte/store';
import type { Project } from '$lib/models/types';
import { currentProject, loadProject } from '$lib/stores/project';
import { autoSave, markClean, saveError, saveState } from '$lib/stores/saveStatus';
import { readProject } from '$lib/utils/projectValidation';
import { randomId } from '$lib/utils/randomId';
import { localStore, ProjectConflictError } from './datastore';
import { prepareToLeave } from './deployment';

let latestRequest = 0;

/** An ID the library lacks stays taken while this tab remembers a revision of it: the store refuses to recreate a deleted plan. */
async function taken(id: string): Promise<boolean> {
  if (await localStore.has(id)) return true;
  try { await localStore.assertCurrent(id); return false; }
  catch (error) { if (error instanceof ProjectConflictError) return true; throw error; }
}

/** Validate first, preserve the current plan, then open a separate local project. */
export async function openProject(
  readCandidate: () => unknown | Promise<unknown>,
  kind: 'import' | 'new' = 'import',
  signal?: AbortSignal,
): Promise<Project | null> {
  const request = ++latestRequest;
  const originId = get(currentProject)?.id;
  const superseded = () => signal?.aborted || request !== latestRequest || get(currentProject)?.id !== originId;
  try {
    if (signal?.aborted) return null;
    const candidate = readProject(await readCandidate());
    if (superseded()) return null;
    const previous = get(currentProject);
    if (!await prepareToLeave()) {
      if (superseded()) return null;
      throw new Error(`Your current plan could not be saved. ${get(saveError) ?? 'Retry saving or download a JSON backup before opening another plan.'}`);
    }
    if (superseded()) return null;
    // Test existence without decoding a damaged entry: importing a recovery file
    // must preserve those original bytes, too. A plan this tab opened that was
    // deleted since (here or in another tab) cannot be saved under its old ID
    // again, so its backup imports as a copy.
    const newId = () => randomId();
    let collision = candidate.id === previous?.id;
    let storageReadable = true;
    try { collision = await taken(candidate.id) || collision; }
    catch { storageReadable = false; }
    if (collision || !storageReadable) {
      let attempts = 0;
      do {
        if (++attempts > 5) throw new Error('Could not choose a new project ID. Try opening the file again.');
        candidate.id = newId();
      } while (storageReadable && await taken(candidate.id));
      if (collision) candidate.name = `${candidate.name || 'Untitled Project'} (${kind === 'import' ? 'Imported copy' : 'Copy'})`;
      candidate.createdAt = new Date();
    }
    if (superseded()) return null;
    if (get(currentProject) !== previous || get(saveState) !== 'saved') {
      throw new Error('Your plan changed while preparing to open another one. Try again so the latest edits can be saved first.');
    }
    candidate.updatedAt = new Date();
    loadProject(candidate);
    // A candidate that cannot fit in storage is still available for local export.
    // The previously saved plan stays in the library and normal save feedback applies.
    await autoSave();
    return !signal?.aborted && request === latestRequest && get(currentProject)?.id === candidate.id ? candidate : null;
  } catch (error) {
    if (signal?.aborted || request !== latestRequest) return null;
    throw error;
  }
}

/** Open a project the library already holds (an imported package copy), after saving the current plan. */
export async function openStoredProject(id: string, signal?: AbortSignal): Promise<Project | null> {
  const request = ++latestRequest;
  const superseded = () => signal?.aborted || request !== latestRequest;
  try {
    const project = await localStore.load(id);
    if (superseded()) return null;
    if (!project) throw new Error('This project is no longer in your library.');
    if (!await prepareToLeave()) {
      if (superseded()) return null;
      throw new Error(`Your current plan could not be saved. ${get(saveError) ?? 'Retry saving or download a JSON backup before opening another plan.'}`);
    }
    if (superseded()) return null;
    if (get(saveState) !== 'saved') throw new Error('Your plan changed while preparing to open another one. Try again so the latest edits can be saved first.');
    loadProject(project);
    markClean();
    return project;
  } catch (error) {
    if (superseded()) return null;
    throw error;
  }
}
