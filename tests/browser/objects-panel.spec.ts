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

test('My Items tab exposes the GLB import button', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hasSeenWelcome', 'true'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await page.getByRole('button', { name: 'My Items', exact: true }).click();
  await expect(page.getByRole('region', { name: 'My 3D models', exact: true }).getByRole('button', { name: 'Import GLB model', exact: true })).toBeVisible();
});

test('mobile tools drawer is full width and closes with the panel ✕', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('hasSeenWelcome', 'true'));
  await page.goto('/editor');
  const tools = page.getByRole('button', { name: 'Toggle tools panel', exact: true });
  await tools.click();
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  const search = page.getByRole('textbox', { name: 'Search', exact: true });
  await expect(search).toBeVisible();
  const box = (await search.boundingBox())!;
  expect(box.width).toBeGreaterThan(320);
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await expect(tools).toHaveAttribute('aria-expanded', 'false');
});

test('Recent and Favorite cards reflect persisted furniture', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenWelcome', 'true');
    localStorage.setItem('o3d_recent_furniture', JSON.stringify(['sofa']));
    localStorage.setItem('o3d_favorite_furniture', JSON.stringify(['chair']));
  });
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Sof/ }).first()).toBeVisible();
  await page.getByRole('button', { name: /Favorite/ }).first().click();
  await expect(page.getByRole('button', { name: /^Armchair/ }).first()).toBeVisible();
});
