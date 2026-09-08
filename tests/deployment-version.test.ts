import { afterEach, expect, it, vi } from 'vitest';
import { hasDeploymentUpdate } from '$lib/services/deploymentVersion';

afterEach(() => vi.unstubAllGlobals());

it.each([
  ['current version', { version: 'release-a' }, false],
  ['different version (including rollback)', { version: 'release-b' }, true],
  ['missing version', {}, false],
  ['null body', null, false],
  ['numeric version', { version: 123 }, false],
  ['blank version', { version: '  ' }, false],
])('recognizes %s', async (_, body, expected) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));
  expect(await hasDeploymentUpdate('release-a', '/_app/version.json')).toBe(expected);
});

it('bypasses conditional browser validation and bounds the request', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ version: 'release-a' }));
  vi.stubGlobal('fetch', fetcher);
  await hasDeploymentUpdate('release-a', '/planner/_app/version.json');
  expect(fetcher).toHaveBeenCalledWith('/planner/_app/version.json', {
    cache: 'no-store', headers: { pragma: 'no-cache', 'cache-control': 'no-cache' },
    signal: expect.any(AbortSignal),
  });
});

it.each([
  new Response('Unavailable', { status: 503 }),
  new Response('Not JSON'),
  new Response(null, { status: 304 }),
])('ignores unavailable or unusable responses', async response => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
  expect(await hasDeploymentUpdate('release-a', '/_app/version.json')).toBe(false);
});

it.each([new TypeError('Offline'), new DOMException('Timed out', 'TimeoutError')])(
  'ignores request failures and allows a later retry', async error => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(error)
      .mockResolvedValueOnce(Response.json({ version: 'release-b' })));
    expect(await hasDeploymentUpdate('release-a', '/_app/version.json')).toBe(false);
    expect(await hasDeploymentUpdate('release-a', '/_app/version.json')).toBe(true);
  },
);
