import { expect, test } from '@playwright/test';

test.setTimeout(120_000);

test('Rooms tab drills from a room into a sub-card and places an item', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hasSeenWelcome', 'true'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await expect(page.getByRole('button', { name: /Living room/ }).first()).toBeVisible();
  await page.getByRole('button', { name: /Living room/ }).first().click();
  await page.getByRole('button', { name: /Sofas/ }).click();
  await page.getByRole('button', { name: /^Sof[aá]/ }).first().click();
  const canvas = page.getByLabel(/^(?:Floor plan editor canvas|Área de edição da planta baixa)$/, { exact: true });
  await expect(canvas).toHaveCSS('cursor', 'copy');
});

test('global search filters items and clears', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hasSeenWelcome', 'true'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  const search = page.getByRole('textbox', { name: 'Search', exact: true });
  await search.fill('Dining Chair');
  await expect(page.getByText('1 result', { exact: true })).toBeVisible();
  await page.getByTitle('Clear search', { exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByRole('button', { name: /Living room/ }).first()).toBeVisible();
});

test('Categories tab lists grouped sub-cards and opens one', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hasSeenWelcome', 'true'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await page.getByRole('button', { name: 'Categories', exact: true }).click();
  await expect(page.getByText('Furniture', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Appliances/ }).click();
  await expect(page.getByRole('button', { name: /^Fridge/ }).first()).toBeVisible();
});
