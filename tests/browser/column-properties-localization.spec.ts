import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Portuguese column properties retain dimensions when switching shape', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Coluna redonda', exact: true }).click();
  await page.getByLabel('Floor plan editor canvas', { exact: true }).click({ position: { x: 300, y: 250 } });
  const panel = page.locator('[data-plan-properties]');
  await expect(panel.getByRole('heading', { name: /Propriedades da coluna/ })).toBeVisible();
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const original = await exported();
  expect(original.columns).toHaveLength(1);
  const diameter = panel.getByRole('spinbutton', { name: 'Diâmetro (cm)', exact: true });
  await diameter.fill('42.5'); await diameter.press('Tab');
  await panel.getByRole('button', { name: '⬜ Quadrada', exact: true }).click();
  await expect(panel.getByRole('button', { name: '⬜ Quadrada', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByRole('spinbutton', { name: 'Comprimento do lado (cm)', exact: true })).toHaveValue('42.5');
  for (const [label,value] of [['Altura (cm)','312.5'],['Rotação (graus)','27.5']]) {
    const input = panel.getByRole('spinbutton', { name: label, exact: true });
    await input.fill(value); await input.press('Tab');
  }
  await panel.getByRole('button', { name: 'Azul-marinho', exact: true }).click();
  const edited = await exported();
  expect(edited.columns[0]).toEqual({ ...original.columns[0], diameter: 42.5, height: 312.5, rotation: 27.5, shape: 'square', color: '#1e3a8a' });
  for (const key of ['walls','doors','windows','rooms','furniture']) expect(edited[key]).toEqual(original[key]);
  await panel.getByRole('button', { name: '⭕ Redonda', exact: true }).click();
  await expect(panel.getByRole('button', { name: '⭕ Redonda', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByRole('spinbutton', { name: 'Diâmetro (cm)', exact: true })).toHaveValue('42.5');
  await expect(panel.getByRole('spinbutton', { name: 'Rotação (graus)', exact: true })).toHaveCount(0);
  expect((await exported()).columns[0]).toEqual({ ...edited.columns[0], shape: 'round' });
});
