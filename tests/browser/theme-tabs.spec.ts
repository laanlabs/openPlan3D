import { expect, test, type Page } from '@playwright/test';

function observe(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  return () => expect(errors).toEqual([]);
}

test('a theme chosen in another tab applies at once, and System returns to this tab\'s own system theme', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('hasSeenWelcome', 'true'));
  const check = observe(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveClass(/\bdark\b/);

  const other = await context.newPage();
  const checkOther = observe(other);
  await other.emulateMedia({ colorScheme: 'light' });
  await other.goto('/editor');
  await other.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = other.getByRole('dialog', { name: 'Settings', exact: true });
  await settings.getByRole('button', { name: 'Appearance', exact: true }).click();
  await settings.getByRole('button', { name: 'Light' }).click();
  await expect(html).not.toHaveClass(/\bdark\b/);

  await settings.getByRole('button', { name: 'System' }).click();
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(other.locator('html')).not.toHaveClass(/\bdark\b/);
  check(); checkOther();
});
