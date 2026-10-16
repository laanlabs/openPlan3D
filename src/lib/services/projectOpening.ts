import { get } from 'svelte/store';
import type { Project } from '$lib/models/types';
import { currentProject, loadProject } from '$lib/stores/project';
import { autoSave, saveError, saveState } from '$lib/stores/saveStatus';
import { readProject } from '$lib/utils/projectValidation';
import { randomId } from '$lib/utils/randomId';
import { localStore } from './datastore';
import { prepareToLeave } from './deployment';

let latestRequest = 0;

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
    // must preserve those original bytes, too.
    const newId = () => randomId();
    let collision = candidate.id === previous?.id;
    let storageReadable = true;
    try { collision = await localStore.has(candidate.id) || collision; }
    catch { storageReadable = false; }
    if (collision || !storageReadable) {
      let attempts = 0;
      do {
        if (++attempts > 5) throw new Error('Could not choose a new project ID. Try opening the file again.');
        candidate.id = newId();
      } while (storageReadable && await localStore.has(candidate.id));
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
