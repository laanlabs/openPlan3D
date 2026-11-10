import { mkdir, writeFile, rename, readFile, readdir, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { applyAgentOps, leanProject, listElements, summarizeProject } from '$lib/utils/agentOps';
import { readProject } from '$lib/utils/projectValidation';

/**
 * Local agent bridge: lets an agent on the same machine read and edit the project open in an editor tab, through the
 * dev server. The project lives in the tab (IndexedDB), so every request is relayed to a connected tab over
 * Server-Sent Events and answered by it; nothing is stored here except the optional save mirror.
 *
 * Enabled only in `npm run dev` (or with OPENPLAN3D_AGENT_BRIDGE=1) and only for loopback clients. Nothing here
 * reaches the cloud. OPENPLAN3D_MIRROR_DIR=<dir> also writes every saved project to <dir>/<project id>.json.
 *
 * With a mirror folder, agents don't need an open tab: without one, reads and edits work on the mirrored file
 * (same validated operations), and a tab that later opens the project catches up from it (see syncTab).
 */
export type BridgeKind = 'status' | 'summary' | 'get' | 'list' | 'apply' | 'replace' | 'library' | 'delete';
interface Tab { id: string; send: (event: string, data: unknown) => void; projectId: string | null; seen: number }
interface Pending { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
interface Hub { tabs: Map<string, Tab>; pending: Map<string, Pending>; seq: number; written: Map<string, string>; watching?: string }

// one hub per server process; globalThis keeps it across dev-server module reloads
const hub: Hub = ((globalThis as any).__openplanAgentBridge ??= { tabs: new Map(), pending: new Map(), seq: 0, written: new Map() });
hub.written ??= new Map();

export class BridgeError extends Error {}

export function bridgeEnabled(dev: boolean, env: Record<string, string | undefined> = process.env): boolean {
  return dev || env.OPENPLAN3D_AGENT_BRIDGE === '1';
}
/** Loopback only: the bridge can rewrite the open project. */
export function isLocalClient(address: string): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1' || address === 'localhost';
}

/**
 * Files in the mirror folder are an editing interface too: when <dir>/<id>.json changes and it wasn't this server's
 * own write, tabs with that project open get the new version (applied as one Undo step).
 */
function watchMirror() {
  const dir = mirrorDir();
  if (!dir || hub.watching === dir) return;
  hub.watching = dir;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  try {
    watch(dir, (_event, name) => {
      if (!name || !name.endsWith('.json')) return;
      const id = name.slice(0, -5);
      clearTimeout(timers.get(id));
      timers.set(id, setTimeout(async () => {
        let text: string;
        try { text = await readFile(mirrorFile(dir, id), 'utf8'); } catch { return; }
        if (hub.written.get(id) === text) return; // our own write echoing back
        let project: any;
        try { project = readProject(JSON.parse(text)); } catch (error) {
          console.warn(`[agent bridge] ${name} changed on disk but is not a valid project; ignored:`, error instanceof Error ? error.message : error);
          return;
        }
        hub.written.set(id, text);
        for (const tab of hub.tabs.values()) if (tab.projectId === id) tab.send('external', { project });
      }, 300));
    });
  } catch (error) { console.warn('[agent bridge] cannot watch the mirror folder:', error); hub.watching = undefined; }
}

export function connectTab(id: string, send: Tab['send']): () => void {
  watchMirror();
  hub.tabs.set(id, { id, send, projectId: null, seen: Date.now() });
  return () => { hub.tabs.delete(id); };
}

export function tabHello(id: string, projectId: string | null) {
  const tab = hub.tabs.get(id);
  if (tab) { tab.projectId = projectId; tab.seen = Date.now(); }
}

/** The tab answering requests: the one most recently active (focused, saving or reporting its project). */
function activeTab(projectId?: string): Tab {
  const tabs = [...hub.tabs.values()].filter(t => !projectId || t.projectId === projectId).sort((a, b) => b.seen - a.seen);
  if (!tabs.length) throw new BridgeError(projectId
    ? `No editor tab has project "${projectId}" open. Open it in the editor (local dev server) and retry.`
    : 'No editor tab is connected. Open the editor from the local dev server (npm run dev) and retry.');
  return tabs[0];
}

const mirrorDir = () => process.env.OPENPLAN3D_MIRROR_DIR || null;
const SAFE_ID = /^[A-Za-z0-9_.-]{1,128}$/;
const mirrorFile = (dir: string, id: string) => path.join(dir, `${id}.json`);
async function readMirror(dir: string, id: string): Promise<any | null> {
  try { return JSON.parse(await readFile(mirrorFile(dir, id), 'utf8')); } catch { return null; }
}
async function writeMirror(dir: string, project: any) {
  await mkdir(dir, { recursive: true });
  const file = mirrorFile(dir, project.id), tmp = `${file}.tmp`, text = JSON.stringify(project, null, 1);
  hub.written.set(project.id, text);
  await writeFile(tmp, text);
  await rename(tmp, file);
}
/** Mirrored projects, newest first. */
export async function mirroredProjects(dir = mirrorDir()): Promise<{ id: string; name: string; updatedAt: string }[]> {
  if (!dir) return [];
  const files = (await readdir(dir).catch(() => [] as string[])).filter(f => f.endsWith('.json'));
  const out = [];
  for (const f of files) {
    const p = await readMirror(dir, f.slice(0, -5));
    if (p?.id) out.push({ id: p.id, name: p.name, updatedAt: String(p.updatedAt), mtime: (await stat(path.join(dir, f))).mtimeMs });
  }
  return out.sort((a, b) => b.mtime - a.mtime).map(({ mtime, ...p }) => p);
}

/** No tab connected: answer from the mirror folder (reads and edits; library operations need a tab). */
async function viaMirror(kind: BridgeKind, args: Record<string, any>, dir: string) {
  if (kind === 'library' || kind === 'delete') throw new BridgeError('The project library lives in the browser: open the editor tab for this.');
  if (kind === 'replace') {
    const next = readProject(args.project);
    if (!SAFE_ID.test(next.id)) throw new BridgeError('Project id is not usable as a file name.');
    const existing = await readMirror(dir, next.id);
    if (!existing && !args.open) throw new BridgeError(`No mirrored project "${next.id}"; pass open=true to create it.`);
    next.updatedAt = new Date();
    await writeMirror(dir, next);
    return { applied: true, projectId: next.id, via: 'mirror' };
  }
  const id = typeof args.projectId === 'string' ? args.projectId : (await mirroredProjects(dir))[0]?.id;
  if (!id || !SAFE_ID.test(id)) throw new BridgeError('No editor tab is connected and no mirrored project was found.');
  const raw = await readMirror(dir, id);
  if (!raw) throw new BridgeError(`No editor tab is connected and "${id}" is not in the mirror folder.`);
  const project = readProject(raw);
  switch (kind) {
    case 'status': return { projectId: project.id, name: project.name, via: 'mirror' };
    case 'summary': return { ...summarizeProject(project), via: 'mirror' };
    case 'get': return leanProject(project);
    case 'list': return listElements(project, args);
    case 'apply': {
      const { project: next, changed } = applyAgentOps(project, args.ops);
      next.updatedAt = new Date();
      await writeMirror(dir, next);
      return { applied: true, changed, via: 'mirror' };
    }
  }
}

/**
 * A tab opened (or switched to) a project: reconcile with the mirror. Newer on disk (an agent edited while no tab
 * was open) → the tab gets it to apply as one Undo step; newer in the tab → the tab is asked to report a save.
 */
export async function syncTab(tabId: string, projectId: string, updatedAt: string): Promise<{ pull?: unknown; push?: boolean }> {
  tabHello(tabId, projectId);
  const dir = mirrorDir();
  if (!dir || !SAFE_ID.test(projectId)) return {};
  const disk = await readMirror(dir, projectId);
  if (!disk) return { push: true };
  const d = Date.parse(disk.updatedAt), t = Date.parse(updatedAt);
  if (d > t) return { pull: disk };
  if (t > d) return { push: true };
  return {};
}

export async function request(kind: BridgeKind, args: Record<string, unknown> = {}, timeoutMs = 15_000): Promise<unknown> {
  const wanted = typeof args.projectId === 'string' ? args.projectId : undefined;
  const dir = mirrorDir();
  const hasTab = [...hub.tabs.values()].some(t => !wanted || t.projectId === wanted);
  if (!hasTab && dir && kind !== 'library' && kind !== 'delete') return viaMirror(kind, args as Record<string, any>, dir);
  const tab = activeTab(wanted);
  const requestId = `r${++hub.seq}-${Date.now().toString(36)}`;
  return new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => {
      hub.pending.delete(requestId);
      reject(new BridgeError('The editor tab did not answer in time (is it in the background, or showing a dialog?).'));
    }, timeoutMs);
    hub.pending.set(requestId, { resolve, reject, timer });
    tab.send('request', { requestId, kind, args });
  });
}

