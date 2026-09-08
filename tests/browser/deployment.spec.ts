import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { deploymentServer } from './deployment-server';
import { failProjectWrites, savedProjects } from './storage';

async function seed(context: BrowserContext, id: string) {
  const project = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
  project.id = id;
  await context.addInitScript(project => {
    // Seed only once; reload must use the app's saved IndexedDB revision.
    if (!localStorage.getItem('hasSeenWelcome')) {
      localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) }));
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, project);
}

async function advanceCheck(page: Page) {
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/_app/version.json');
  await page.clock.fastForward(300_001);
  await (await response).finished();
  // Flush the response's JSON parsing and Svelte DOM update before assertions.
  await page.clock.runFor(50);
}

async function rename(page: Page, name: string) {
  await page.getByTitle('Click to rename', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill(name);
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
}

test('real cached validators cannot create a false update or hide a later deployment', async ({ page, context }) => {
  const server = await deploymentServer();
  try {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    // Prime the actual browser HTTP cache with an older representation.
    server.serve(server.different);
    await page.goto(`${server.url}/_app/version.json`);
    await expect(page.locator('body')).toContainText(server.different);
    server.serve(server.current);
    // Control: the original check's headers reproduce the stale 304/body.
    const cached = await page.evaluate(async () => (await (await fetch('/_app/version.json', {
      headers: { pragma: 'no-cache', 'cache-control': 'no-cache' },
    })).json()).version);
    expect(cached).toBe(server.different);
    expect(server.requests.at(-1)?.status).toBe(304);

    await seed(context, 'qa-deployment-cache');
    await page.clock.install();
    await page.goto(`${server.url}/editor?id=qa-deployment-cache`);
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    await advanceCheck(page);
    expect(server.requests.at(-1)).toEqual({ status: 200, etag: undefined, modified: undefined });
    await expect(page.getByRole('button', { name: 'Save and reload', exact: true })).toHaveCount(0);

    // A same-sized replacement still gets detected, without a stale validator.
    server.serve(server.different);
    await advanceCheck(page);
    await expect(page.getByRole('status')).toContainText('An app update is ready');
    expect(server.requests.at(-1)).toEqual({ status: 200, etag: undefined, modified: undefined });
    const count = server.requests.length;
    await page.clock.fastForward(300_001);
    expect(server.requests).toHaveLength(count); // Stop polling after detection.

    // Simulate loading the now-current build, retaining the old HTTP cache.
    server.serve(server.current);
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
    await rename(page, 'Saved across deployment');
    expect((await savedProjects(page))['qa-deployment-cache'].name).not.toBe('Saved across deployment');
    await Promise.all([
      page.waitForEvent('framenavigated', frame => frame === page.mainFrame()),
      page.getByRole('button', { name: 'Save and reload', exact: true }).click(),
    ]);
    await expect(page.getByTitle('Click to rename', { exact: true })).toHaveText('Saved across deployment');
    await advanceCheck(page);
    await expect(page.getByRole('button', { name: 'Save and reload', exact: true })).toHaveCount(0);
    expect((await savedProjects(page))['qa-deployment-cache'].name).toBe('Saved across deployment');

    const asset = (await readdir('build/client/_app/immutable/entry')).find(name => /^start\..*\.js$/.test(name));
    expect(asset).toBeTruthy();
    const response = await context.request.get(`${server.url}/_app/immutable/entry/${asset}`);
    expect(response.headers()['cache-control']).toContain('max-age=31536000,immutable');
    expect(errors).toEqual([]);
  } finally { await server.close(); }
});

test('update reload preserves failed saves, JSON recovery and the chosen destination', async ({ page, context }) => {
  const server = await deploymentServer();
  try {
    await seed(context, 'qa-deployment-save');
    await page.clock.install();
    await page.goto(`${server.url}/editor?id=qa-deployment-save`);
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    server.serve(server.different);
    await advanceCheck(page);
    await expect(page.getByRole('status')).toContainText('An app update is ready');
    await failProjectWrites(page);
    await rename(page, 'Unsaved deployment recovery');
    await page.getByRole('button', { name: 'Save and reload', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Your changes could not be saved');
    await expect(page).toHaveURL(/editor\?id=qa-deployment-save$/);
    const download = page.waitForEvent('download');
    await page.getByRole('status').getByRole('button', { name: 'Download JSON backup' }).click();
    const backup = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
    expect(backup.name).toBe('Unsaved deployment recovery');
    expect(backup.id).toBe('qa-deployment-save');
    await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
    await page.getByTitle('Back to Projects', { exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Your changes could not be saved');
    await expect(page).toHaveURL(/editor\?id=qa-deployment-save$/);
    await page.evaluate(() => { (window as any).failProjectWrites = false; });
    server.serve(server.current);
    await page.getByRole('button', { name: 'Save and reload', exact: true }).click();
    await expect(page).toHaveURL(`${server.url}/`);
    expect((await savedProjects(page))['qa-deployment-save'].name).toBe(backup.name);
  } finally { await server.close(); }
});

test('failed update requests remain quiet and retry after recovery', async ({ page, context }) => {
  const server = await deploymentServer();
  try {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await seed(context, 'qa-deployment-offline');
    await page.clock.install();
    await page.goto(`${server.url}/editor?id=qa-deployment-offline`);
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    server.serve(server.different, 503);
    await advanceCheck(page);
    await expect(page.getByRole('button', { name: 'Save and reload' })).toHaveCount(0);
    await context.setOffline(true);
    const failed = page.waitForEvent('requestfailed', r => new URL(r.url()).pathname === '/_app/version.json');
    await page.clock.fastForward(300_001);
    await failed;
    await expect(page.getByRole('button', { name: 'Save and reload' })).toHaveCount(0);
    await rename(page, 'Still editable offline');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
    await context.setOffline(false);
    server.serve(server.different);
    await advanceCheck(page);
    await expect(page.getByRole('status')).toContainText('An app update is ready');
    expect(errors).toEqual([]);
  } finally { await server.close(); }
});
