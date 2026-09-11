import { expect, test } from '@playwright/test';

test('Portuguese category filters and accent-free search retain original catalog items', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objetos', exact: true }).click();
  const search = page.getByRole('textbox', { name: 'Pesquisar móveis...', exact: true });
  const outlet = page.getByRole('button', { name: /^Power Outlet(?: Power Outlet)? 15×15cm$/ });
  const stove = page.getByRole('button', { name: /^Stove(?: Stove)? 60×60cm$/ });
  await page.getByRole('button', { name: 'Elétrica', exact: true }).click();
  await expect(outlet).toHaveCount(1);
  await expect(stove).toHaveCount(0);
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await search.fill('eletrica');
  await expect(outlet).toHaveCount(1);
  await expect(stove).toHaveCount(0);
  await search.fill('Electrical');
  await expect(outlet).toHaveCount(1);
  await search.fill('Power Outlet');
  await expect(page.getByText('1 resultado para "Power Outlet"', { exact: true })).toBeVisible();
  await page.getByTitle('Limpar pesquisa', { exact: true }).click();
  await page.getByRole('button', { name: 'Cozinha', exact: true }).click();
  await expect(stove).toHaveCount(1);
  await expect(outlet).toHaveCount(0);
  await stove.click();
  await expect(page.getByLabel(/^(?:Floor plan editor canvas|Área de edição da planta baixa)$/, { exact: true })).toHaveCSS('cursor', 'copy');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('o3d_recent_furniture')!))).toEqual(['stove']);
});
