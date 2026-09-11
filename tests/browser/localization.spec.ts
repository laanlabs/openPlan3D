import { expect, test } from '@playwright/test';

test('language changes preserve the open settings dialog and survive reload', async ({ page }) => {
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  await dialog.getByRole('button', { name: 'Appearance', exact: true }).click();
  await dialog.evaluate((element) => element.setAttribute('data-locale-survivor', 'yes'));
  await dialog.getByRole('combobox', { name: 'Language', exact: true }).focus();
  await dialog.getByRole('combobox', { name: 'Language', exact: true }).selectOption('pt');
  const translated = page.getByRole('dialog', { name: 'Configurações', exact: true });
  await expect(translated).toHaveAttribute('data-locale-survivor', 'yes');
  await expect(translated.getByRole('combobox', { name: 'Idioma', exact: true })).toBeFocused();
  await expect(translated.getByRole('button', { name: 'Aparência', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
  await page.keyboard.press('Escape');
  await expect(translated).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await expect(translated).toBeVisible();
  await translated.getByRole('button', { name: 'Aparência', exact: true }).click();
  await translated.getByRole('combobox', { name: 'Idioma', exact: true }).selectOption('en');
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('Portuguese settings edit floor values and configure a provider', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.route('https://api.openai.com/v1/models', route => route.fulfill({
    json: { data: [{ id: 'qa-image-model' }] },
  }));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Configurações', exact: true });
  const floors = dialog.getByRole('region', { name: 'Elevações dos pisos' });
  const elevation = floors.getByRole('spinbutton', { name: /^Elevação de / }).first();
  await elevation.fill('125.5');
  await elevation.press('Tab');
  await expect(elevation).toHaveValue('125.5');
  await dialog.getByRole('button', { name: 'IA', exact: true }).click();
  const provider = dialog.getByRole('region', { name: 'Configurações do provedor OpenAI' });
  await provider.getByLabel('Chave de API do provedor', { exact: true }).fill('qa-placeholder');
  await provider.getByRole('button', { name: 'Salvar configurações OpenAI' }).click();
  await expect(provider.getByRole('status')).toHaveText('Configurações OpenAI salvas.');
  await provider.getByRole('button', { name: 'Carregar modelos', exact: true }).click();
  await expect(provider.getByRole('status').filter({ hasText: '1 modelo encontrado.' })).toBeVisible();
  await provider.getByLabel('Modelo OpenAI', { exact: true }).fill('qa-image-model');
  await provider.getByLabel('Modelo OpenAI', { exact: true }).press('Tab');
  await provider.getByRole('button', { name: 'Remover configurações OpenAI' }).click();
  await expect(provider.getByRole('status').filter({ hasText: 'Configurações OpenAI removidas.' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Projeto', exact: true }).click();
  await expect(floors.getByRole('spinbutton', { name: /^Elevação de / }).first()).toHaveValue('125.5');
});
