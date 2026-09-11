import { expect, test } from '@playwright/test';

test('Portuguese palette searches without accents and executes after closing', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('o3d_locale', 'pt');
    localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door']));
  });
  await page.goto('/editor');
  const save = page.getByRole('button', { name: /^(?:Save|Salvar)$/, exact: true });
  await save.press('ControlOrMeta+k');
  const search = page.getByRole('combobox', { name: 'Pesquisar comandos', exact: true });
  await search.fill('configuracoes');
  await expect(page.getByRole('option', { name: /Configurações/ })).toHaveAttribute('aria-selected', 'true');
  await search.press('Enter');
  const settings = page.getByRole('dialog', { name: 'Configurações', exact: true });
  await expect(settings).toBeVisible();
  await expect(search).toHaveCount(0);
  await page.keyboard.press('Escape');
  await save.press('ControlOrMeta+k');
  await search.fill('zz-no-command');
  await expect(search).not.toHaveAttribute('aria-activedescendant');
  await search.fill('parede');
  await expect(page.getByRole('option', { name: /Parede/ })).toHaveAttribute('aria-selected', 'true');
  await search.press('Enter');
  await expect(page.getByLabel('Floor plan editor canvas', { exact: true })).toHaveCSS('cursor', 'crosshair');
  const grid = page.getByTitle('Alternar grade (G)', { exact: true });
  const before = await grid.textContent();
  await save.press('ControlOrMeta+k');
  await search.fill('grade');
  await search.press('Enter');
  await expect(grid).not.toHaveText(before!);
  await save.press('ControlOrMeta+k');
  await search.fill('acao');
  await expect(page.getByRole('listbox', { name: 'Comandos', exact: true }).getByRole('option').first()).toContainText('Ação');
  await page.keyboard.press('Escape');
  await expect(save).toBeFocused();
});
