import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

/**
 * Local agent bridge: lets an agent on the same machine read and edit the project open in an editor tab, through the
 * dev server. The project lives in the tab (IndexedDB), so every request is relayed to a connected tab over
 * Server-Sent Events and answered by it; nothing is stored here except the optional save mirror.
 *
 * Enabled only in `npm run dev` (or with OPENPLAN3D_AGENT_BRIDGE=1) and only for loopback clients. Nothing here
 * reaches the cloud. OPENPLAN3D_MIRROR_DIR=<dir> also writes every saved project to <dir>/<project id>.json.
 */
export type BridgeKind = 'status' | 'summary' | 'get' | 'list' | 'apply' | 'replace';
interface Tab { id: string; send: (event: string, data: unknown) => void; projectId: string | null; seen: number }
interface Pending { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
interface Hub { tabs: Map<string, Tab>; pending: Map<string, Pending>; seq: number }

// one hub per server process; globalThis keeps it across dev-server module reloads
const hub: Hub = ((globalThis as any).__openplanAgentBridge ??= { tabs: new Map(), pending: new Map(), seq: 0 });

export class BridgeError extends Error {}

export function bridgeEnabled(dev: boolean, env: Record<string, string | undefined> = process.env): boolean {
  return dev || env.OPENPLAN3D_AGENT_BRIDGE === '1';
}
/** Loopback only: the bridge can rewrite the open project. */
export function isLocalClient(address: string): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1' || address === 'localhost';
}

export function connectTab(id: string, send: Tab['send']): () => void {
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

export function request(kind: BridgeKind, args: Record<string, unknown> = {}, timeoutMs = 15_000): Promise<unknown> {
  const tab = activeTab(typeof args.projectId === 'string' ? args.projectId : undefined);
  const requestId = `r${++hub.seq}-${Date.now().toString(36)}`;
  return new Promise((resolve, reject) => {
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

export function status() {
  return { tabs: [...hub.tabs.values()].map(t => ({ projectId: t.projectId, lastActive: new Date(t.seen).toISOString() })),
    mirrorDir: process.env.OPENPLAN3D_MIRROR_DIR ?? null };
}

/** Write a saved project to the mirror directory (atomically), when configured. */
export async function mirrorSave(tabId: string, project: { id?: unknown }, json: string, dir = process.env.OPENPLAN3D_MIRROR_DIR) {
  const tab = hub.tabs.get(tabId);
  if (tab) { tab.seen = Date.now(); tab.projectId = typeof project.id === 'string' ? project.id : tab.projectId; }
  if (!dir || typeof project.id !== 'string' || !/^[A-Za-z0-9_.-]{1,128}$/.test(project.id)) return null;
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${project.id}.json`), tmp = `${file}.tmp`;
  await writeFile(tmp, json);
  await rename(tmp, file);
  return file;
}
