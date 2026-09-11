import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('Portuguese wall length controls preserve connections and reject invalid drafts', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/connected-dimensions.openplan.json'));
  await page.getByRole('button', { name: 'Salvar', exact: true }).press('l');
  await page.getByRole('button', { name: '─ Parede 1', exact: true }).click();
  const length = page.getByRole('textbox', { name: 'Comprimento (cm)', exact: true });
  await expect(length).toHaveValue('600.5');
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const original = await exported();
  await length.fill('6.5025 m'); await length.press('Enter');
  await expect(length).toHaveValue('650.25');
  await page.getByRole('combobox', { name: 'Manter fixo', exact: true }).selectOption('end');
  await length.fill('700.75'); await length.press('Enter');
  const edited = await exported();
  expect(edited.walls[0].start.x).toBeCloseTo(-50.5);
  expect(edited.walls[0].end.x).toBeCloseTo(650.25);
  expect(edited.walls[1].start).toEqual(edited.walls[0].end);
  expect(edited.walls[3].end).toEqual(edited.walls[0].start);
  expect(edited.doors).toEqual(original.doors);
  expect(edited.windows).toEqual(original.windows);
  for (const value of ['', '0', '-1', '700 cm extra']) {
    await length.fill(value); await length.press('Enter');
    await expect(length).toHaveValue('700.75');
    await expect(page.getByRole('alert')).toHaveText('Digite um comprimento de parede de pelo menos 1 cm.');
  }
  expect((await exported()).walls).toEqual(edited.walls);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(length).toHaveValue('650.25');
});
