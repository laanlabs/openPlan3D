import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { savedProjects } from './storage';

// Written by the release that was live on 2026-09-29: one project from Download JSON, and a
// library backup holding it, its copy and a copy of the copy (see tests/backup-entry-points.test.ts).
const projectFile = () => readFile('tests/fixtures/sketch-two-floors.openplan.json');
const libraryFile = () => readFile('tests/fixtures/sketch-library-backup.json');
// What Firefox on Windows may report for a downloaded .json file, and its name for a second download.
const kinds = [
  { mimeType: 'application/json', name: 'Our house - shell.json' },
  { mimeType: 'text/plain', name: 'Our house - shell(1).json' },
  { mimeType: '', name: 'Our house - shell(1).json' },
];

function observe(page: Page) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== 'http://127.0.0.1:4188') external.push(r.url()); });
  return () => { expect(errors).toEqual([]); expect(external).toEqual([]); };
}
async function choose(page: Page, open: () => Promise<void>, file: { name: string; mimeType: string; buffer: Buffer }, accept: string) {
  const pending = page.waitForEvent('filechooser');
  await open();
  const chooser = await pending;
  expect(await chooser.element().getAttribute('accept')).toBe(accept);
  await chooser.setFiles(file);
}
async function restoreAll(page: Page, count: number) {
  const dialog = page.getByRole('dialog', { name: 'Restore library backup', exact: true });
  await expect(dialog).toContainText(count === 1 ? '1 project ready to restore' : `${count} projects ready to restore`);
  await dialog.getByRole('button', { name: 'Restore as copies', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText(count === 1 ? '1 project restored.' : `${count} projects restored.`);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

test('Import a Plan on the welcome screen hands a library backup to Restore', async ({ page }) => {
  const check = observe(page);
  await page.goto('/');
  const welcome = page.getByRole('dialog', { name: 'Welcome', exact: true });
  await choose(page, () => welcome.getByRole('button', { name: /Import a Plan/ }).click(),
    { name: 'openplan3d-library-backup.json', mimeType: 'application/json', buffer: await libraryFile() }, '.json');
  await expect(welcome).toHaveCount(0);
  await restoreAll(page, 3);
  for (const name of ['Our house - shell', 'Our house - shell (Copy)', 'Our house - shell (Copy) (Copy)']) {
    await expect(page.getByRole('link', { name: `${name} (Restored copy)`, exact: true })).toBeVisible();
  }
  expect(Object.keys(await savedProjects(page))).toHaveLength(3);
  check();
});

test('Import project package says where a JSON file opens when the picker shows all files', async ({ page }) => {
  const check = observe(page);
  await page.addInitScript(() => localStorage.setItem('hasSeenWelcome', 'true'));
  await page.goto('/');
  await expect(page.getByText('No projects yet', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Import project package', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Import project package', exact: true });
  await choose(page, () => dialog.getByRole('button', { name: 'Choose project package', exact: true }).click(),
    { name: 'Our house - shell.json', mimeType: 'application/json', buffer: await projectFile() }, '.zip,application/zip');
  await expect(dialog.getByRole('alert')).toHaveText('Invalid project package: This is a JSON file, not a project package. Open it with Restore library backup on the Projects page or with Import JSON in the editor.');
  expect(await savedProjects(page)).toEqual({});
  check();
});

for (const kind of kinds) {
  test(`Restore library backup adds a Download JSON file reported as “${kind.mimeType || 'no type'}”`, async ({ page }) => {
    const check = observe(page);
    await page.addInitScript(() => localStorage.setItem('hasSeenWelcome', 'true'));
    await page.goto('/');
    await page.getByRole('button', { name: 'Restore library backup', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Restore library backup', exact: true });
    await expect(dialog).toContainText('A library backup, or one project saved with Download JSON');
    await choose(page, () => dialog.getByRole('button', { name: 'Choose backup file', exact: true }).click(),
      { ...kind, buffer: await projectFile() }, '.json,application/json');
    await restoreAll(page, 1);
    await page.getByRole('link', { name: 'Our house - shell (Restored copy)', exact: true }).click();
    await expect(page.getByRole('application')).toContainText('5 walls');
    check();
  });

  test(`Import JSON opens a Download JSON file reported as “${kind.mimeType || 'no type'}” and hands a library backup to Restore`, async ({ page }) => {
    const check = observe(page);
    await page.addInitScript(() => localStorage.setItem('hasSeenWelcome', 'true'));
    await page.goto('/editor');
    await expect(page.getByRole('application')).toBeVisible();
    const importJSON = async () => {
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    };
    await choose(page, importJSON, { ...kind, buffer: await projectFile() }, '.json,.zip');
    await expect(page.getByTitle('Click to rename', { exact: true })).toHaveText('Our house - shell');
    await expect(page.getByRole('application')).toContainText('5 walls');
    await choose(page, importJSON, { ...kind, name: 'openplan3d-library-backup.json', buffer: await libraryFile() }, '.json,.zip');
    await restoreAll(page, 3);
    await expect(page.getByTitle('Click to rename', { exact: true })).toHaveText('Our house - shell');
    await expect(page.getByRole('alert')).toHaveCount(0);
    const names = Object.values(await savedProjects(page)).map(project => project.name).sort();
    expect(names).toEqual(['Our house - shell', 'Our house - shell (Copy) (Copy) (Restored copy)', 'Our house - shell (Copy) (Restored copy)',
      'Our house - shell (Restored copy)', 'Untitled Project']);
    check();
  });
}
