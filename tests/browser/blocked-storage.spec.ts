import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const unavailable = 'Browser storage is unavailable. Allow site storage or download your project as JSON.';

/** Site data blocked (strict privacy settings, "Block all cookies"): web storage refuses access and IndexedDB will not open. */
async function blockSiteStorage(page: Page) {
  await page.addInitScript(() => {
    const denied = () => new DOMException('Access is denied for this document.', 'SecurityError');
    for (const name of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, name, { configurable: true, get() { throw denied(); } });
    }
    IDBFactory.prototype.open = function() { throw denied(); };
  });
}

function observe(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  return () => expect(errors).toEqual([]);
}

test('the library explains blocked site storage instead of failing to load', async ({ page }) => {
  const check = observe(page);
  await blockSiteStorage(page);
  await page.goto('/');
  const alert = page.getByRole('alert').filter({ hasText: unavailable });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole('button', { name: 'Retry loading', exact: true })).toBeVisible();
  await expect(alert.getByRole('button', { name: 'Download library backup', exact: true })).toBeVisible();
  check();
});

test('with site storage blocked a new plan still opens, downloads as JSON and takes a theme', async ({ page }) => {
  const check = observe(page);
  await page.emulateMedia({ colorScheme: 'light' });
  await blockSiteStorage(page);
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: unavailable })).toBeVisible();
  await page.getByRole('button', { name: 'New Project', exact: true }).click();
  await expect(page).toHaveURL(/\/editor\?id=/);
  const saveAlert = page.getByRole('alert').filter({ hasText: 'Changes are not saved.' });
  await expect(saveAlert).toContainText(unavailable);

  // The plan exists only in memory; the JSON backup keeps it.
  const pending = page.waitForEvent('download');
  await saveAlert.getByRole('button', { name: 'Download JSON backup', exact: true }).click();
  const backup = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(backup.id).toBe(new URL(page.url()).searchParams.get('id'));

  const html = page.locator('html');
  await expect(html).not.toHaveClass(/\bdark\b/);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings.getByRole('button', { name: 'Appearance', exact: true }).click();
  await settings.getByRole('button', { name: 'Dark' }).click();
  await expect(html).toHaveClass(/\bdark\b/);
  check();
});

test('with site storage blocked the snap step, Settings, the Gemini key and catalog picks work for the session', async ({ page }) => {
  const check = observe(page);
  await blockSiteStorage(page);
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: unavailable })).toBeVisible();
  await page.getByRole('button', { name: 'New Project', exact: true }).click();
  await expect(page).toHaveURL(/\/editor\?id=/);

  // S and the status-bar Snap button switch the step although storage cannot keep it.
  const step = page.getByTitle('Switch snap step: 25 cm grid or 10 cm (S)', { exact: true });
  await expect(step).toHaveText('🧲 Snap 25 cm');
  await page.getByRole('button', { name: 'Save', exact: true }).press('s');
  await expect(step).toHaveText('🧲 Snap 10 cm');
  await step.click();
  await expect(step).toHaveText('🧲 Snap 25 cm');

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings.getByRole('button', { name: 'Dimensions', exact: true }).click();
  await settings.getByRole('button', { name: 'ft, inch', exact: true }).click();
  // A key that cannot be stored is reported instead of shown as saved.
  await settings.getByRole('button', { name: 'AI', exact: true }).click();
  await settings.getByPlaceholder('AIza...', { exact: true }).fill('AIza-blocked-storage');
  await settings.getByRole('button', { name: 'Save Key', exact: true }).click();
  await expect(settings.getByRole('alert')).toHaveText('Browser storage is unavailable. The key could not be saved.');
  await expect(settings.getByRole('button', { name: 'Save Key', exact: true })).toBeVisible();
  await settings.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(settings.getByRole('alert')).toHaveText('Browser storage is unavailable. The key could not be removed.');
  await settings.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(page.getByTitle('Switch snap step: 9.8" grid or 3.9" (S)', { exact: true })).toHaveText('🧲 Snap 9.8"');

  // Favorites and recent items last for the session.
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await page.getByRole('button', { name: 'Add Sofa to favorites', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Remove Sofa from favorites', exact: true }).first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /^Sofa(?: Sofa)?(?: 200×90cm)?$/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Recent', exact: true })).toBeVisible();
  check();
});
