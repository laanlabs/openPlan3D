import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { savedProjects } from './storage';

test('Portuguese editor recovery preserves legacy bytes and retries migration', async ({ page }) => {
  const source = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
  const legacy = JSON.stringify({ [source.id]: JSON.stringify(source) });
  await page.addInitScript(legacy => {
    localStorage.setItem('o3d_locale', 'pt');
    localStorage.setItem('floorplan_projects', legacy);
    localStorage.setItem('hasSeenWelcome', 'true');
    (window as any).failMigration = true;
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function(...args) {
      if (this.name === 'meta' && (window as any).failMigration) throw new DOMException('Full', 'QuotaExceededError');
      return add.apply(this, args);
    };
  }, legacy);
  await page.goto(`/editor?id=${source.id}`);
  await expect(page.getByRole('alert')).toContainText('Browser storage is full');
  await expect(page.getByRole('link', { name: 'Voltar aos projetos', exact: true })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar backup da biblioteca', exact: true }).click();
  expect(await readFile((await (await pending).path())!, 'utf8')).toBe(legacy);
  await page.evaluate(() => { (window as any).failMigration = false; });
  await page.getByRole('button', { name: 'Tentar carregar novamente', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(Object.keys(await savedProjects(page))).toEqual([source.id]);
  expect((await savedProjects(page))[source.id]).toEqual(source);
  expect(await page.evaluate(() => localStorage.getItem('floorplan_projects'))).toBe(legacy);
});