export function reply(tabId: string, requestId: string, ok: boolean, payload: unknown) {
  const tab = hub.tabs.get(tabId);
  if (tab) tab.seen = Date.now();
  const pending = hub.pending.get(requestId);
  if (!pending) return false;
  hub.pending.delete(requestId);
  clearTimeout(pending.timer);
  if (ok) pending.resolve(payload);
  else pending.reject(new BridgeError(typeof payload === 'string' ? payload : 'The editor refused the request.'));
  return true;
}

export async function status() {
  return { tabs: [...hub.tabs.values()].map(t => ({ projectId: t.projectId, lastActive: new Date(t.seen).toISOString() })),
    mirrorDir: mirrorDir(), mirrored: await mirroredProjects() };
}

/** Write a saved project to the mirror directory (atomically), when configured. */
export async function mirrorSave(tabId: string, project: { id?: unknown }, json: string, dir = process.env.OPENPLAN3D_MIRROR_DIR) {
  const tab = hub.tabs.get(tabId);
  if (tab) { tab.seen = Date.now(); tab.projectId = typeof project.id === 'string' ? project.id : tab.projectId; }
  if (!dir || typeof project.id !== 'string' || !/^[A-Za-z0-9_.-]{1,128}$/.test(project.id)) return null;
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${project.id}.json`), tmp = `${file}.tmp`;
  hub.written.set(project.id, json);
  await writeFile(tmp, json);
  await rename(tmp, file);
  return file;
}
