import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Portuguese opening catalog places original door and window types', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('o3d_locale', 'pt');
    localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall','first-door','first-export']));
  });
  await page.goto('/editor');
  await page.getByRole('button', { name: /^Desenhar parede W/ }).click();
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  await canvas.click({ position: { x: 100, y: 250 } });
  await canvas.click({ position: { x: 700, y: 250 } });
  await page.keyboard.press('Escape');
  for (const label of ['Simples 90cm de abrir','Dupla 150cm de abrir','De correr 180cm de correr','Francesa 150cm de vidro','Embutida 90cm embutida','Dobrável 180cm dobrável','Vão de passagem 100cm livre','Garagem 240cm basculante','Padrão 120×120cm','Fixa 100×100cm','De abrir 80×130cm','De correr 180×120cm','Saliente 200×150cm']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(1);
  }
  await page.getByRole('button', { name: 'Ajustar à tela', exact: true }).click();
  const bounds = (await canvas.boundingBox())!;
  await page.getByRole('button', { name: 'Simples 90cm de abrir', exact: true }).click();
  await canvas.click({ position: { x: bounds.width * .35, y: bounds.height / 2 } });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Fixa 100×100cm', exact: true }).click();
  await canvas.click({ position: { x: bounds.width * .65, y: bounds.height / 2 } });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
  const saved = JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  expect(saved.doors).toHaveLength(1);
  expect(saved.windows).toHaveLength(1);
  expect(saved.doors[0]).toMatchObject({ type: 'single', width: 90 });
  expect(saved.windows[0]).toMatchObject({ type: 'fixed', width: 100 });
  expect(saved.doors[0].wallId).toBe(saved.walls[0].id);
  expect(saved.windows[0].wallId).toBe(saved.walls[0].id);
  await page.getByRole('button', { name: 'Toggle Layers Panel', exact: true }).click();
  await page.getByRole('button', { name: '🚪 Porta simples 1', exact: true }).click();
  const width = page.getByRole('spinbutton', { name: 'Largura (cm)', exact: true });
  await width.fill('95.25'); await width.press('Tab');
  await page.getByRole('combobox', { name: 'Tipo', exact: true }).selectOption('french');
  await page.getByRole('button', { name: 'Direita', exact: true }).click();
  await page.getByRole('button', { name: 'Para fora', exact: true }).click();
  await page.getByRole('button', { name: '🪟 Janela fixa 1', exact: true }).click();
  const sill = page.getByRole('spinbutton', { name: 'Altura do peitoril (cm)', exact: true });
  await sill.fill('85.5'); await sill.press('Tab');
  await page.getByRole('combobox', { name: 'Tipo', exact: true }).selectOption('casement');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const editedDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
  const edited = JSON.parse(await readFile((await (await editedDownload).path())!, 'utf8')).floors[0];
  expect(edited.walls).toEqual(saved.walls);
  expect(edited.doors[0]).toEqual({ ...saved.doors[0], width: 95.25, type: 'french', swingDirection: 'right', flipSide: true });
  expect(edited.windows[0]).toEqual({ ...saved.windows[0], type: 'casement', sillHeight: 85.5 });
});
