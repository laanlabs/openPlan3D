import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.setViewportSize({ width: 390, height: 900 });
});

test('Portuguese welcome recovers from invalid JSON and creates the selected template', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bem-vindo', exact: true })).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Importar uma Planta/ }).click();
  await (await chooser).setFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.getByRole('alert')).toContainText('Nenhum projeto foi importado.');
  await page.getByRole('button', { name: 'Fechar erro de importação', exact: true }).click();
  await page.getByRole('button', { name: /Usar um Modelo/ }).click();
  await expect(page.getByRole('button', { name: /Casa em L/ })).toBeVisible();
  await page.getByRole('button', { name: /Apartamento estúdio/ }).click();
  await expect(page.getByRole('application')).toContainText('paredes');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  for (const name of ['Exportar 2D como PNG', 'Exportar 3D como PNG', 'Exportar como SVG', 'Exportar como DXF', 'Exportar como DWG', 'Exportar como PDF', 'Baixar pacote de projeto', 'Importar JSON']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
  const saved = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(saved.name).toBe('Studio Apartment');
  expect(saved.floors[0].name).toBe('Ground Floor');
  expect(saved.floors[0].walls.length).toBeGreaterThan(0);
});

test('Portuguese quick tour completes and remains dismissed after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Tour Rápido/ }).click();
  for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Próximo', exact: true }).click();
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bem-vindo', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bem-vindo', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('hasSeenWelcome'))).toBe('true');
});
