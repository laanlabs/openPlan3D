import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { storedRecords, savedProjects } from './storage';

test('legacy migration preserves images and history, then saves beyond the old quota locally', async ({ page }, testInfo) => {
  test.slow();
  const source = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
  const history = JSON.stringify([{ timestamp: 1, description: 'Before migration', data: JSON.stringify(source) }]);
  const legacy = JSON.stringify({ [source.id]: JSON.stringify(source) });
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4188') external.push(request.url()); });
  await page.addInitScript(({ legacy, history, id }) => {
    if (!localStorage.getItem('floorplan_projects')) {
      localStorage.setItem('floorplan_projects', legacy);
      localStorage.setItem(`vh_${id}`, history);
      localStorage.setItem(`floorplan_thumb_${id}`, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, { legacy, history, id: source.id });
  await page.goto('/');
  await expect(page.getByRole('link', { name: source.name, exact: true })).toBeVisible();
  expect((await storedRecords(page, 'history'))[source.id]).toBe(history);
  expect((await storedRecords(page, 'thumbnails'))[source.id]).toContain('data:image/gif');
  const backupDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download library backup', exact: true }).click();
  const backup = JSON.parse(await readFile((await (await backupDownload).path())!, 'utf8'));
  expect(backup.legacy.original.floorplan_projects).toBe(legacy);
  expect(backup.history[source.id]).toBe(history);
  await page.getByRole('link', { name: source.name, exact: true }).click();
  await page.getByRole('button', { name: 'Version History', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Before migration', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  // Large embedded image payload is ordinary project JSON; no cloud storage needed.
  const large = { ...source, id: 'qa-large-local-project', name: 'QA Large local project', extensions: { image: 'data:image/png;base64,' + 'A'.repeat(6 * 1024 * 1024) } };
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'large.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(large)) });
  await expect(page.getByTitle('Click to rename', { exact: true })).toHaveText(large.name);
  // The title updates before the large IndexedDB write commits. Test reload
  // persistence after the same completion signal a user sees, not during Saving.
  await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTitle('Click to rename', { exact: true })).toHaveText(large.name);
  expect((await savedProjects(page))[large.id].extensions).toEqual(large.extensions);
  expect(await page.evaluate(() => localStorage.getItem('floorplan_projects'))).toBe(legacy);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible({ timeout: 60_000 });
  await testInfo.attach('large-local-project-mobile', { body: await page.screenshot(), contentType: 'image/png' });
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('interrupted migration leaves legacy bytes recoverable and retries without duplicate projects', async ({ page }) => {
  const source = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
  const legacy = JSON.stringify({ [source.id]: JSON.stringify(source) });
  await page.addInitScript(legacy => {
    localStorage.setItem('floorplan_projects', legacy);
    localStorage.setItem('hasSeenWelcome', 'true');
    (window as any).failMigration = true;
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function(...args) {
      if (this.name === 'meta' && (window as any).failMigration) throw new DOMException('Full', 'QuotaExceededError');
      return add.apply(this, args);
    };
  }, legacy);
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Browser storage is full');
  expect(await storedRecords(page)).toEqual({});
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download library backup', exact: true }).click();
  expect(await readFile((await (await pending).path())!, 'utf8')).toBe(legacy);
  await page.evaluate(() => { (window as any).failMigration = false; });
  await page.getByRole('button', { name: 'Retry loading', exact: true }).click();
  await expect(page.getByRole('link', { name: source.name, exact: true })).toBeVisible();
  expect(Object.keys(await savedProjects(page))).toEqual([source.id]);
  expect(await page.evaluate(() => localStorage.getItem('floorplan_projects'))).toBe(legacy);
});

test('late writes from an older release produce a visible recovery copy', async ({ page, context }) => {
  const source = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
  await page.addInitScript(source => {
    if (!localStorage.getItem('floorplan_projects')) localStorage.setItem('floorplan_projects', JSON.stringify({ [source.id]: JSON.stringify(source) }));
    localStorage.setItem('hasSeenWelcome', 'true');
  }, source);
  await page.goto(`/editor?id=${source.id}`);
  await page.getByTitle('Click to rename', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('Current release edit');
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
  const older = await context.newPage(); await older.goto('/');
  await older.evaluate(source => localStorage.setItem('floorplan_projects', JSON.stringify({ [source.id]: JSON.stringify({ ...source, name: 'Older release edit' }) })), source);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Older release edit (Recovered from older tab)', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Current release edit', exact: true })).toBeVisible();
  expect(Object.keys(await savedProjects(page))).toHaveLength(2);
});
