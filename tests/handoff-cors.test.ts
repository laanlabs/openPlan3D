import { beforeEach, expect, it, vi } from 'vitest';
import { allowedHandoffOrigin, handoffCorsHeaders } from '$lib/server/handoffCors';
import { HandoffError } from '$lib/server/handoffQuota';
import { uploadHandoff } from '$lib/server/handoffUpload';
import { OPTIONS, POST } from '../src/routes/api/handoffs/+server';

// vitest.config.ts does not load the SvelteKit plugin, so the route's `$env/dynamic/private` is virtual here;
// the hoisted object lets each test decide whether uploads are enabled. Uploads themselves are stubbed so the
// route is exercised without a bucket.
const { env } = vi.hoisted(() => ({ env: {} as Record<string, string | undefined> }));
vi.mock('$env/dynamic/private', () => ({ env }));
vi.mock('$lib/server/handoffUpload', () => ({ uploadHandoff: vi.fn() }));

const ALLOWED = [
  'https://app.openplan3d.com', 'https://openplan3d.com',
  'https://app.openlandscape3d.com', 'https://openlandscape3d.com',
  'https://app.openkitchen3d.com', 'https://openkitchen3d.com',
  'https://openkitchen3d-cloud.web.app', 'https://openkitchen3d-cloud.firebaseapp.com',
  'https://app.opencatio3d.com', 'https://opencatio3d.com',
];
const DENIED = [
  'https://app.openplan3d.com.evil.example', 'https://evil.example', 'https://evil.example/app.openplan3d.com',
  'https://openplan3d-cloud.web.app.evil.example', 'https://evilopenplan3d.web.app', 'https://openplan3d-staging.web.app',
  // Unreserved Firebase site ids and preview channels are not trusted: site ids are global and first come.
  'https://openplan3d.web.app', 'https://openplan3d-cloud.firebaseapp.com', 'https://openlandscape3d-www.web.app',
  'https://opencatio3d-cloud--pr-42-k3j9x2.web.app', 'https://openkitchen3d-www--preview-1.firebaseapp.com',
  // Local development is off unless the route is told to allow it.
  'http://localhost', 'http://localhost:5173', 'http://127.0.0.1:4188',
  'http://app.openplan3d.com', 'https://localhost:5173', 'http://localhost.evil.example', 'http://127.0.0.1.evil.example',
  'http://[::1]:5173', 'http://192.168.1.10:5173', 'null', '', null, undefined,
];
const LOCAL = ['http://localhost', 'http://localhost:5173', 'http://127.0.0.1:4188'];
const ENDPOINT = 'https://app.openplan3d.com/api/handoffs';
const corsKeys = (response: Response) => [...response.headers.keys()].filter(key => key.startsWith('access-control-'));
function preflight(origin: string) {
  return new Request(ENDPOINT, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
}
function post(origin?: string) {
  return new Request(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(origin ? { Origin: origin } : {}) }, body: '{"openplanHandoffVersion":1,"walls":[]}' });
}
beforeEach(() => { delete env.HANDOFF_UPLOADS_ENABLED; delete env.HANDOFF_BUCKET; delete env.HANDOFF_CORS_ALLOW_LOCAL; });

it.each(ALLOWED)('allows %s', origin => {
  expect(allowedHandoffOrigin(origin)).toBe(true);
  expect(handoffCorsHeaders(origin)['Access-Control-Allow-Origin']).toBe(origin);
});

it.each(DENIED)('denies %s', origin => {
  expect(allowedHandoffOrigin(origin)).toBe(false);
  expect(handoffCorsHeaders(origin)).toEqual({});
});

it('returns the exact header set for an allowed origin, never a wildcard or credentials', () => {
  expect(handoffCorsHeaders('https://app.openlandscape3d.com')).toEqual({
    'Access-Control-Allow-Origin': 'https://app.openlandscape3d.com',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Expose-Headers': 'Retry-After',
    'Access-Control-Max-Age': '86400',
  });
  for (const origin of ALLOWED) {
    const headers = handoffCorsHeaders(origin);
    expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    expect(headers).not.toHaveProperty('Access-Control-Allow-Credentials');
  }
});

