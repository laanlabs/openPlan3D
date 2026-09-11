import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { storedRecords } from './storage';

test('Portuguese history confirmations preserve cancellation and restore the selected version', async ({ page }) => {
  const current = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
  const prior = structuredClone(current);
  prior.name = 'Minha versão anterior';
  prior.floors[0].walls[0].height = 321;
  const history = JSON.stringify([{ timestamp: Date.now(), description: 'Snapshot {original}', data: JSON.stringify(prior) }]);
  await page.addInitScript(({ current, history }) => {
    localStorage.setItem('o3d_locale', 'pt');
    localStorage.setItem('floorplan_projects', JSON.stringify({ [current.id]: JSON.stringify(current) }));
    localStorage.setItem(`vh_${current.id}`, history);
  }, { current, history });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`/editor?id=${current.id}`);
  await page.getByRole('button', { name: /^(?:More actions|Mais ações)$/, exact: true }).click();
  await page.getByRole('button', { name: 'Histórico de versões', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Histórico de versões', exact: true });
  const entry = dialog.getByRole('group', { name: 'Snapshot {original}', exact: true });
  await expect(entry).toBeVisible();
  const before = await storedRecords(page, 'history');
  const cancelRestore = page.waitForEvent('dialog').then(async confirmation => {
    expect(confirmation.message()).toBe('Restaurar esta versão? As alterações atuais não salvas serão perdidas.');
    await confirmation.dismiss();
  });
  await entry.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await cancelRestore;
  await expect(dialog).toBeVisible();
  expect(await storedRecords(page, 'history')).toEqual(before);
  const cancelClear = page.waitForEvent('dialog').then(async confirmation => {
    expect(confirmation.message()).toBe('Excluir todo o histórico de versões deste projeto?');
    await confirmation.dismiss();
  });
  await dialog.getByRole('button', { name: 'Limpar todas as versões', exact: true }).click();
  await cancelClear;
  expect(await storedRecords(page, 'history')).toEqual(before);
  const restore = page.waitForEvent('dialog').then(confirmation => confirmation.accept());
  await entry.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await restore;
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTitle(/^(?:Click\ to\ rename|Clique\ para\ renomear)$/, { exact: true })).toHaveText(prior.name);
  await page.getByRole('button', { name: /^(?:Export|Exportar)$/, exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /^(?:Download\ JSON|Baixar\ JSON)$/, exact: true }).click();
  const saved = JSON.parse(await readFile((await (await downloading).path())!, 'utf8'));
  expect(saved.floors[0].walls[0].height).toBe(321);
});
