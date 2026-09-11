import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('Portuguese item photo controls preserve downloads and retained bytes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/furniture-fidelity.openplan.json'));
  await page.getByRole('button', { name: 'Salvar', exact: true }).press('l');
  await page.getByRole('button', { name: '💺 Poltrona', exact: true }).first().click();
  const panel = page.getByRole('region', { name: 'Detalhes do item', exact: true });
  const photoChooser = page.waitForEvent('filechooser');
  await panel.getByRole('button', { name: 'Adicionar foto', exact: true }).click();
  await (await photoChooser).setFiles(resolve('tests/fixtures/item-photo.png'));
  await expect(panel.getByRole('heading', { name: 'Fotos do item (1)', exact: true })).toBeVisible();
  await expect(panel.getByRole('img', { name: 'Foto do item 1', exact: true })).toBeVisible();
  const photoDownload = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Baixar foto 1', exact: true }).click();
  const bytes = await readFile((await (await photoDownload).path())!);
  expect(bytes).toEqual(await readFile('tests/fixtures/item-photo.png'));
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  }
  await expect(panel.getByRole('status')).toHaveText('Foto anexada. Salve o projeto para mantê-la neste navegador.');
  const attached = await exported();
  await panel.getByRole('button', { name: 'Remover foto 1 do item', exact: true }).click();
  await expect(panel.getByRole('heading', { name: 'Fotos do item (0)', exact: true })).toBeVisible();
  const detached = await exported();
  expect(detached.floors[0].furniture[0].details.photos).toEqual([]);
  expect(detached.projectPackage.assets).toEqual(attached.projectPackage.assets);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect((await exported()).floors[0].furniture[0].details.photos).toEqual(attached.floors[0].furniture[0].details.photos);

  await panel.getByRole('button', { name: 'Remover foto 1 do item', exact: true }).click();
  await panel.locator('summary').filter({ hasText: 'Anexos preservados (1)' }).click();
  const retainedName = Object.keys(attached.projectPackage.assets)[0].slice(7);
  await panel.getByRole('button', { name: `Anexar arquivo preservado ${retainedName}`, exact: true }).click();
  await expect(panel.getByRole('status')).toHaveText('Anexo existente reutilizado.');
  await panel.getByRole('button', { name: `Excluir arquivo preservado ${retainedName}`, exact: true }).click();
  await expect(panel.getByRole('alert')).toHaveText('Este arquivo ainda é usado por um item ou imagem de referência. Remova essas referências primeiro.');
  expect((await exported()).floors[0].furniture[0].details.photos).toEqual(attached.floors[0].furniture[0].details.photos);
  await panel.getByRole('button', { name: 'Remover foto 1 do item', exact: true }).click();
  await panel.getByRole('button', { name: `Excluir arquivo preservado ${retainedName}`, exact: true }).click();
  const confirmation = panel.getByRole('group', { name: 'Excluir anexo preservado', exact: true });
  await expect(confirmation).toContainText('item-photo.png');
  await confirmation.getByRole('button', { name: 'Manter arquivo', exact: true }).click();
  expect((await exported()).projectPackage.assets).toEqual(attached.projectPackage.assets);
  await panel.getByRole('button', { name: `Excluir arquivo preservado ${retainedName}`, exact: true }).click();
  await confirmation.getByRole('button', { name: 'Excluir arquivo do projeto', exact: true }).click();
  expect(Object.keys((await exported()).projectPackage.assets)).toHaveLength(0);
  await expect(panel.getByRole('status')).toHaveText('Arquivo removido das futuras exportações deste projeto. Salve para manter esta alteração.');
});
