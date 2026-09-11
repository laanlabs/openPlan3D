import { get, writable } from 'svelte/store';
import type { TranslationKey } from '$lib/i18n';
import { autoSave, saveState } from '$lib/stores/saveStatus';
import { currentProject } from '$lib/stores/project';

export const loadingFailure = writable<TranslationKey | null>(null);

/** A concurrent edit or failed write must prevent a programmatic reload. */
export async function prepareToLeave(): Promise<boolean> {
  if (get(saveState) === 'saved') return true;
  const project = get(currentProject);
  if (!project) return false;
  return await autoSave() && get(saveState) === 'saved' && get(currentProject) === project;
}

export function reportLoadingFailure() {
  loadingFailure.set('deployment.loadingFailed');
}
