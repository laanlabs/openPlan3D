import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const language of ['en', 'pt'] as const) test(`${language}: named undo history exposes the current step and restores a floor change`, async ({ page }) => {
  const project = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
  await page.addInitScript(({ project, language }) => {
    localStorage.setItem('o3d_locale', language);
    localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) }));
  }, { project, language });
  await page.goto(`/editor?id=${project.id}`);
  async function exported() {
    await page.getByRole('button', { name: /^(?:Export|Exportar)$/, exact: true }).click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: /^(?:Download JSON|Baixar JSON)$/, exact: true }).click();
    return JSON.parse(await readFile((await (await downloading).path())!, 'utf8'));
  }
  const before = await exported();
  await page.getByRole('button', { name: /^(?:Add Floor|Adicionar pavimento)$/, exact: true }).click();
  await page.getByRole('button', { name: /^(?:Empty floor|Pavimento vazio)$/, exact: true }).click();
  expect((await exported()).floors).toHaveLength(before.floors.length + 1);
  const toggle = page.getByRole('button', { name: language === 'en' ? 'Toggle Undo History' : 'Alternar histórico de ações', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const history = page.getByRole('region', { name: language === 'en' ? 'Undo History' : 'Histórico de Ações', exact: true });
  await expect(history).toBeVisible();
  await expect(history.locator('[aria-current="step"]')).toHaveText(language === 'en' ? /Current state/ : /Estado atual/);
  await history.getByRole('button', { name: /Added floor/ }).click();
  expect((await exported()).floors).toEqual(before.floors);
  await history.getByRole('button', { name: language === 'en' ? 'Close history' : 'Fechar histórico', exact: true }).click();
  await expect(history).toHaveCount(0);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
