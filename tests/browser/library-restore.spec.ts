import { expect, test, type Page, type BrowserContext } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { savedProjects, storedRecords } from './storage';

const file = resolve('tests/fixtures/library-backup.json');
async function sourceProject() { return JSON.parse(JSON.parse(await readFile(file, 'utf8')).projects['qa-library-restore']); }
async function seed(context: BrowserContext) {
  const source = await sourceProject();
  await context.addInitScript(source => {
    if (!localStorage.getItem('floorplan_projects')) localStorage.setItem('floorplan_projects', JSON.stringify({ [source.id]: JSON.stringify(source) }));
    localStorage.setItem('hasSeenWelcome', 'true');
  }, source);
  return source;
}
function observe(page: Page) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4188') external.push(request.url()); });
  return () => { expect(errors).toEqual([]); expect(external).toEqual([]); };
}
async function chooseBackup(page: Page, path = file) {
  const pending = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose backup file', exact: true }).click();
  await (await pending).setFiles(path);
}
async function exported(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
async function libraryBackup(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download library backup', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}

for (const width of [1440, 390]) {
  test(`preview restores copies with usable history and retained recovery data at ${width}px`, async ({ page, context }, testInfo) => {
    test.slow();
    await page.setViewportSize({ width, height: 900 });
    const check = observe(page), source = await seed(context);
    await page.goto('/'); await expect(page.getByRole('link', { name: source.name, exact: true })).toBeVisible();
    const before = await storedRecords(page);
    await page.getByRole('button', { name: 'Restore library backup', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Restore library backup', exact: true });
    await chooseBackup(page);
    await expect(dialog).toContainText('1 project ready to restore');
    await expect(dialog).toContainText('1 damaged version kept for recovery.');
    await expect(dialog).toContainText('Recovery data only');
    expect(await storedRecords(page)).toEqual(before);
    await testInfo.attach(`restore-preview-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    await dialog.getByRole('button', { name: 'Restore as copies', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText('1 project restored.');
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByRole('link', { name: `${source.name} (Restored copy)`, exact: true })).toBeVisible();
    const saved = await savedProjects(page), copy = Object.values(saved).find((p: any) => p.id !== source.id) as any;
    expect(saved[source.id]).toEqual(source); expect(copy.id).not.toBe(source.id);
    expect((await storedRecords(page, 'thumbnails'))[copy.id]).toContain('data:image/gif');
    const versions = JSON.parse((await storedRecords(page, 'history'))[copy.id]);
    expect(versions).toHaveLength(1); expect(JSON.parse(versions[0].data).id).toBe(copy.id);
    const backup = await libraryBackup(page);
    const recovery: any = Object.values(backup.recovery).map(raw => JSON.parse(raw as string)).find(r => r.projects['damaged-plan']);
    expect(recovery.projects['damaged-plan']).toBe('{original damaged project bytes');
    expect(recovery.history[source.id]).toContain('{original damaged version bytes');
    await page.getByRole('link', { name: copy.name, exact: true }).click();
    if (width < 768) await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await page.getByRole('button', { name: 'Version History', exact: true }).click();
    const versionsDialog = page.getByRole('dialog', { name: 'Version History', exact: true });
    page.once('dialog', modal => modal.accept());
    await versionsDialog.getByRole('group', { name: 'Before backup', exact: true }).getByRole('button', { name: 'Restore', exact: true }).click();
    await expect(versionsDialog).not.toBeVisible();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(async () => (await savedProjects(page))[copy.id].floors[0].walls[0].thickness).toBe(17.25);
    await page.reload();
    const reopened = await exported(page); expect(reopened.id).toBe(copy.id); expect(reopened.floors[0].walls[0].thickness).toBe(17.25);
    expect((await storedRecords(page))[source.id]).toBe(before[source.id]);
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible({ timeout: 60_000 });
    check();
  });
}

test('failed history writes roll back the entire restore and keep the original file available for retry', async ({ page, context }) => {
  const check = observe(page), source = await seed(context);
  await page.goto('/'); await expect(page.getByRole('link', { name: source.name, exact: true })).toBeVisible();
  const before = await storedRecords(page);
  await page.getByRole('button', { name: 'Restore library backup', exact: true }).click();
  await chooseBackup(page);
  await page.evaluate(() => {
    (window as any).failRestoreHistory = true;
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function(...args) {
      if (this.name === 'history' && (window as any).failRestoreHistory) throw new DOMException('Full', 'QuotaExceededError');
      return add.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Restore as copies', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Browser storage is full');
  await expect(page.getByRole('alert')).toContainText('Nothing from this restore was added.');
  expect(await storedRecords(page)).toEqual(before); expect(await storedRecords(page, 'thumbnails')).toEqual({});
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download original backup', exact: true }).click();
  expect(await readFile((await (await pending).path())!, 'utf8')).toBe(await readFile(file, 'utf8'));
  await page.evaluate(() => { (window as any).failRestoreHistory = false; });
  await page.getByRole('button', { name: 'Restore as copies', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Restore library backup', exact: true }).getByRole('status')).toContainText('1 project restored.');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  expect(Object.keys(await savedProjects(page))).toHaveLength(2);
  check();
});

test('a cancelled file read cannot replace a newer preview or affect another editor’s pending work', async ({ page, context }) => {
  const source = await seed(context), library = await context.newPage();
  const check = observe(page), checkLibrary = observe(library);
  await page.addInitScript(() => {
    const timeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: any[]) => timeout(handler, delay === 1000 ? 60_000 : delay, ...args)) as typeof window.setTimeout;
  });
  await page.goto(`/editor?id=${source.id}`);
  await page.getByTitle('Click to rename', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('Pending editor work');
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
  await library.goto('/');
  await library.getByRole('button', { name: 'Restore library backup', exact: true }).click();
  await library.evaluate(() => {
    const text = File.prototype.text;
    File.prototype.text = function() {
      if (this.name !== 'library-backup.json') return text.call(this);
      return new Promise(resolve => { (window as any).finishOldRestoreRead = async () => resolve(await text.call(this)); });
    };
  });
  await chooseBackup(library);
  await expect(library.getByRole('dialog', { name: 'Restore library backup', exact: true }).getByRole('status')).toHaveText('Reading backup…');
  await library.getByRole('button', { name: 'Cancel', exact: true }).click();
  await library.getByRole('button', { name: 'Restore library backup', exact: true }).click();
  await chooseBackup(library, resolve('tests/fixtures/legacy-library-backup.json'));
  await expect(library.getByRole('dialog')).toContainText('1 project ready to restore');
  await library.evaluate(async () => { await (window as any).finishOldRestoreRead(); });
  await expect(library.getByRole('dialog')).not.toContainText('damaged');
  await library.getByRole('button', { name: 'Restore as copies', exact: true }).click();
  await expect(library.getByRole('dialog', { name: 'Restore library backup', exact: true }).getByRole('status')).toContainText('1 project restored.');
  expect((await exported(page)).name).toBe('Pending editor work');
  expect((await savedProjects(page))[source.id].name).toBe(source.name);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(Object.keys(await savedProjects(page))).toHaveLength(2);
  check(); checkLibrary();
});

test('restoration recovers a damaged destination library without erasing its original bytes', async ({ page }) => {
  const check = observe(page), damaged = '{damaged destination library';
  await page.addInitScript(damaged => { localStorage.setItem('floorplan_projects', damaged); localStorage.setItem('hasSeenWelcome', 'true'); }, damaged);
  await page.goto('/'); await expect(page.getByRole('alert')).toContainText('library could not be read');
  await page.getByRole('button', { name: 'Restore library backup', exact: true }).click(); await chooseBackup(page);
  await page.getByRole('button', { name: 'Restore as copies', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Restore library backup', exact: true }).getByRole('status')).toContainText('1 project restored.');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const backup = await libraryBackup(page); expect(backup.legacy.original.floorplan_projects).toBe(damaged);
  expect(await page.evaluate(() => localStorage.getItem('floorplan_projects'))).toBe(damaged);
  await page.reload(); await expect(page.getByRole('link', { name: 'QA Library Restore (Restored copy)', exact: true })).toBeVisible();
  check();
});

test('welcome restoration accepts a large legacy backup with embedded images entirely locally', async ({ page }) => {
  const check = observe(page), project = await sourceProject();
  project.extensions.image = 'data:image/png;base64,' + 'A'.repeat(6 * 1024 * 1024);
  project.floors[0].backgroundImage = { dataUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', position: { x: 0, y: 0 }, scale: 1, opacity: 0.5, rotation: 0, locked: true };
  await page.goto('/'); await page.getByRole('button', { name: 'Restore a library backup', exact: true }).click();
  const pending = page.waitForEvent('filechooser'); await page.getByRole('button', { name: 'Choose backup file', exact: true }).click();
  await (await pending).setFiles({ name: 'large-legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ [project.id]: JSON.stringify(project) })) });
  await expect(page.getByRole('dialog')).toContainText('1 project ready to restore');
  expect(await storedRecords(page)).toEqual({});
  await page.getByRole('button', { name: 'Restore as copies', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Restore library backup', exact: true }).getByRole('status')).toContainText('1 project restored.');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await page.getByRole('link', { name: `${project.name} (Restored copy)`, exact: true }).click();
  const copy = await exported(page); expect(copy.extensions).toEqual(project.extensions); expect(copy.floors[0].backgroundImage).toEqual(project.floors[0].backgroundImage);
  expect(await page.evaluate(() => localStorage.getItem('floorplan_projects'))).toBeNull();
  check();
});

test('recovery-only data stays downloadable from an otherwise empty library', async ({ page }) => {
  const check = observe(page);
  await page.goto('/'); await page.getByRole('button', { name: 'Restore a library backup', exact: true }).click();
  const pending = page.waitForEvent('filechooser'); await page.getByRole('button', { name: 'Choose backup file', exact: true }).click();
  await (await pending).setFiles({ name: 'damaged-projects.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ damaged: '{original damaged project bytes' })) });
  await expect(page.getByRole('dialog')).toContainText('0 projects ready to restore');
  await page.getByRole('button', { name: 'Keep recovery data', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Recovery data saved.');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toHaveCount(0);
  const backup = await libraryBackup(page);
  expect(backup.projects).toEqual({});
  const retained = JSON.parse(Object.values(backup.recovery)[0] as string);
  expect(retained.projects.damaged).toBe('{original damaged project bytes');
  check();
});

test('a list refresh failure after commit does not offer to repeat a successful restore', async ({ page, context }) => {
  const source = await seed(context), check = observe(page);
  await page.goto('/'); await expect(page.getByRole('link', { name: source.name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restore library backup', exact: true }).click(); await chooseBackup(page);
  await page.evaluate(() => {
    const getAll = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function(...args) {
      if (this.name === 'projects' && (window as any).failLibraryRefresh) throw new DOMException('Temporarily unavailable', 'UnknownError');
      return getAll.apply(this, args);
    };
    (window as any).failLibraryRefresh = true;
  });
  await page.getByRole('button', { name: 'Restore as copies', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('1 project restored.');
  await expect(page.getByRole('alert')).toContainText('Restoration finished, but the project list could not refresh.');
  await expect(page.getByRole('button', { name: 'Restore as copies', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('link', { name: `${source.name} (Restored copy)`, exact: true })).toHaveCount(1);
  expect(Object.keys(await savedProjects(page))).toHaveLength(2);
  check();
});
