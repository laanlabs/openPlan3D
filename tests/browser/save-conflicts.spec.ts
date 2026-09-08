import { savedProjects as saved, failProjectWrites } from './storage';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function seed(context: BrowserContext, neighbor = false) {
  const source = JSON.parse(await readFile(resolve('tests/fixtures/save-conflicts.openplan.json'), 'utf8'));
  await context.addInitScript(({ source, neighbor }) => {
    if (!localStorage.getItem('floorplan_projects')) {
      const projects: Record<string, string> = { [source.id]: JSON.stringify(source) };
      if (neighbor) projects['qa-neighbor'] = JSON.stringify({ ...source, id: 'qa-neighbor', name: 'QA Neighbor' });
      localStorage.setItem('floorplan_projects', JSON.stringify(projects));
    }
    localStorage.setItem('hasSeenWelcome', 'true');
    const timeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: any[]) =>
      timeout(handler, delay === 1000 ? 60_000 : delay, ...args)) as typeof window.setTimeout;
  }, { source, neighbor });
  return source;
}
async function rename(page: Page, name: string) {
  await page.getByTitle('Click to rename', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill(name);
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
}
async function exported(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
function observe(page: Page) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => {
    if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== 'http://127.0.0.1:4188') external.push(r.url());
  });
  return () => { expect(errors).toEqual([]); expect(external).toEqual([]); };
}

