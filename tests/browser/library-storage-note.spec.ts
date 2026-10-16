import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { savedProjects } from './storage';

const note = {
  en: 'This browser may delete saved projects, for example when it runs low on space. Use “Download library backup” regularly to keep a copy.',
  pt: 'Este navegador pode excluir projetos salvos, por exemplo quando estiver com pouco espaço. Use “Baixar backup da biblioteca” regularmente para manter uma cópia.',
};
const unavailable = 'Browser storage is unavailable. Allow site storage or download your project as JSON.';

/** Fixed StorageManager answers, so results depend neither on engine heuristics nor on Firefox's permission prompt. */
async function storageManager(page: Page, persisted: boolean) {
  await page.addInitScript(persisted => {
    const calls = { checks: 0, requests: 0 };
    (window as any).qaStorage = calls;
    StorageManager.prototype.persisted = async function () { calls.checks++; return persisted; };
    StorageManager.prototype.persist = async function () { calls.requests++; return persisted; };
  }, persisted);
}

async function seed(page: Page, locale = 'en') {
  const project = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
  project.id = 'qa-storage-note'; project.name = 'QA Storage Note';
  await page.addInitScript(({ project, locale }) => {
    if (!localStorage.getItem('qaStorageNoteSeeded')) {
      localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) }));
      localStorage.setItem('qaStorageNoteSeeded', 'true');
    }
    localStorage.setItem('hasSeenWelcome', 'true');
    localStorage.setItem('o3d_locale', locale);
  }, { project, locale });
  return project;
}

function observe(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  return () => expect(errors).toEqual([]);
}

const requests = (page: Page) => page.evaluate(() => (window as any).qaStorage.requests as number);
/** The note renders, if at all, within a frame of the browser's answer. */
async function checked(page: Page) {
  await page.waitForFunction(() => (window as any).qaStorage.checks > 0);
  await page.evaluate(() => new Promise(requestAnimationFrame));
}

test('the library recommends a backup while storage is not persistent, and stays dismissed', async ({ page }) => {
  const check = observe(page);
  await storageManager(page, false);
  const project = await seed(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: project.name, exact: true })).toBeVisible();
  const storageNote = page.getByRole('note').filter({ hasText: note.en });
  await expect(storageNote).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  // The note names the existing backup button rather than adding a second one.
  await expect(page.getByRole('button', { name: 'Download library backup', exact: true })).toHaveCount(1);
  expect(await requests(page)).toBe(0); // Opening the library never asks.
  await storageNote.getByRole('button', { name: 'Dismiss storage note', exact: true }).click();
  await expect(storageNote).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('link', { name: project.name, exact: true })).toBeVisible();
  await checked(page);
  await expect(page.getByRole('note')).toHaveCount(0);
  check();
});

test('the library shows no storage note when the browser keeps its data', async ({ page }) => {
  const check = observe(page);
  await storageManager(page, true);
  const project = await seed(page);
  await page.goto('/');
  await expect(page.getByRole('link', { name: project.name, exact: true })).toBeVisible();
  await checked(page);
  await expect(page.getByRole('note')).toHaveCount(0);
  check();
});

test('the storage note is translated', async ({ page }) => {
  const check = observe(page);
  await storageManager(page, false);
  await seed(page, 'pt');
  await page.goto('/');
  const storageNote = page.getByRole('note').filter({ hasText: note.pt });
  await expect(storageNote).toBeVisible();
  await expect(storageNote.getByRole('button', { name: 'Fechar aviso de armazenamento', exact: true })).toBeVisible();
  check();
});

test('creating a project asks for persistent storage once per browser', async ({ page }) => {
  const check = observe(page);
  await storageManager(page, false);
  await page.addInitScript(() => localStorage.setItem('hasSeenWelcome', 'true'));
  await page.goto('/');
  await expect(page.getByText('No projects yet', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Project', exact: true }).click();
  await expect(page).toHaveURL(/\/editor\?id=/);
  await expect.poll(() => requests(page)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('openplan3d-persist-requested'))).toBe('true');

  // Another page load in the same browser shows the note but does not ask again.
  await page.goto('/');
  await expect(page.getByRole('note').filter({ hasText: note.en })).toBeVisible();
  await page.getByRole('button', { name: 'New Project', exact: true }).click();
  await expect(page).toHaveURL(/\/editor\?id=/);
  await expect.poll(async () => Object.keys(await savedProjects(page)).length).toBe(2);
  expect(await requests(page)).toBe(0);
  check();
});

/** Automation grants sticky activation on navigation; a person opening a link has none until they press something. */
async function realActivation(page: Page) {
  await page.addInitScript(() => {
    if (typeof UserActivation === 'undefined') return;
    let active = false;
    for (const type of ['pointerdown', 'keydown']) addEventListener(type, event => { if (event.isTrusted) active = true; }, true);
    Object.defineProperty(UserActivation.prototype, 'hasBeenActive', { configurable: true, get: () => active });
  });
}

test('the empty plan a bare editor link saves on load does not ask; the next save does', async ({ page }) => {
  const check = observe(page);
  await storageManager(page, false);
  await realActivation(page);
  await page.goto('/editor');
  await expect(page).toHaveURL(/\/editor\?id=/);
  await expect.poll(async () => Object.keys(await savedProjects(page)).length).toBe(1);
  expect(await requests(page)).toBe(0);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => requests(page)).toBe(1);
  check();
});

test('with site storage blocked the library explains it, shows no note and asks nothing', async ({ page }) => {
  const check = observe(page);
  await storageManager(page, false);
  await page.addInitScript(() => {
    const denied = () => new DOMException('Access is denied for this document.', 'SecurityError');
    for (const name of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, name, { configurable: true, get() { throw denied(); } });
    }
    IDBFactory.prototype.open = function() { throw denied(); };
  });
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: unavailable })).toBeVisible();
  await checked(page);
  await expect(page.getByRole('note')).toHaveCount(0);
  await page.getByRole('button', { name: 'New Project', exact: true }).click();
  await expect(page).toHaveURL(/\/editor\?id=/);
  await expect(page.getByRole('alert').filter({ hasText: 'Changes are not saved.' })).toContainText(unavailable);
  expect(await requests(page)).toBe(0);
  check();
});
