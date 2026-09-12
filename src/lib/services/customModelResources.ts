import type { Project } from '$lib/models/types';
import { loadCustomModel } from './customModelLoader';
import { cloneModel } from '$lib/utils/furnitureModelResources';

type Owner = Awaited<ReturnType<typeof loadCustomModel>>;
type Entry = { users: number; source?: string; metadata: string; controller: AbortController; owner?: Owner; ready: Promise<Owner> };
const projects = new WeakMap<Project, Map<string, Entry>>();

/** Acquire an independent instance, sharing decoded source images only while
 * leases remain live. Release after disposing the instance's GPU resources.
 * A released pending lease resolves null; the last lease cancels pending decode. */
export function acquireCustomModel(project: Project, id: string) {
  let entries = projects.get(project);
  if (!entries) { entries = new Map(); projects.set(project, entries); }
  const definition = project.customModels?.find(model => model.id === id);
  const source = definition && project.projectPackage?.assets[`assets/${definition.assetName}`];
  const metadata = JSON.stringify(definition) ?? '';
  let entry = entries.get(id);
  if (!entry || entry.source !== source || entry.metadata !== metadata) {
    const controller = new AbortController();
    const created: Entry = { users: 0, source, metadata, controller, ready: undefined! };
    created.ready = loadCustomModel(project, id, controller.signal).then(owner => {
      created.owner = owner;
      if (!created.users) owner.dispose();
      return owner;
    });
    entry = created; entries.set(id, entry);
  }
  const retained = entry;
  retained.users++;
  let released = false;
  return {
    model: retained.ready.then(owner => released ? null : cloneModel(owner.scene)),
    release() {
      if (released) return;
      released = true;
      if (--retained.users === 0) {
        if (entries!.get(id) === retained) entries!.delete(id);
        retained.controller.abort(); retained.owner?.dispose();
      }
    },
  };
}
