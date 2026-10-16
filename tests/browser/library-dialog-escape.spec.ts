import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { storedRecords } from './storage';

const backup = resolve('tests/fixtures/library-backup.json');
const projectPackage = resolve('tests/fixtures/native-project-package.zip');

async function seed(page: Page) {
  const source = JSON.parse(JSON.parse(await readFile(backup, 'utf8')).projects['qa-library-restore']);
  await page.addInitScript(source => {
    if (!localStorage.getItem('floorplan_projects')) localStorage.setItem('floorplan_projects', JSON.stringify({ [source.id]: JSON.stringify(source) }));
    localStorage.setItem('hasSeenWelcome', 'true');
  }, source);
  await page.goto('/');
  await expect(page.getByRole('link', { name: source.name, exact: true })).toBeVisible();
  return source;
}
function observe(page: Page) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== 'http://127.0.0.1:4188') external.push(r.url()); });
  return () => { expect(errors).toEqual([]); expect(external).toEqual([]); };
}
/** Hold the next IndexedDB connection (the restore's) until released, so its dialog stays busy. */
async function holdNextDatabaseOpen(page: Page) {
  await page.evaluate(() => {
    const open = IDBFactory.prototype.open;
    let release = () => {};
    const released = new Promise<void>(resolve => { release = resolve; });
    (window as any).releaseDatabase = () => release();
    IDBFactory.prototype.open = function (this: IDBFactory, name: string, version?: number) {
      IDBFactory.prototype.open = open;
      const request = open.call(this, name, version);
      let onsuccess: ((event: Event) => unknown) | null = null;
      Object.defineProperty(request, 'onsuccess', { configurable: true, get: () => onsuccess, set: handler => { onsuccess = handler; } });
      request.addEventListener('success', event => { void released.then(() => onsuccess?.call(request, event)); });
      return request;
    };
  });
}
/** A prevented Escape is honoured once per user activation; the next press closes the
 * dialog anyway. No assertions between the presses: they can count as activation. */
async function pressEscapeRepeatedly(page: Page) {
  for (let press = 0; press < 3; press++) await page.keyboard.press('Escape');
}

test('a busy library restore survives repeated Escape and its dialog opens again afterwards', async ({ page }) => {
  const check = observe(page), source = await seed(page), before = await storedRecords(page);
  const opener = page.getByRole('button', { name: 'Restore library backup', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Restore library backup', exact: true });
  await opener.click();
  const chooser = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: 'Choose backup file', exact: true }).click();
  await (await chooser).setFiles(backup);
  await expect(dialog).toContainText('1 project ready to restore');
  await holdNextDatabaseOpen(page);
  await dialog.getByRole('button', { name: 'Restore as copies', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Restoring…', exact: true })).toBeDisabled();
  await pressEscapeRepeatedly(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog.getByRole('button', { name: 'Restoring…', exact: true })).toBeDisabled();
  expect(await storedRecords(page)).toEqual(before);
  await page.evaluate(() => (window as any).releaseDatabase());
  await expect(dialog.getByRole('status')).toContainText('1 project restored.');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('link', { name: `${source.name} (Restored copy)`, exact: true })).toBeVisible();
  await opener.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  check();
});

test('a busy package import survives repeated Escape and its dialog opens again afterwards', async ({ page }) => {
  const check = observe(page); await seed(page);
  const before = Object.keys(await storedRecords(page));
  const opener = page.getByRole('button', { name: 'Import project package', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Import project package', exact: true });
  await opener.click();
  const chooser = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: 'Choose project package', exact: true }).click();
  await (await chooser).setFiles(projectPackage);
  const confirm = dialog.getByRole('button', { name: 'Import as copy', exact: true });
  await expect(confirm).toBeEnabled();
  await holdNextDatabaseOpen(page);
  await confirm.click();
  await expect(dialog.getByRole('button', { name: 'Importing…', exact: true })).toBeDisabled();
  await pressEscapeRepeatedly(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('open', '');
  await page.evaluate(() => (window as any).releaseDatabase());
  await expect(dialog.getByRole('status')).toContainText('Project imported.');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(Object.keys(await storedRecords(page))).toHaveLength(before.length + 1);
  await opener.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  check();
});
