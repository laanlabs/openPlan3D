import { afterEach, expect, it, vi } from 'vitest';
import { HANDOFF_LIMITS, HandoffError, reserveHandoff, type QuotaSnapshot, type QuotaState } from '$lib/server/handoffQuota';
import { HandoffStorage } from '$lib/server/handoffStorage';
import { readCapture, uploadHandoff, type HandoffSink } from '$lib/server/handoffUpload';

const now = Date.UTC(2026, 8, 5, 12, 0, 30);
const emptyState = (): QuotaState => ({ version: 1, day: Math.floor(now / 86_400_000), uploads: 0, bytes: 0, minute: Math.floor(now / 60_000), minuteUploads: 0 });
class MemorySink implements HandoffSink {
  snapshot: QuotaSnapshot | null = null;
  captures: { name: string; bytes: Uint8Array }[] = [];
  read = vi.fn(async () => structuredClone(this.snapshot));
  write = vi.fn(async (previous: QuotaSnapshot | null, state: QuotaState) => {
    if (previous?.metageneration !== this.snapshot?.metageneration) return false;
    this.snapshot = { state: structuredClone(state), generation: '1', metageneration: String(Number(this.snapshot?.metageneration ?? '0') + 1) };
    return true;
  });
  create = vi.fn(async (name: string, bytes: Uint8Array) => { this.captures.push({ name, bytes }); return true; });
  seed(state: Partial<QuotaState>) { this.snapshot = { state: { ...emptyState(), ...state }, generation: '1', metageneration: '1' }; }
}
function request(body: string | ReadableStream<Uint8Array>, headers: Record<string, string> = {}) {
  return new Request('https://example.test/api/handoffs', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body, duplex: 'half' } as RequestInit);
}
afterEach(() => vi.useRealTimers());

it('reserves globally across concurrent instances without overshooting the last slot', async () => {
  const store = new MemorySink(); store.seed({ uploads: HANDOFF_LIMITS.dailyUploads - 1 });
  const results = await Promise.allSettled([reserveHandoff(store, 50, now), reserveHandoff(store, 50, now)]);
  expect(results.filter(x => x.status === 'fulfilled')).toHaveLength(1);
  expect(store.snapshot!.state.uploads).toBe(HANDOFF_LIMITS.dailyUploads);
  expect(store.snapshot!.state.bytes).toBe(50);
  expect((results.find(x => x.status === 'rejected') as PromiseRejectedResult).reason).toMatchObject({ status: 429 });
});

it('admits a day of the measured demand: 280 shares and 28 MB spread over the afternoon', async () => {
  // October 9–15 2026: about 100 accepted plus 140–180 refused a day once the earlier 100 / 25 MiB cap filled.
  const store = new MemorySink(); store.seed({});
  for (let i = 0; i < 280; i++) await reserveHandoff(store, 100_000, now + i * 61_000);
  expect(store.snapshot!.state).toMatchObject({ uploads: 280, bytes: 28_000_000 });
});

it('enforces aggregate bytes even when individual captures and upload count fit', async () => {
  const store = new MemorySink(); store.seed({ bytes: HANDOFF_LIMITS.dailyBytes - 12 });
  await reserveHandoff(store, 12, now);
  await expect(reserveHandoff(store, 1, now)).rejects.toMatchObject({ status: 429, retryAfter: 43170 });
  expect(store.snapshot!.state.bytes).toBe(HANDOFF_LIMITS.dailyBytes);
});

it('enforces the shared minute limit and resets only that limit in the next minute', async () => {
  const store = new MemorySink(); store.seed({ minuteUploads: 9, uploads: 9, bytes: 90 });
  await reserveHandoff(store, 10, now);
  await expect(reserveHandoff(store, 10, now)).rejects.toMatchObject({ status: 429, retryAfter: 30 });
  await reserveHandoff(store, 10, now + 60_000);
  expect(store.snapshot!.state).toMatchObject({ minuteUploads: 1, uploads: 11, bytes: 110 });
});

