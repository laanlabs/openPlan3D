import { get } from 'svelte/store';
import { layerVisibility } from './project';
import { projectSettings } from './settings';
import { planExportVisibility, type PlanExportVisibility } from '$lib/utils/exportVisibility';

/** What the plan exports draw right now: the 2D view's layers, room labels and automatic dimension settings. */
export function currentPlanExportVisibility(): PlanExportVisibility {
  return planExportVisibility(get(layerVisibility), get(projectSettings));
}