it('admits local development origins only when HANDOFF_CORS_ALLOW_LOCAL is true', async () => {
  for (const origin of LOCAL) {
    expect(allowedHandoffOrigin(origin)).toBe(false);
    expect(allowedHandoffOrigin(origin, true)).toBe(true);
    expect(handoffCorsHeaders(origin, true)['Access-Control-Allow-Origin']).toBe(origin);
  }
  for (const origin of ['https://localhost:5173', 'http://localhost.evil.example', 'http://[::1]:5173', 'http://192.168.1.10:5173', 'https://evil.example']) {
    expect(allowedHandoffOrigin(origin, true)).toBe(false);
  }
  expect(corsKeys(OPTIONS({ request: preflight('http://localhost:5173') }))).toEqual([]);
  env.HANDOFF_CORS_ALLOW_LOCAL = 'true';
  expect(OPTIONS({ request: preflight('http://localhost:5173') }).headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  expect((await POST({ request: post('http://127.0.0.1:4188') })).headers.get('Access-Control-Allow-Origin')).toBe('http://127.0.0.1:4188');
  expect(corsKeys(OPTIONS({ request: preflight('https://openplan3d.web.app') }))).toEqual([]);
});

it('answers preflight with 204 and CORS headers for an allowed origin only, without uploading', () => {
  const response = OPTIONS({ request: preflight('https://app.opencatio3d.com') });
  expect(response.status).toBe(204);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.opencatio3d.com');
  expect(response.headers.get('Vary')).toBe('Origin');
  expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
  expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Accept');
  expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
  const foreign = OPTIONS({ request: preflight('https://app.openplan3d.com.evil.example') });
  expect(foreign.status).toBe(204);
  expect(corsKeys(foreign)).toEqual([]);
  expect(uploadHandoff).not.toHaveBeenCalled();
});

it('carries CORS headers on the 503 while uploads are disabled, only for an allowed origin', async () => {
  const allowed = await POST({ request: post('https://app.openlandscape3d.com') });
  expect(allowed.status).toBe(503);
  expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://app.openlandscape3d.com');
  expect(allowed.headers.get('Vary')).toBe('Origin');
  expect(allowed.headers.get('Cache-Control')).toBe('no-store');
  expect(await allowed.json()).toEqual({ error: 'Link sharing is unavailable. Use Export Editable Plan (JSON) instead.' });
  const foreign = await POST({ request: post('https://evil.example') });
  expect(foreign.status).toBe(503);
  expect(corsKeys(foreign)).toEqual([]);
  const sameOrigin = await POST({ request: post() });
  expect(sameOrigin.status).toBe(503);
  expect(corsKeys(sameOrigin)).toEqual([]);
  expect(uploadHandoff).not.toHaveBeenCalled();
});

it('carries CORS headers on 201 and error responses once uploads are enabled, and preflights do not count against the minute guard', async () => {
  env.HANDOFF_UPLOADS_ENABLED = 'true'; env.HANDOFF_BUCKET = 'example.test';
  for (let i = 0; i < 40; i++) OPTIONS({ request: preflight('https://app.openkitchen3d.com') });
  vi.mocked(uploadHandoff).mockResolvedValue({ code: 'ABCDEFGH', reuseUntil: '2026-09-06T12:00:30.000Z' });
  const created = await POST({ request: post('https://app.openkitchen3d.com') });
  expect(created.status).toBe(201);
  expect(created.headers.get('Access-Control-Allow-Origin')).toBe('https://app.openkitchen3d.com');
  expect(created.headers.get('Access-Control-Expose-Headers')).toBe('Retry-After');
  expect(await created.json()).toEqual({ code: 'ABCDEFGH', reuseUntil: '2026-09-06T12:00:30.000Z' });
  expect(uploadHandoff).toHaveBeenCalledOnce();
  vi.mocked(uploadHandoff).mockRejectedValue(new HandoffError(429, 'Link sharing has reached its limit.', 60));
  const busy = await POST({ request: post('https://app.openkitchen3d.com') });
  expect(busy.status).toBe(429);
  expect(busy.headers.get('Retry-After')).toBe('60');
  expect(busy.headers.get('Access-Control-Expose-Headers')).toBe('Retry-After');
  expect(busy.headers.get('Access-Control-Allow-Origin')).toBe('https://app.openkitchen3d.com');
  vi.mocked(uploadHandoff).mockRejectedValue(new HandoffError(422, 'This capture cannot be shared.'));
  const invalid = await POST({ request: post('https://evil.example') });
  expect(invalid.status).toBe(422);
  expect(corsKeys(invalid)).toEqual([]);
});
