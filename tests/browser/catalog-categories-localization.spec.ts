import { expect, test } from '@playwright/test';

test('Portuguese categories and accent-free search retain original catalog items', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objetos', exact: true }).click();
  const search = page.getByRole('textbox', { name: 'Pesquisar', exact: true });
  const outlet = page.getByRole('button', { name: /^Tomada(?: Tomada)? 15×15cm$/ });
  const stove = page.getByRole('button', { name: /^Fogão(?: Fogão)? 60×60cm$/ });
  await page.getByRole('button', { name: 'Categorias', exact: true }).click();
  const back = page.getByRole('button', { name: /Voltar/ });
  // Electrical symbols live under the Elétrica sub-card.
  await page.getByRole('group', { name: 'Eletrodomésticos' }).getByRole('button', { name: 'Elétrica' }).click();
  await expect(outlet).toHaveCount(1);
  await expect(stove).toHaveCount(0);
  await back.click();
  // Accent-free and cross-language search.
  await search.fill('eletrica');
  await expect(outlet).toHaveCount(1);
  await expect(stove).toHaveCount(0);
  await search.fill('Electrical');
  await expect(outlet).toHaveCount(1);
  await search.fill('Power Outlet');
  await expect(page.getByText('1 resultado', { exact: true })).toBeVisible();
  await search.fill('tomada');
  await expect(outlet).toHaveCount(1);
  await search.fill('fogao');
  await expect(stove).toHaveCount(1);
  await page.getByTitle('Limpar pesquisa', { exact: true }).click();
  // Kitchen appliances live under the Furniture > Eletrodomésticos sub-card.
  await page.getByRole('group', { name: 'Móveis' }).getByRole('button', { name: 'Eletrodomésticos' }).click();
  await expect(stove).toHaveCount(1);
  await expect(outlet).toHaveCount(0);
  await stove.click();
  await expect(page.getByLabel(/^(?:Floor plan editor canvas|Área de edição da planta baixa)$/, { exact: true })).toHaveCSS('cursor', 'copy');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('o3d_recent_furniture')!))).toEqual(['stove']);
});
