import { json } from '@sveltejs/kit';
import { bridgeGuard } from '$lib/server/agentBridgeGuard';
import { mirrorSave } from '$lib/server/agentBridge';

/** A tab reports a completed save: body = {tab, project}; mirrored to OPENPLAN3D_MIRROR_DIR when set. */
export async function POST(event) {
  const blocked = bridgeGuard(event);
  if (blocked) return blocked;
  const text = await event.request.text();
  let body: any;
  try { body = JSON.parse(text); } catch { return json({ ok: false }, { status: 400 }); }
  if (!body || typeof body.tab !== 'string' || !body.project || typeof body.project !== 'object') return json({ ok: false }, { status: 400 });
  const file = await mirrorSave(body.tab, body.project, JSON.stringify(body.project, null, 1));
  return json({ ok: true, mirrored: file });
}
