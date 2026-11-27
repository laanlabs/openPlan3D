import * as env from '$app/env/private';
import { json } from '@sveltejs/kit';
import { HandoffError } from './handoffQuota';
import { HandoffStorage, HandoffStorageFailure } from './handoffStorage';
import { SHARE_LEDGER } from './assistantShares';

let storage: HandoffStorage | undefined;

/** The share bucket client, or a 503 while the feature flag is off. */
export function shareStorage(): HandoffStorage {
  if (env.ASSISTANT_SHARES_ENABLED !== 'true' || !env.HANDOFF_BUCKET) {
    throw new HandoffError(503, 'Assistant sharing is not available. Export the project package and attach it instead.');
  }
  return (storage ??= new HandoffStorage(env.HANDOFF_BUCKET, undefined, undefined, SHARE_LEDGER));
}

export function shareErrorResponse(error: unknown, headers: Record<string, string>) {
  const known = error instanceof HandoffError;
  // Never log package bytes, codes or secrets; storage failures fail closed.
  if (!known) console.error(JSON.stringify({ event: 'assistant_share_unavailable', operation: error instanceof HandoffStorageFailure ? error.operation : 'unknown' }));
  if (known && error.retryAfter) headers['Retry-After'] = String(error.retryAfter);
  return json({ error: known ? error.message : 'Assistant sharing is temporarily unavailable. Export the project package and attach it instead.' }, { status: known ? error.status : 503, headers });
}
