import { dev } from '$app/environment';
import { base } from '$app/paths';
import { get } from 'svelte/store';
import { currentProject, applyExternalProject, loadProject } from '$lib/stores/project';
import { saveState, autoSave } from '$lib/stores/saveStatus';
import { localStore } from '$lib/services/datastore';
import { applyAgentOps, leanProject, listElements, summarizeProject } from '$lib/utils/agentOps';
import { readProject } from '$lib/utils/projectValidation';

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

  async function handle(req: { requestId: string; kind: string; args: Record<string, any> }) {
    try {
      const project = get(currentProject);
      if (!project) throw new Error('No project is open in this tab.');
      if (req.args.projectId && req.args.projectId !== project.id) throw new Error(`This tab has "${project.id}" open, not "${req.args.projectId}".`);
      let result: unknown;
      switch (req.kind) {
        case 'status': result = { projectId: project.id, name: project.name, saveState: get(saveState) }; break;
        case 'summary': result = summarizeProject(project); break;
        case 'get': result = leanProject(project); break;
        case 'list': result = listElements(project, req.args); break;
        case 'apply': {
          const { project: next, changed } = applyAgentOps(project, req.args.ops);
          const applied = applyExternalProject(next, typeof req.args.description === 'string' ? req.args.description.slice(0, 80) : 'Agent edit');
          result = { applied, changed };
          break;
        }
        case 'library': result = await localStore.list(); break;
        case 'delete': {
          const ids: string[] = (req.args.ids ?? []).map(String);
          if (ids.includes(project.id)) throw new Error(`"${project.id}" is open in this tab; it can't be deleted here.`);
          const known = new Set((await localStore.list()).map(p => p.id));
          const missing = ids.filter(id => !known.has(id));
          if (missing.length) throw new Error(`Not in the library: ${missing.join(', ')}. Nothing was deleted.`);
          for (const id of ids) await localStore.delete(id);
          result = { deleted: ids };
          break;
        }
        case 'replace': {
          const next = readProject(req.args.project);
          if (next.id === project.id) result = { applied: applyExternalProject(next, req.args.description ?? 'Agent replaced project'), projectId: next.id };
          else if (req.args.open) { loadProject(next); await autoSave(); result = { opened: next.id }; }
          else throw new Error(`The project id "${next.id}" differs from the open "${project.id}"; pass open=true to open it instead.`);
          break;
        }
        default: throw new Error(`Unknown request "${req.kind}".`);
      }
      await post('reply', { tab, requestId: req.requestId, ok: true, result });
    } catch (error) {
      await post('reply', { tab, requestId: req.requestId, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  source = new EventSource(`${base}/agent-bridge/events?tab=${tab}&project=${encodeURIComponent(get(currentProject)?.id ?? '')}`);
  source.addEventListener('request', (event) => void handle(JSON.parse((event as MessageEvent).data)));
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
    if (answer.pull && get(currentProject)?.id === p.id) {
      try { applyExternalProject(readProject(answer.pull), 'Changes made while the editor was closed'); }
      catch (error) { console.warn('[agent bridge] could not apply the newer mirrored project:', error); }
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
