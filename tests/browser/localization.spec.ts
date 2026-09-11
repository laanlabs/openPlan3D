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
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(translated).toBeVisible();
  await translated.getByRole('button', { name: 'Aparência', exact: true }).click();
  await translated.getByRole('combobox', { name: 'Idioma', exact: true }).selectOption('en');
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
