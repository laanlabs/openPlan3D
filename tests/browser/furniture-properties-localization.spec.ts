import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('Portuguese furniture properties preserve finish IDs and reset original appearance', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/furniture-fidelity.openplan.json'));
  await expect(page.getByRole('button', { name: 'QA Furniture Fidelity', exact: true })).toBeVisible();
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const original = await exported();
  await page.getByRole('button', { name: 'Salvar', exact: true }).press('l');
  await page.getByRole('button', { name: '💺 Poltrona', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: /Propriedades de Poltrona/ })).toBeVisible();
  const material = page.getByRole('combobox', { name: 'Material', exact: true });
  await expect(material.locator('option')).toHaveText(['Materiais originais','Madeira','Metal','Tecido','Couro','Vidro','Plástico','Pedra','Cerâmica']);
  await material.selectOption({ label: 'Tecido' });
  await page.getByRole('button', { name: 'Cor: #191970', exact: true }).click();
  const depth = page.getByRole('spinbutton', { name: 'Profundidade (cm)', exact: true });
  await depth.fill('112.5'); await depth.press('Tab');
  await page.getByTitle('Girar 90° à direita', { exact: true }).click();
  await page.getByRole('button', { name: '↔ Espelhar H', exact: true }).click();
  const edited = await exported();
  expect(edited.furniture[0]).toEqual({ ...original.furniture[0], material: 'Fabric', color: '#191970', depth: 112.5, rotation: 90, scale: { ...original.furniture[0].scale, x: -1 } });
  expect(edited.furniture.slice(1)).toEqual(original.furniture.slice(1));
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  // Reapplying the existing color must retain the redo of the mirror operation.
  await page.getByRole('button', { name: 'Cor: #191970', exact: true }).click();
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  expect(await exported()).toEqual(edited);
  await page.getByRole('button', { name: 'Restaurar padrões', exact: true }).click();
  const reset = await exported();
  const expected = { ...edited.furniture[0] };
  for (const key of ['color','width','depth','height','material']) delete expected[key];
  expect(reset.furniture[0]).toEqual(expected);
  expect(reset.furniture.slice(1)).toEqual(original.furniture.slice(1));

  const details = page.getByRole('region', { name: 'Detalhes do item', exact: true });
  const notes = details.getByRole('textbox', { name: 'Notas do item', exact: true });
  await notes.fill('Original {value}\nSegunda linha'); await notes.press('Tab');
  const cost = details.getByRole('spinbutton', { name: 'Custo do item', exact: true });
  await cost.fill('123.456'); await cost.press('Tab');
  await cost.fill('-1'); await cost.press('Tab');
  await expect(details.getByRole('alert')).toHaveText('Digite um custo igual ou maior que zero ou limpe o campo.');
  await expect(cost).toHaveValue('123.456');
  const metadata = await exported();
  expect(metadata.furniture[0].details).toMatchObject({ note: 'Original {value}\nSegunda linha', price: 123.456 });
  expect(metadata.furniture.slice(1)).toEqual(reset.furniture.slice(1));
});