it('resets both limits at the next UTC day without accepting a backwards clock', async () => {
  const store = new MemorySink(); store.seed({ uploads: HANDOFF_LIMITS.dailyUploads, bytes: HANDOFF_LIMITS.dailyBytes, minuteUploads: HANDOFF_LIMITS.minuteUploads });
  await reserveHandoff(store, 13, now + 86_400_000);
  expect(store.snapshot!.state).toMatchObject({ uploads: 1, bytes: 13, minuteUploads: 1 });
  await expect(reserveHandoff(store, 13, now)).rejects.toThrow('clock mismatch');
});

it('fails closed for unavailable, damaged or persistently contended ledgers', async () => {
  const missing = new MemorySink(); missing.read.mockRejectedValue(new Error('Unavailable'));
  await expect(reserveHandoff(missing, 10, now)).rejects.toThrow('Unavailable');
  expect(missing.create).not.toHaveBeenCalled();
  const damaged = new MemorySink(); damaged.seed({ bytes: -1 });
  await expect(reserveHandoff(damaged, 10, now)).rejects.toThrow('Invalid handoff quota ledger');
  const busy = new MemorySink(); busy.write.mockResolvedValue(false);
  await expect(reserveHandoff(busy, 10, now)).rejects.toMatchObject({ status: 503 });
  expect(busy.write).toHaveBeenCalledTimes(5);
});

it('validates body bytes before touching the ledger, including a dishonest length', async () => {
  const store = new MemorySink();
  const body = '{"openplanHandoffVersion":1,"walls":[]}' + ' '.repeat(HANDOFF_LIMITS.maxBytes);
  await expect(uploadHandoff(request(body, { 'Content-Length': '1' }), store, now)).rejects.toMatchObject({ status: 413 });
  expect(store.read).not.toHaveBeenCalled();
  expect(store.create).not.toHaveBeenCalled();
});

it('accepts exactly the byte limit and preserves a valid empty edited plan', async () => {
  const json = '{"openplanHandoffVersion":1,"walls":[]}';
  const body = json + ' '.repeat(HANDOFF_LIMITS.maxBytes - Buffer.byteLength(json));
  expect((await readCapture(request(body))).byteLength).toBe(HANDOFF_LIMITS.maxBytes);
});

it.each([
  ['broken JSON', '{"walls":[', {}, 422],
  ['invalid elements', '{"walls":[{}]}', {}, 422],
  ['no walls', '{}', {}, 422],
  ['unrecognized empty document', '{"walls":[]}', {}, 422],
  ['wrong media type', '{"openplanHandoffVersion":1,"walls":[]}', { 'Content-Type': 'text/plain' }, 415],
  ['compressed payload', '{"openplanHandoffVersion":1,"walls":[]}', { 'Content-Encoding': 'gzip' }, 415],
] as const)('rejects %s before admission', async (_, body, headers, status) => {
  const store = new MemorySink();
  await expect(uploadHandoff(request(body, headers), store, now)).rejects.toMatchObject({ status });
  expect(store.read).not.toHaveBeenCalled();
});

it('logs which stage refused a capture without quoting the capture', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const secret = 'Private client name';
  const invalid = JSON.stringify({ openplanHandoffVersion: 1, walls: [{ dimensions: [-1, 2, 0], label: secret }] });
  for (const [body, stage] of [[`{"name":"${secret}",`, 'json'], ['{"name":"x"}', 'format'], [invalid, 'validation']] as const) {
    await expect(readCapture(request(body))).rejects.toMatchObject({ status: 422 });
    const logged = JSON.parse(warn.mock.calls.at(-1)![0] as string);
    expect(logged).toMatchObject({ event: 'handoff_invalid', stage });
    expect(JSON.stringify(logged)).not.toContain(secret);
  }
  expect(JSON.parse(warn.mock.calls.at(-1)![0] as string).detail).toMatch(/^Invalid RoomPlan file: walls\[0\]/);
  warn.mockRestore();
});

it('stops a stalled upload and cancels its reader', async () => {
  vi.useFakeTimers();
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({ cancel });
  const result = readCapture(request(body)).catch(error => error);
  await vi.advanceTimersByTimeAsync(10_001);
  expect(await result).toBeInstanceOf(HandoffError);
  expect(await result).toMatchObject({ status: 408 });
  expect(cancel).toHaveBeenCalledOnce();
});

