import { expect, test } from '@playwright/test';

// SvelteKit gives the app only the environment variables declared in src/env.ts. A missing declaration or
// a stale import still builds, and the value then reads as undefined: sharing answers "unavailable" and the
// analytics opt-out is ignored. Every other spec runs with sharing off and analytics off, so this one uses
// the second server in playwright.config.ts, which has production's settings.
const production = 'http://127.0.0.1:4189';

// Each endpoint refuses this content type itself, after reading its flag and before any storage request.
const xml = { headers: { 'Content-Type': 'application/xml' }, data: '<plan/>' };

test('the built server reads its sharing flags from the environment', async ({ request }) => {
  const handoff = await request.post(`${production}/api/handoffs`, xml);
  expect(await handoff.json()).toEqual({ error: 'Link sharing accepts an editable plan JSON file.' });
  expect(handoff.status()).toBe(415);

  const share = await request.post(`${production}/api/assistant-shares`, xml);
  expect(await share.json()).toEqual({ error: 'Assistant sharing accepts an OpenPlan3D project package (ZIP).' });
  expect(share.status()).toBe(415);

  const mcp = await request.post(`${production}/mcp`, { data: { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} } });
  expect(mcp.status()).toBe(200);
  expect((await mcp.json()).result.serverInfo).toBeTruthy();

  // The server every other spec uses has the flags off, and says so.
  expect((await request.post('/api/handoffs', xml)).status()).toBe(503);
  expect((await request.post('/api/assistant-shares', xml)).status()).toBe(503);
});

test('analytics load unless the public opt-out is set', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const outside: string[] = [];
  // Nothing leaves the machine: requests to other hosts are recorded and refused.
  await page.route(url => url.hostname !== '127.0.0.1', route => { outside.push(new URL(route.request().url()).hostname); return route.abort(); });

  await page.goto(`${production}/editor`);
  await expect(page.getByLabel('Floor plan editor canvas')).toBeVisible();
  await expect.poll(() => outside, { timeout: 30_000 }).toContain('www.googletagmanager.com');

  outside.length = 0;
  await page.goto('/editor');
  await expect(page.getByLabel('Floor plan editor canvas')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});
