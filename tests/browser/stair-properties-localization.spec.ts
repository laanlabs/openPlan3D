import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Portuguese stair properties preserve layout IDs and edited geometry', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: /^Adicionar escada Clique para posicionar a escada$/ }).click();
  await page.getByLabel('Floor plan editor canvas', { exact: true }).click({ position: { x: 300, y: 250 } });
  const panel = page.locator('[data-plan-properties]');
  await expect(panel.getByRole('heading', { name: /Propriedades da escada/ })).toBeVisible();
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const original = await exported();
  expect(original.stairs).toHaveLength(1);
  const type = panel.getByRole('combobox', { name: 'Tipo', exact: true });
  await expect(type.locator('option')).toHaveText(['Reta','Em L','Em U','Caracol']);
  await type.selectOption({ label: 'Em U' });
  for (const [label, value] of [['Largura (cm)','122.5'],['Profundidade (cm)','310.5'],['Espelhos','18'],['Rotação (graus)','27.5']]) {
    const input = panel.getByRole('spinbutton', { name: label, exact: true });
    await input.fill(value); await input.press('Tab');
  }
  await panel.getByRole('button', { name: 'Descer ↓', exact: true }).click();
  const edited = await exported();
  expect(edited.stairs[0]).toEqual({ ...original.stairs[0], stairType: 'u-shaped', width: 122.5, depth: 310.5, riserCount: 18, rotation: 27.5, direction: 'down' });
  for (const key of ['walls','doors','windows','rooms','furniture']) expect(edited[key]).toEqual(original[key]);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect((await exported()).stairs[0]).toEqual({ ...edited.stairs[0], direction: original.stairs[0].direction });
});
