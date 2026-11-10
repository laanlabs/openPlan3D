import { dev } from '$app/environment';
import { base } from '$app/paths';
import { get } from 'svelte/store';
import type { Project } from '$lib/models/types';
import { currentProject, applyExternalProject, afterUndoGroup } from '$lib/stores/project';
import { saveState } from '$lib/stores/saveStatus';
import { localStore } from '$lib/services/datastore';
import { openProject } from '$lib/services/projectOpening';
import { applyAgentOps, leanProject, listElements, summarizeProject } from '$lib/utils/agentOps';
import { readProject } from '$lib/utils/projectValidation';

export interface AgentRequest { requestId: string; kind: string; args: Record<string, any> }

/**
 * How long an edit waits for the user's gesture (a drag) to finish before it is refused. Below the server's 15 s
 * relay timeout, so the agent hears "retry" instead of a timeout for an edit that would then land anyway.
 */
export const GESTURE_WAIT_MS = 10_000;

/** The open project, if it is still `id`: an edit that waited for a gesture must not reach another project. */
function stillOpen(id: string): Project {
  const project = get(currentProject);
  if (project?.id !== id) throw new Error(`The editor opened another project while this edit waited; "${id}" was not changed.`);
  return project;
}

/**
 * Answer one agent request against this tab's open project. Edits wait for an open undo group (a drag) to close
 * (afterUndoGroup), so each is its own Undo step computed from what the gesture left; opening another project goes
 * through openProject(), which saves the current plan first.
 */
export async function answerAgentRequest(req: Pick<AgentRequest, 'kind' | 'args'>): Promise<unknown> {
  const project = get(currentProject);
  if (!project) throw new Error('No project is open in this tab.');
  if (req.args.projectId && req.args.projectId !== project.id) throw new Error(`This tab has "${project.id}" open, not "${req.args.projectId}".`);
  switch (req.kind) {
    case 'status': return { projectId: project.id, name: project.name, saveState: get(saveState) };
    case 'summary': return summarizeProject(project);
    case 'get': return leanProject(project);
    case 'list': return listElements(project, req.args);
    case 'apply': {
      const description = typeof req.args.description === 'string' ? req.args.description.slice(0, 80) : 'Agent edit';
      return afterUndoGroup(() => {
        const { project: next, changed } = applyAgentOps(stillOpen(project.id), req.args.ops);
        return { applied: applyExternalProject(next, description), changed };
      }, GESTURE_WAIT_MS);
    }
    case 'library': return localStore.list();
    case 'delete': {
      const ids: string[] = (req.args.ids ?? []).map(String);
      if (ids.includes(project.id)) throw new Error(`"${project.id}" is open in this tab; it can't be deleted here.`);
      const known = new Set((await localStore.list()).map(p => p.id));
      const missing = ids.filter(id => !known.has(id));
      if (missing.length) throw new Error(`Not in the library: ${missing.join(', ')}. Nothing was deleted.`);
      for (const id of ids) await localStore.delete(id);
      return { deleted: ids };
    }
    case 'replace': {
      const next = readProject(req.args.project);
      const description = typeof req.args.description === 'string' ? req.args.description.slice(0, 80) : 'Agent replaced project';
      if (next.id === project.id) {
        return afterUndoGroup(() => {
          stillOpen(project.id);
          return { applied: applyExternalProject(next, description), projectId: next.id };
        }, GESTURE_WAIT_MS);
      }
      if (!req.args.open) throw new Error(`The project id "${next.id}" differs from the open "${project.id}"; pass open=true to open it instead.`);
      // The editor's own open path: save the current plan first (refuse if that fails), import an id the library
      // already holds as a copy, and give way to an open the user started meanwhile.
      await afterUndoGroup(() => stillOpen(project.id), GESTURE_WAIT_MS);
      const opened = await openProject(() => req.args.project);
      if (!opened) throw new Error('Another project was opened in the editor first; nothing was opened.');
      return { opened: opened.id, ...(opened.id !== next.id ? { copyOf: next.id } : {}) };
    }
    default: throw new Error(`Unknown request "${req.kind}".`);
  }
}

/**
 * Tab side of the local agent bridge (docs/agent-bridge.md). In `npm run dev` the editor connects to the dev server,
 * answers agent requests against the open project — reads, and edits applied as one Undo step each — and reports
 * completed saves (mirrored to a folder when the server has OPENPLAN3D_MIRROR_DIR). Inactive in production builds.
 */
export function startAgentBridge(): () => void {
  if (!dev || typeof window === 'undefined' || typeof EventSource === 'undefined') return () => {};
  const tab = (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 32);
  const post = (path: string, body: unknown) =>
    fetch(`${base}/agent-bridge/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
  let source: EventSource | null = null;
  let lastProjectId: string | null | undefined;
  const hello = () => post('reply', { tab, hello: true, projectId: get(currentProject)?.id ?? null });

  async function handle(req: AgentRequest) {
    try {
      const result = await answerAgentRequest(req);
      await post('reply', { tab, requestId: req.requestId, ok: true, result });
    } catch (error) {
      await post('reply', { tab, requestId: req.requestId, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  source = new EventSource(`${base}/agent-bridge/events?tab=${tab}&project=${encodeURIComponent(get(currentProject)?.id ?? '')}`);
  source.addEventListener('request', (event) => void handle(JSON.parse((event as MessageEvent).data)));
  // the project's mirrored file was edited on disk (by a tool or an agent): take it over as one Undo step
  source.addEventListener('external', (event) => {
    const { project } = JSON.parse((event as MessageEvent).data);
    afterUndoGroup(() => {
      if (get(currentProject)?.id === project?.id) applyExternalProject(readProject(project), 'Edited on disk');
    }).catch(error => console.warn('[agent bridge] could not apply the project edited on disk:', error));
  });
  // A server without the bridge (production, remote clients) answers 404: the browser closes the stream; stay quiet.
  source.onerror = () => { if (source?.readyState === EventSource.CLOSED) source = null; };

  // Reconcile with the server's mirror whenever this tab opens a project: pick up edits agents made while no editor
  // was open (one Undo step), or report our newer copy.
  const sync = async () => {
    const p = get(currentProject);
    if (!p) return;
    const res = await fetch(`${base}/agent-bridge/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tab, projectId: p.id, updatedAt: new Date(p.updatedAt).toISOString() }) }).catch(() => null);
    if (!res?.ok) return;
    const answer = await res.json().catch(() => ({}));
    if (answer.pull) {
      afterUndoGroup(() => {
        if (get(currentProject)?.id === p.id) applyExternalProject(readProject(answer.pull), 'Changes made while the editor was closed');
      }).catch(error => console.warn('[agent bridge] could not apply the newer mirrored project:', error));
    } else if (answer.push) void post('saved', { tab, project: get(currentProject) });
  };
  const stopProject = currentProject.subscribe((p) => {
    if ((p?.id ?? null) !== lastProjectId) { lastProjectId = p?.id ?? null; void hello(); void sync(); }
  });
  let previous = get(saveState);
  const stopSave = saveState.subscribe((state) => {
    if (state === 'saved' && previous !== 'saved' && source) {
      const p = get(currentProject);
      if (p) void post('saved', { tab, project: p });
    }
    previous = state;
  });
  const onFocus = () => void hello();
  window.addEventListener('focus', onFocus);
  return () => {
    source?.close();
    stopProject();
    stopSave();
    window.removeEventListener('focus', onFocus);
  };
}
