import { expect, test } from '@playwright/test';

const text = {
  en: { heading: 'Page not found', help: 'Check your connection and try again. A recent app update may require a reload.', retry: 'Try again', library: 'Project library' },
  pt: { heading: 'Página não encontrada', help: 'Verifique sua conexão e tente novamente. Uma atualização recente do aplicativo pode exigir que a página seja recarregada.',
    retry: 'Tentar novamente', library: 'Biblioteca de projetos' },
};

for (const language of ['en', 'pt'] as const) test(`the missing-page screen follows the ${language} interface language`, async ({ page }) => {
  await page.addInitScript(language => localStorage.setItem('o3d_locale', language), language);
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  const expected = text[language];
  await expect(page.getByRole('heading', { name: expected.heading, exact: true })).toBeVisible();
  await expect(page.getByText(expected.help, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: expected.retry, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: expected.library, exact: true })).toHaveAttribute('href', '/');
  await expect(page.locator('html')).toHaveAttribute('lang', language);
});
