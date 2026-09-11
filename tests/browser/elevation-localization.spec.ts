import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('Portuguese elevation navigation preserves walls and openings', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/connected-dimensions.openplan.json'));
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const original = await exported();
  await page.getByRole('button', { name: 'Salvar', exact: true }).press('l');
  await page.getByRole('button', { name: '─ Parede 1', exact: true }).click();
  await page.getByRole('button', { name: 'Elevação', exact: true }).first().click();
  await expect(page.getByLabel('Tela de edição da elevação da parede', { exact: true })).toBeVisible();
  await expect(page.getByText(`Parede 1 de ${original.walls.length}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Próxima parede', exact: true }).click();
  await expect(page.getByText(`Parede 2 de ${original.walls.length}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Parede anterior', exact: true }).click();
  await expect(page.getByText(`Parede 1 de ${original.walls.length}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Parede anterior', exact: true }).click();
  await expect(page.getByText(`Parede ${original.walls.length} de ${original.walls.length}`, { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Tela de edição da elevação da parede', { exact: true })).toHaveCount(0);
  expect(await exported()).toEqual(original);
});
