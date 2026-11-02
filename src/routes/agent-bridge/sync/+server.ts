import { json } from '@sveltejs/kit';
import { bridgeGuard } from '$lib/server/agentBridgeGuard';
import { syncTab } from '$lib/server/agentBridge';

/** A tab reports the project it opened ({tab, projectId, updatedAt}); answers {pull: newer project} or {push: true}. */
export async function POST(event) {
  const blocked = bridgeGuard(event);
  if (blocked) return blocked;
  const body = await event.request.json().catch(() => null);
  if (!body || typeof body.tab !== 'string' || typeof body.projectId !== 'string') return json({}, { status: 400 });
  return json(await syncTab(body.tab, body.projectId, String(body.updatedAt ?? '')));
}
