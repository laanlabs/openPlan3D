import { json } from '@sveltejs/kit';
import { bridgeGuard } from '$lib/server/agentBridgeGuard';
import { handleBridgeMcpMessage } from '$lib/server/agentBridgeMcp';

const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };

/** Local MCP endpoint (streamable HTTP, stateless JSON-RPC) for editing the open project. */
export async function POST(event) {
  const blocked = bridgeGuard(event);
  if (blocked) return blocked;
  let body: unknown;
  try { body = JSON.parse(await event.request.text()); }
  catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers }); }
  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map(m => handleBridgeMcpMessage(m)))).filter(Boolean);
    return responses.length ? json(responses, { headers }) : new Response(null, { status: 202 });
  }
  const response = await handleBridgeMcpMessage(body);
  return response ? json(response, { headers }) : new Response(null, { status: 202 });
}
export function GET(event) {
  return bridgeGuard(event) ?? new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