for (const width of [1440, 390]) {
  test(`conflicting tabs preserve both versions with backup and copy recovery at ${width}px`, async ({ page, context }, testInfo) => {
    test.setTimeout(90_000);
    const source = await seed(context), other = await context.newPage();
    const check = observe(page), checkOther = observe(other);
    await page.setViewportSize({ width, height: 900 });
    await other.setViewportSize({ width, height: 900 });
    await page.goto(`/editor?id=${source.id}`); await other.goto(`/editor?id=${source.id}`);
    await expect(page.getByRole('application')).toContainText('1 room');
    await expect(other.getByRole('application')).toContainText('1 room');
    await rename(other, 'My local alternative');
    await rename(page, 'Newer saved version');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(other.getByRole('alert')).toContainText('another tab');
    const newer = (await saved(page))[source.id];
    await other.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(other.getByRole('alert')).toContainText('another tab');
    expect((await saved(page))[source.id]).toEqual(newer);
    expect((await exported(other)).name).toBe('My local alternative');
    const backup = other.waitForEvent('download');
    await other.getByRole('button', { name: 'Download JSON backup', exact: true }).click();
    const backedUp = JSON.parse(await readFile((await (await backup).path())!, 'utf8'));
    expect(backedUp.id).toBe(source.id); expect(backedUp.name).toBe('My local alternative');

    // A full-storage recovery failure must leave the conflicting plan in memory.
    if (width === 1440) {
      await failProjectWrites(other, 'failCopyWrite');
      await other.getByRole('button', { name: 'Save as copy', exact: true }).click();
      await expect(other.getByRole('alert')).toContainText('Browser storage is full');
      expect((await exported(other)).id).toBe(source.id);
      expect(Object.keys(await saved(page))).toEqual([source.id]);
      await other.evaluate(() => { (window as any).failCopyWrite = false; });
    }
    await other.getByRole('button', { name: 'Save as copy', exact: true }).click();
    await expect(other.getByRole('alert')).toHaveCount(0);
    await expect(other.getByTitle('Click to rename', { exact: true })).toHaveText('My local alternative (Recovered copy)');
    const copy = await exported(other);
    expect(copy.id).not.toBe(source.id); expect(copy.floors).toEqual(backedUp.floors);
    expect((await saved(page))[source.id]).toEqual(newer);
    expect(Object.keys(await saved(page))).toHaveLength(2);
    await other.reload(); expect((await exported(other)).id).toBe(copy.id);
    await page.reload(); expect((await exported(page)).name).toBe('Newer saved version');
    await other.getByRole('button', { name: '3D', exact: true }).click();
    await expect(other.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible();
    await testInfo.attach(`recovered-copy-${width}`, { body: await other.screenshot(), contentType: 'image/png' });
    check(); checkOther();
  });
}

test('deleting a library project cannot be undone by an older editor autosave', async ({ page, context }) => {
  const source = await seed(context), library = await context.newPage();
  const check = observe(page), checkLibrary = observe(library);
  await page.goto(`/editor?id=${source.id}`);
  await expect(page.getByRole('application')).toContainText('1 room');
  await library.goto('/');
  await library.getByRole('button', { name: `Project actions for ${source.name}`, exact: true }).click();
  await library.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  await library.getByRole('dialog', { name: 'Delete project', exact: true }).getByRole('button', { name: 'Delete project', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('deleted in another tab');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  expect(Object.keys(await saved(page))).toHaveLength(0);
  await page.getByRole('button', { name: 'Save as copy', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  const recovered = await exported(page);
  expect(recovered.id).not.toBe(source.id);
  expect(Object.keys(await saved(page))).toEqual([recovered.id]);
  check(); checkLibrary();
});

test('simultaneous edits to different projects preserve both library entries', async ({ page, context }) => {
  const source = await seed(context, true), other = await context.newPage();
  const check = observe(page), checkOther = observe(other);
  await page.goto(`/editor?id=${source.id}`); await other.goto('/editor?id=qa-neighbor');
  await rename(page, 'First independent edit'); await rename(other, 'Second independent edit');
  await Promise.all([
    page.getByRole('button', { name: 'Save', exact: true }).click(),
    other.getByRole('button', { name: 'Save', exact: true }).click(),
  ]);
  await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
  await expect(other.getByText('Saved ✓', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0); await expect(other.getByRole('alert')).toHaveCount(0);
  const projects = await saved(page);
  expect(projects[source.id].name).toBe('First independent edit');
  expect(projects['qa-neighbor'].name).toBe('Second independent edit');
  await page.reload(); await other.reload();
  expect((await exported(page)).name).toBe('First independent edit');
  expect((await exported(other)).name).toBe('Second independent edit');
  check(); checkOther();
});

test('edits made while a recovery copy waits for a lock remain in the current tab', async ({ page, context }) => {
  const source = await seed(context), other = await context.newPage();
  const check = observe(page), checkOther = observe(other);
  await page.goto(`/editor?id=${source.id}`); await other.goto(`/editor?id=${source.id}`);
  await rename(page, 'Other tab update'); await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(other.getByRole('alert')).toContainText('another tab');
  await rename(other, 'Copy at click time');
  // Hold a real browser lock, without blocking the page that needs to stay editable.
  await page.evaluate(() => new Promise<void>(resolve => {
    void navigator.locks.request('openplan3d-project-library', () => new Promise<void>(release => {
      (window as any).releaseLibraryLock = release; resolve();
    }));
  }));
  await other.getByRole('button', { name: 'Save as copy', exact: true }).click();
  await expect(other.getByRole('button', { name: 'Saving copy…', exact: true })).toBeDisabled();
  await rename(other, 'Edited while copy waited');
  await page.evaluate(() => { (window as any).releaseLibraryLock(); });
  await expect(other.getByRole('alert')).toContainText('made more edits');
  const stillEditing = await exported(other);
  expect(stillEditing.id).toBe(source.id); expect(stillEditing.name).toBe('Edited while copy waited');
  const projects = Object.values(await saved(other)) as any[];
  expect(projects.map(p => p.name).sort()).toEqual(['Copy at click time (Recovered copy)', 'Other tab update'].sort());
  await other.getByRole('button', { name: 'Save as copy', exact: true }).click();
  await expect(other.getByRole('alert')).toHaveCount(0);
  expect((await exported(other)).name).toBe('Edited while copy waited (Recovered copy)');
  check(); checkOther();
});
