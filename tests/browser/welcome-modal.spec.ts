import { expect, test, type Page } from '@playwright/test';

function observe(page: Page) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== 'http://127.0.0.1:4188') external.push(r.url()); });
  return () => { expect(errors).toEqual([]); expect(external).toEqual([]); };
}
// Role queries ignore native modal inertness, so check the browser's focus boundary itself.
async function focusInside(page: Page, name: string) {
  const dialog = page.getByRole('dialog', { name, exact: true });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate(node => node.matches(':modal') && node.contains(document.activeElement))).toBe(true);
  return dialog;
}

for (const width of [1440, 390]) test(`the first-visit welcome keeps focus and Escape on its own controls at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const check = observe(page);
  await page.goto('/');
  const dialog = await focusInside(page, 'Welcome');
  const title = dialog.getByRole('heading', { name: 'Welcome', exact: true });
  // Tab and Shift+Tab cycle the welcome's controls and never reach the library behind it.
  for (const key of ['Tab', 'Tab', 'Tab', 'Tab', 'Tab', 'Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    await focusInside(page, 'Welcome');
  }
  // An import error is shown inside the modal, where its dismiss button stays usable.
  const chooser = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: /Import a Plan/ }).click();
  await (await chooser).setFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(dialog.getByRole('alert')).toContainText('No project was imported.');
  await dialog.getByRole('button', { name: 'Dismiss import error', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  // Escape goes back from the templates and from the tour. Browsers refuse an Escape only
  // after an interaction since the dialog opened, so each case starts on a fresh page.
  await dialog.getByRole('button', { name: /Use a Template/ }).click();
  await expect(dialog.getByRole('heading', { name: 'Floor Plan Templates', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(title).toBeVisible();
  await page.reload(); await focusInside(page, 'Welcome');
  await dialog.getByRole('button', { name: /Quick Tour/ }).click();
  await expect(dialog.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(title).toBeVisible();
  // The main card has no dismiss control, so it refuses Escape after an interaction.
  await page.reload(); await focusInside(page, 'Welcome');
  await title.click();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveAttribute('open', '');
  expect(await dialog.evaluate(node => node.matches(':modal'))).toBe(true);
  // Browsers close it on a repeated Escape anyway: that dismisses it for this visit only.
  // No assertions between the presses: they can count as user activation.
  for (let press = 0; press < 3; press++) await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('hasSeenWelcome'))).toBeNull();
  const templates = page.getByRole('button', { name: 'Templates', exact: true });
  await templates.focus(); await expect(templates).toBeFocused();
  await page.reload();
  await expect(title).toBeVisible();
  check();
});
