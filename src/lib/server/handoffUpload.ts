import { randomBytes } from 'node:crypto';
import { isRoomPlanJson, validateRoomPlan } from '$lib/utils/roomplanValidation';
import { HANDOFF_LIMITS, HandoffError, reserveHandoff, type QuotaStore } from './handoffQuota';

export interface HandoffSink extends QuotaStore {
  create(name: string, bytes: Uint8Array, metadata?: Record<string, string>): Promise<boolean>;
}

/** Count the actual streamed bytes, even with missing or dishonest Content-Length. */
export async function readCapture(request: Request): Promise<Uint8Array> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' ||
    (request.headers.has('content-encoding') && request.headers.get('content-encoding') !== 'identity')) {
    throw new HandoffError(415, 'Link sharing accepts an editable plan JSON file.');
  }
  if (Number(request.headers.get('content-length')) > HANDOFF_LIMITS.maxBytes) {
    throw new HandoffError(413, 'This plan is too large for link sharing. Use Export Editable Plan (JSON) instead.');
  }
  if (!request.body) throw new HandoffError(400, 'The plan is empty.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new HandoffError(408, 'The upload took too long. Please try again.')), 10_000);
  });
  try {
    while (true) {
      const chunk = await Promise.race([reader.read(), timeout]);
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > HANDOFF_LIMITS.maxBytes) throw new HandoffError(413, 'This plan is too large for link sharing. Use Export Editable Plan (JSON) instead.');
      chunks.push(chunk.value);
    }
    const bytes = Buffer.concat(chunks);
    // Which stage refused the capture is logged so rejected shares can be diagnosed. Only validator
    // messages (a field path and a fixed reason) are kept verbatim: JSON.parse quotes the input.
    let stage: 'utf-8' | 'json' | 'format' | 'validation' = 'utf-8';
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      stage = 'json';
      const capture = JSON.parse(text);
      stage = 'format';
      if (!isRoomPlanJson(capture)) throw new Error('Unrecognized RoomPlan export');
      stage = 'validation';
      validateRoomPlan(capture);
    }
    catch (error) {
      const detail = stage === 'validation' && error instanceof Error && error.message.startsWith('Invalid RoomPlan file:') ? error.message.slice(0, 240) : undefined;
      console.warn(JSON.stringify({ event: 'handoff_invalid', stage, ...(detail ? { detail } : {}) }));
      throw new HandoffError(422, 'This capture cannot be shared. Check it using Export Editable Plan (JSON).');
    }
    return bytes;
  } finally {
    clearTimeout(timer!);
    void reader.cancel().catch(() => {});
  }
}

export async function uploadHandoff(request: Request, sink: HandoffSink, now = Date.now()) {
  const bytes = await readCapture(request);
  await reserveHandoff(sink, bytes.byteLength, now);
  const reuseUntil = new Date(now + 86_400_000).toISOString();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = [...randomBytes(8)].map(value => alphabet[value & 31]).join('');
    if (await sink.create(`inbox/${code}.json`, bytes, { source: 'quota-v1', reuseUntil })) return { code, reuseUntil };
  }
  throw new HandoffError(503, 'Could not reserve a sharing code. Please try again.', 5);
}
