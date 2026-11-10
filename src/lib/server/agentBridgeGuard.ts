import { dev } from '$app/environment';
import { bridgeEnabled, isLocalClient } from './agentBridge';

export interface BridgeRequestEvent { request: Request; getClientAddress: () => string }

/** Hostnames a browser sends in `Host` only for a page it loaded from this machine; any port. */
const LOOPBACK_HOST = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/;

const forbidden = (reason: string) => new Response(`Agent bridge: ${reason}`, { status: 403, headers: { 'Content-Type': 'text/plain' } });

/**
 * Who may use the agent bridge. A web page on any site is a loopback client too when it runs in a browser on this
 * machine, so the client address alone does not keep other sites out:
 * - `Host` must be a loopback name. A DNS-rebound attacker page sends its own hostname here (browsers do not let
 *   pages set Host), so this defeats rebinding; the port is not checked because it adds nothing a page can forge.
 * - `Origin`, when sent, must be this server's own: its host must equal `Host`. Browsers send it on cross-origin
 *   fetches, EventSource and form posts, also on same-origin POSTs. Local MCP clients (curl, Node) send none.
 * - `Sec-Fetch-Site`, when sent, must be `same-origin` (or `none`, a typed address). It also covers requests that
 *   carry no Origin, such as a `<script src>` pointing at the events stream. Other local ports are `same-site`.
 * - A POST must be `Content-Type: application/json`, which no page can send cross-origin without a preflight.
 */
export function checkBridgeRequest(event: BridgeRequestEvent, enabled: boolean): Response | null {
  let address = '';
  try { address = event.getClientAddress(); } catch { /* adapters without an address */ }
  if (!enabled || !isLocalClient(address)) return new Response('Not found', { status: 404 });
  const headers = event.request.headers;
  const host = headers.get('host')?.toLowerCase() ?? '';
  if (!LOOPBACK_HOST.test(host)) return forbidden('the Host header must be localhost, 127.0.0.1 or [::1].');
  const origin = headers.get('origin');
  if (origin !== null && !sameHostOrigin(origin, host)) return forbidden('requests from other origins are refused.');
  const site = headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin' && site !== 'none') return forbidden('requests from other sites are refused.');
  if (event.request.method === 'POST' && !isJson(headers.get('content-type'))) {
    return new Response('Agent bridge: send Content-Type: application/json.', { status: 415, headers: { 'Content-Type': 'text/plain' } });
  }
  return null;
}

/** `Origin` names this server: same host and port as the (already loopback) `Host`. The scheme is not compared, since
 *  adapters guess it (adapter-node assumes https without ORIGIN) and only one server listens on a loopback port. */
function sameHostOrigin(origin: string, host: string): boolean {
  try {
    const url = new URL(origin);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.host === host;
  } catch { return false; } // "null" (sandboxed frames, file pages) or malformed
}

function isJson(contentType: string | null): boolean {
  return contentType?.split(';')[0].trim().toLowerCase() === 'application/json';
}

/** The agent bridge answers only in dev (or OPENPLAN3D_AGENT_BRIDGE=1), only to loopback clients (otherwise 404),
 *  and only to this server's own pages or to clients outside a browser (otherwise 403/415): see checkBridgeRequest. */
export function bridgeGuard(event: BridgeRequestEvent): Response | null {
  return checkBridgeRequest(event, bridgeEnabled(dev));
}