it('uploads only after reservation, retains failed reservations, and bounds collision retries', async () => {
  const store = new MemorySink();
  store.create.mockImplementation(async () => {
    expect(store.snapshot!.state.uploads).toBe(1);
    throw new Error('Uncertain upload');
  });
  await expect(uploadHandoff(request('{"openplanHandoffVersion":1,"walls":[]}'), store, now)).rejects.toThrow('Uncertain upload');
  expect(store.snapshot!.state.uploads).toBe(1);
  store.create.mockResolvedValue(false);
  await expect(uploadHandoff(request('{"openplanHandoffVersion":1,"walls":[]}'), store, now)).rejects.toMatchObject({ status: 503 });
  expect(store.create).toHaveBeenCalledTimes(4);
  expect(store.snapshot!.state.uploads).toBe(2);
});

it('returns a random code and expiry while storing the original validated bytes', async () => {
  const store = new MemorySink();
  const result = await uploadHandoff(request('{"openplanHandoffVersion":1,"walls":[]}'), store, now);
  expect(result.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  expect(result.reuseUntil).toBe('2026-09-06T12:00:30.000Z');
  expect(store.captures[0].name).toBe(`inbox/${result.code}.json`);
  expect(Buffer.from(store.captures[0].bytes).toString()).toBe('{"openplanHandoffVersion":1,"walls":[]}');
});

it('uses generation AND metageneration preconditions for quota metadata updates', async () => {
  const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 412 }));
  const store = new HandoffStorage('example.test', async () => 'test-token', transport);
  const snapshot = { state: emptyState(), generation: '17', metageneration: '42' };
  expect(await store.write(snapshot, emptyState())).toBe(false);
  const [url, init] = transport.mock.calls[0];
  expect(String(url)).toContain('_system%2Fhandoff-admission-v1?ifGenerationMatch=17&ifMetagenerationMatch=42');
  expect(init!.method).toBe('PATCH');
  expect(JSON.parse(init!.body as string).metadata.quota).toBe(JSON.stringify(emptyState()));
});

it('creates a zero-byte private ledger atomically and never overwrites capture objects', async () => {
  const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }));
  const store = new HandoffStorage('example.test', async () => 'test-token', transport);
  expect(await store.write(null, emptyState())).toBe(true);
  const [url, init] = transport.mock.calls[0];
  expect(String(url)).toBe('https://storage.googleapis.com/upload/storage/v1/b/example.test/o?uploadType=multipart&ifGenerationMatch=0');
  const body = Buffer.from(init!.body as Uint8Array).toString();
  expect(body).toContain('"name":"_system/handoff-admission-v1"');
  expect(body).toContain('"cacheControl":"private, no-store"');
  expect(body).toMatch(/Content-Type: application\/json\r\n\r\n\r\n--openplan-handoff-/);
  transport.mockResolvedValue(new Response(null, { status: 412 }));
  expect(await store.create('inbox/ABCDEFGH.json', new Uint8Array())).toBe(false);
});

it('distinguishes a missing ledger from denied access and invalid metadata', async () => {
  const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 }));
  const store = new HandoffStorage('example.test', async () => 'test-token', transport);
  expect(await store.read()).toBeNull();
  transport.mockResolvedValue(new Response(null, { status: 403 }));
  await expect(store.read()).rejects.toMatchObject({ operation: 'ledger-read', status: 403 });
  transport.mockResolvedValue(Response.json({ generation: '1', metageneration: '1', metadata: { quota: '{}' } }));
  await expect(store.read()).rejects.toMatchObject({ operation: 'ledger-format' });
});

it('round-trips the live ledger wire format without losing its version or counters', async () => {
  const state = { ...emptyState(), uploads: 1, bytes: 12, minuteUploads: 1 };
  const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ generation: '1788645246013944', metageneration: '1', metadata: { quota: JSON.stringify(state) } }));
  const store = new HandoffStorage('example.test', async () => 'test-token', transport);
  expect(await store.read()).toEqual({ generation: '1788645246013944', metageneration: '1', state });
});
