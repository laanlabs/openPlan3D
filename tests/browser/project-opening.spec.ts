import { savedProjects as library, storedRecords, failProjectWrites as failWrites } from './storage';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const fixture = resolve('tests/fixtures/native-import.openplan.json');
async function seed(page: Page) {
  const source = JSON.parse(await readFile(fixture, 'utf8'));
  await page.addInitScript(source => {
    if (!localStorage.getItem('floorplan_projects')) {
      localStorage.setItem('floorplan_projects', JSON.stringify({ [source.id]: JSON.stringify(source) }));
    }
    localStorage.setItem('hasSeenWelcome', 'true');
    // Keep edits pending throughout UI actions, independent of CI machine speed.
    const timeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: any[]) =>
      timeout(handler, delay === 1000 ? 60_000 : delay, ...args)) as typeof window.setTimeout;
  }, source);
  await page.goto(`/editor?id=${source.id}`);
  await expect(page.getByRole('application')).toContainText('1 room');
  return source;
}
async function rename(page: Page, name: string) {
  await page.getByTitle('Click to rename', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill(name);
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
}
async function importJSON(page: Page, file = fixture) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await pending).setFiles(file);
}
async function exportJSON(page: Page) {
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
  test(`same-ID imports preserve pending edits and reopen as separate copies at ${width}px`, async ({ page }, testInfo) => {
    // This end-to-end case includes multiple downloads, persistence/reloads and
    // a cold 3D renderer. Preserve each phase on slower software-rendered hosts.
    test.slow();
    await page.setViewportSize({ width, height: 900 });
    const check = observe(page), source = await seed(page);
    const normalized = await exportJSON(page);
    await rename(page, 'Latest original edits');
    expect((await library(page))[source.id].name).toBe(source.name);
    await importJSON(page);
    await expect(page.getByTitle('Click to rename', { exact: true })).toHaveText(`${source.name} (Imported copy)`);
    const copy = await exportJSON(page);
    expect(copy.id).not.toBe(source.id);
    expect(copy.floors).toEqual(normalized.floors);
    expect(copy.extensions).toEqual(source.extensions);
    const saved = await library(page);
    expect(Object.keys(saved)).toHaveLength(2);
    expect(saved[source.id].name).toBe('Latest original edits');
    expect(saved[copy.id].floors).toEqual(normalized.floors);
    await page.reload();
    expect((await exportJSON(page)).id).toBe(copy.id);
    await page.getByRole('link', { name: width < 768 ? 'Back to Projects' : 'Projects', exact: true }).click();
    await page.getByRole('link', { name: 'Latest original edits', exact: true }).click();
    expect((await exportJSON(page)).id).toBe(source.id);
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible();
    await testInfo.attach(`preserved-original-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    check();
  });
}

test('a failed current save blocks import and New Project, with backup and retry', async ({ page }) => {
  const check = observe(page), source = await seed(page);
  await rename(page, 'Unsaved work to recover');
  await failWrites(page);
  const url = page.url(), originalLibrary = await library(page);
  await importJSON(page);
  await expect(page.getByRole('alert').filter({ hasText: 'Your current plan could not be saved' })).toBeVisible();
  expect(page.url()).toBe(url);
  expect((await exportJSON(page)).name).toBe('Unsaved work to recover');
  expect(await library(page)).toEqual(originalLibrary);
  await page.getByRole('button', { name: 'Dismiss import error', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: 'New Project', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Your current plan could not be saved' })).toBeVisible();
  expect(page.url()).toBe(url);
  await page.getByRole('button', { name: 'Dismiss import error', exact: true }).click();
  const backup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON backup', exact: true }).click();
  const recovered = JSON.parse(await readFile((await (await backup).path())!, 'utf8'));
  expect(recovered.name).toBe('Unsaved work to recover'); expect(recovered.id).toBe(source.id);
  await page.evaluate(() => { (window as any).failProjectWrites = false; });
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await importJSON(page);
  await expect(page.getByTitle('Click to rename', { exact: true })).toHaveText(`${source.name} (Imported copy)`);
  expect((await library(page))[source.id].name).toBe('Unsaved work to recover');
  check();
});

test('a failed candidate save keeps the import in memory and its original safe in the library', async ({ page }) => {
  const check = observe(page), source = await seed(page);
  const normalized = await exportJSON(page);
  await failWrites(page);
  await importJSON(page);
  await expect(page.getByTitle('Click to rename', { exact: true })).toHaveText(`${source.name} (Imported copy)`);
  await expect(page.getByRole('alert')).toContainText('Browser storage is full');
  const copy = await exportJSON(page);
  expect(copy.id).not.toBe(source.id); expect(copy.floors).toEqual(normalized.floors);
  expect(Object.keys(await library(page))).toEqual([source.id]);
  expect((await library(page))[source.id]).toEqual(source);
  await page.evaluate(() => { (window as any).failProjectWrites = false; });
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  // A click starts asynchronous IndexedDB work; wait for the committed save
  // before navigating away, as the user-facing status instructs.
  await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
  await page.reload(); expect((await exportJSON(page)).id).toBe(copy.id);
  check();
});

test('sidebar RoomPlan import and toolbar New Project preserve pending predecessor edits', async ({ page }) => {
  const check = observe(page), source = await seed(page);
  await rename(page, 'Before RoomPlan import');
  const pending = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import RoomPlan iOS LiDAR scan/ }).click();
  await (await pending).setFiles(resolve('tests/fixtures/handoff-roomplan.json'));
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Current floor' }).locator('option')).toHaveText(['Entry', 'Loft', 'Future Floor']);
  expect((await library(page))[source.id].name).toBe('Before RoomPlan import');
  const imported = await exportJSON(page);
  const importedPreview = (await storedRecords(page, 'thumbnails'))[imported.id];
  expect(importedPreview).toBeTruthy();
  await rename(page, 'Before New Project');
  expect((await library(page))[imported.id].name).toBe(imported.name);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: 'New Project', exact: true }).click();
  await expect(page.getByRole('application')).toContainText('0 walls');
  const created = await exportJSON(page);
  expect(created.id).not.toBe(imported.id);
  await expect.poll(async () => (await storedRecords(page, 'thumbnails'))[created.id]).toBeTruthy();
  expect((await storedRecords(page, 'thumbnails'))[created.id]).not.toBe(importedPreview);
  expect((await library(page))[imported.id].name).toBe('Before New Project');
  await page.reload(); expect((await exportJSON(page)).id).toBe(created.id);
  check();
});

test('leaving the editor cancels a slow import before it can replace a library project', async ({ page }) => {
  const check = observe(page), source = await seed(page);
  await page.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = function() {
      return new Promise<string>(resolve => { (window as any).finishImportRead = async () => resolve(await read.call(this)); });
    };
  });
  await importJSON(page);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('link', { name: source.name, exact: true })).toBeVisible();
  await page.evaluate(async () => { await (window as any).finishImportRead(); });
  // A later UI action ensures completion cannot navigate back or create a copy.
  await page.getByRole('link', { name: source.name, exact: true }).click();
  expect((await exportJSON(page)).id).toBe(source.id);
  expect(Object.keys(await library(page))).toEqual([source.id]);
  check();
});

test('welcome and library templates create independent saved projects', async ({ page }) => {
  const check = observe(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Use a Template/ }).click();
  await page.getByRole('button', { name: /Studio Apartment/ }).click();
  await expect(page.getByRole('application')).toContainText('walls');
  const first = await exportJSON(page);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page.getByRole('button', { name: /1-Bedroom Apartment/ }).click();
  const second = await exportJSON(page);
  expect(first.id).not.toBe(second.id);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: 'New Project', exact: true }).click();
  await expect(page.getByRole('application')).toContainText('0 walls');
  const third = await exportJSON(page);
  expect(new Set([first.id, second.id, third.id]).size).toBe(3);
  const saved = await library(page);
  expect(Object.keys(saved)).toHaveLength(3);
  expect(saved[first.id].floors).toEqual(first.floors);
  expect(saved[second.id].floors).toEqual(second.floors);
  check();
});
