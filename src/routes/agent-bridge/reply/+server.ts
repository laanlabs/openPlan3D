import { json } from '@sveltejs/kit';
import { bridgeGuard } from '$lib/server/agentBridgeGuard';
import { reply, tabHello } from '$lib/server/agentBridge';

/** A tab answers a relayed request ({tab, requestId, ok, result|error}) or reports its open project ({tab, hello}). */
export async function POST(event) {
  const blocked = bridgeGuard(event);
  if (blocked) return blocked;
  const body = await event.request.json().catch(() => null);
  if (!body || typeof body.tab !== 'string') return json({ ok: false }, { status: 400 });
  if (body.hello) { tabHello(body.tab, typeof body.projectId === 'string' ? body.projectId : null); return json({ ok: true }); }
  const delivered = reply(body.tab, String(body.requestId), !!body.ok, body.ok ? body.result : body.error);
  return json({ ok: delivered });
}
