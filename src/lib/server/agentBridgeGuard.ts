import { dev } from '$app/environment';
import { bridgeEnabled, isLocalClient } from './agentBridge';

/** The agent bridge answers only in dev (or OPENPLAN3D_AGENT_BRIDGE=1) and only to loopback clients; otherwise 404. */
export function bridgeGuard(event: { getClientAddress: () => string }): Response | null {
  let address = '';
  try { address = event.getClientAddress(); } catch { /* adapters without an address */ }
  if (!bridgeEnabled(dev) || !isLocalClient(address)) return new Response('Not found', { status: 404 });
  return null;
}
