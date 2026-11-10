import { describe, expect, it, vi } from 'vitest';
import { bridgeGuard, checkBridgeRequest } from '$lib/server/agentBridgeGuard';
import * as mcpRoute from '../src/routes/agent-bridge/mcp/+server';
import * as eventsRoute from '../src/routes/agent-bridge/events/+server';
import * as replyRoute from '../src/routes/agent-bridge/reply/+server';
import * as savedRoute from '../src/routes/agent-bridge/saved/+server';
import * as syncRoute from '../src/routes/agent-bridge/sync/+server';

vi.mock('$app/environment', () => ({ dev: true, browser: false, building: false, version: 'test' }));

const MCP = 'http://localhost:5173/agent-bridge/mcp';
const initialize = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });

function event(url: string, init: RequestInit & { headers?: Record<string, string> } = {}, address = '127.0.0.1') {
  const headers = { host: new URL(url).host, ...init.headers };
  return { request: new Request(url, { ...init, headers }), url: new URL(url), getClientAddress: () => address };
}
const post = (headers: Record<string, string>, body = initialize, url = MCP) => event(url, { method: 'POST', headers, body });
const json = { 'content-type': 'application/json' };

describe('agent bridge guard: refused', () => {
  it('answers 404 when the bridge is off, whoever asks', () => {
    expect(checkBridgeRequest(post(json), false)?.status).toBe(404);
  });

  it('answers 404 to clients that are not on this machine', () => {
    expect(checkBridgeRequest(event(MCP, { method: 'POST', headers: json, body: initialize }, '192.168.1.20'), true)?.status).toBe(404);
    expect(checkBridgeRequest({ ...post(json), getClientAddress: () => { throw new Error('no address'); } }, true)?.status).toBe(404);
  });

  it('refuses a cross-site text/plain POST, the kind a page sends without a preflight', () => {
    const res = bridgeGuard(post({ 'content-type': 'text/plain', origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }));
    expect(res?.status).toBe(403);
  });

  it('refuses a cross-site Origin even when the body is JSON', () => {
    expect(bridgeGuard(post({ ...json, origin: 'https://evil.example' }))?.status).toBe(403);
  });

  it('refuses another server on this machine (same site, other port)', () => {
    expect(bridgeGuard(post({ ...json, origin: 'http://localhost:3000' }))?.status).toBe(403);
    expect(bridgeGuard(post({ ...json, 'sec-fetch-site': 'same-site' }))?.status).toBe(403);
  });

  it('refuses an opaque "null" Origin (sandboxed frames, file pages)', () => {
    expect(bridgeGuard(post({ ...json, origin: 'null' }))?.status).toBe(403);
  });

  it('refuses a cross-site request without Origin, like a <script src> at the events stream', () => {
    const res = bridgeGuard(event('http://localhost:5173/agent-bridge/events?tab=attacker-tab-1', { headers: { 'sec-fetch-site': 'cross-site' } }));
    expect(res?.status).toBe(403);
  });

  it('refuses a DNS-rebound hostname, even with a matching Origin', () => {
    const rebound = post({ ...json, host: 'evil.example:5173', origin: 'http://evil.example:5173', 'sec-fetch-site': 'same-origin' });
    expect(bridgeGuard(rebound)?.status).toBe(403);
    expect(bridgeGuard(post({ ...json, host: 'localhost.evil.example:5173' }))?.status).toBe(403);
  });

  it('refuses a request without a Host header', () => {
    const e = post(json);
    e.request.headers.delete('host');
    expect(bridgeGuard(e)?.status).toBe(403);
  });

  it('refuses a same-origin POST that is not JSON', async () => {
    expect(bridgeGuard(post({ 'content-type': 'text/plain' }))?.status).toBe(415);
    expect(bridgeGuard(post({ 'content-type': 'application/x-www-form-urlencoded', origin: 'http://localhost:5173' }))?.status).toBe(415);
    const noType = event(MCP, { method: 'POST', body: new Blob([initialize]) });
    expect(bridgeGuard(noType)?.status).toBe(415);
  });
});

describe('agent bridge guard: allowed', () => {
  it('lets a local MCP client in (JSON, no Origin, no Sec-Fetch headers)', () => {
    expect(bridgeGuard(post(json))).toBeNull();
    expect(bridgeGuard(post({ 'content-type': 'application/json; charset=utf-8', accept: 'application/json, text/event-stream' }))).toBeNull();
  });

  it('lets the editor tab in: same-origin fetch POSTs and its EventSource', () => {
    const tabPost = post({ ...json, origin: 'http://localhost:5173', 'sec-fetch-site': 'same-origin' }, '{}', 'http://localhost:5173/agent-bridge/reply');
    expect(bridgeGuard(tabPost)).toBeNull();
    const stream = event('http://localhost:5173/agent-bridge/events?tab=abcdefgh12', { headers: { accept: 'text/event-stream', 'sec-fetch-site': 'same-origin' } });
    expect(bridgeGuard(stream)).toBeNull();
  });

  it('accepts every loopback name on any port, IPv6 included', () => {
    for (const origin of ['http://127.0.0.1:5199', 'http://[::1]:5173', 'http://localhost']) {
      const url = `${origin}/agent-bridge/mcp`;
      expect(bridgeGuard(event(url, { method: 'POST', headers: { ...json, origin }, body: initialize }, '::1'))).toBeNull();
    }
  });

  it('ignores the scheme adapters guess for the server origin', () => {
    expect(bridgeGuard(post({ ...json, origin: 'https://localhost:5173' }))).toBeNull();
  });

  it('allows an address typed into the browser (Sec-Fetch-Site: none)', () => {
    expect(bridgeGuard(event(MCP, { headers: { 'sec-fetch-site': 'none' } }))).toBeNull();
  });
});

describe('agent bridge routes all use the guard', () => {
  const routes = [
    ['mcp POST', () => mcpRoute.POST, MCP, 'POST'],
    ['mcp GET', () => mcpRoute.GET, MCP, 'GET'],
    ['events GET', () => eventsRoute.GET, 'http://localhost:5173/agent-bridge/events?tab=attacker-tab-1', 'GET'],
    ['reply POST', () => replyRoute.POST, 'http://localhost:5173/agent-bridge/reply', 'POST'],
    ['saved POST', () => savedRoute.POST, 'http://localhost:5173/agent-bridge/saved', 'POST'],
    ['sync POST', () => syncRoute.POST, 'http://localhost:5173/agent-bridge/sync', 'POST'],
  ] as const;

  for (const [name, handler, url, method] of routes) {
    it(`${name} refuses a cross-site request before reading it`, async () => {
      const body = method === 'POST' ? JSON.stringify({ tab: 'attacker-tab-1', hello: true, projectId: 'p' }) : undefined;
      const e = event(url, { method, headers: { 'content-type': 'text/plain', origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }, body });
      const res: Response = await (handler() as any)(e);
      expect(res.status).toBe(403);
      expect(e.request.bodyUsed).toBe(false);
    });
  }

  it('the MCP route still answers a local JSON-RPC client', async () => {
    const res: Response = await mcpRoute.POST(post(json) as any);
    expect(res.status).toBe(200);
    expect((await res.json()).result.serverInfo.name).toBe('openplan3d-local');
  });

  it('the MCP route refuses a text/plain body from a local client with 415', async () => {
    const res: Response = await mcpRoute.POST(post({ 'content-type': 'text/plain' }) as any);
    expect(res.status).toBe(415);
  });
});
