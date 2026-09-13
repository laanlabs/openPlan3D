import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Portuguese command furniture search preserves aliases and keyboard placement IDs', async ({ page }) => {
  test.slow();
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors;
  }
  const before = await exported();
  const canvas = page.getByLabel('Área de edição da planta baixa', { exact: true });
  await canvas.focus(); await canvas.press('/');
  const palette = page.getByRole('dialog', { name: 'Paleta de Comandos', exact: true });
  const search = palette.getByRole('combobox');
  await search.fill('fogao');
  await expect(palette.locator('#command-result-f-stove')).toContainText('Fogão');
  await expect(palette.locator('#command-result-f-stove')).toContainText('Cozinha');
  for (const query of ['poltrona', 'Armchair', 'chair']) {
    await search.fill(query);
    await expect(palette.locator('#command-result-f-chair')).toContainText('Poltrona');
    await expect(palette.locator('#command-result-f-chair')).toContainText('Sala de estar');
  }
  await search.fill('poltrona'); await search.press('Enter');
  await expect(palette).toHaveCount(0);
  await expect(canvas).toHaveCSS('cursor', 'copy');
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * .55, y: box.height * .6 } });
  await canvas.press('Escape');
  const after = await exported();
  expect(after[0].furniture).toHaveLength(before[0].furniture.length + 1);
  expect(after[0].furniture.at(-1).catalogId).toBe('chair');
  expect(after[0].walls).toEqual(before[0].walls);
});
