import { expect, test, type Page } from '@playwright/test';

/** The Command Palette's "Toggle Snap" flips the same switch as the top-bar Snap to Grid button. */
async function toggleSnapFromPalette(page: Page) {
  await page.getByRole('button', { name: 'Save', exact: true }).press('ControlOrMeta+k');
  const search = page.getByRole('combobox', { name: 'Search commands', exact: true });
  await search.fill('Toggle Snap');
  await expect(page.getByRole('option', { name: /Toggle Snap/ })).toHaveAttribute('aria-selected', 'true');
  await search.press('Enter');
  await expect(search).toHaveCount(0);
}

/** The status-bar Snap button's title while Snap to Grid is off; it names the step S has picked. */
const offTitle = (step: string) => `Snap to Grid is off in the top bar. S still picks the step used when it is on: 25 cm grid or 10 cm (now ${step})`;

test('the top-bar Snap to Grid button shows the state the Command Palette set', async ({ page }) => {
  await page.goto('/editor');
  const snapping = page.getByRole('button', { name: 'Snap to Grid', exact: true });
  await expect(snapping).toHaveAttribute('aria-pressed', 'true');
  await expect(snapping).toHaveAttribute('title', 'Snap to Grid (On)');
  await toggleSnapFromPalette(page);
  await expect(snapping).toHaveAttribute('aria-pressed', 'false');
  await expect(snapping).toHaveAttribute('title', 'Snap to Grid (Off)');
  await snapping.click();
  await expect(snapping).toHaveAttribute('aria-pressed', 'true');
  await expect(snapping).toHaveAttribute('title', 'Snap to Grid (On)');
  await toggleSnapFromPalette(page);
  await expect(snapping).toHaveAttribute('title', 'Snap to Grid (Off)');
});

test('the More actions Snap to Grid item shows the state the Command Palette set on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/editor');
  await toggleSnapFromPalette(page);
  // The top-bar button is hidden at this width, so the status bar is the snap indicator on screen.
  await expect(page.getByTitle(offTitle('25 cm'), { exact: true })).toHaveText('🧲 Snap off');
  await page.getByRole('button', { name: 'More actions', exact: true }).click();
  const item = page.getByRole('button', { name: /Snap to Grid/ });
  await expect(item).toHaveAttribute('aria-pressed', 'false');
  await expect(item).toHaveText('Snap to Grid');
  await item.click();
  await expect(item).toHaveAttribute('aria-pressed', 'true');
  await expect(item).toHaveText('✓ Snap to Grid');
});

test('S and the status-bar Snap button switch the snap step and leave Snap to Grid alone', async ({ page }) => {
  await page.goto('/editor');
  const snapping = page.getByRole('button', { name: 'Snap to Grid', exact: true });
  const step = page.getByTitle('Switch snap step: 25 cm grid or 10 cm (S)', { exact: true });
  await expect(step).toHaveText('🧲 Snap 25 cm');
  await expect(step).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Save', exact: true }).press('s');
  await expect(step).toHaveText('🧲 Snap 10 cm');
  await expect(step).toHaveAttribute('aria-pressed', 'false');
  await expect(snapping).toHaveAttribute('aria-pressed', 'true');
  await step.click();
  await expect(step).toHaveText('🧲 Snap 25 cm');
  await expect(snapping).toHaveAttribute('aria-pressed', 'true');
});

test('the status-bar Snap button reads Snap off while Snap to Grid is off, and S still picks the step', async ({ page }) => {
  await page.goto('/editor');
  const snapping = page.getByRole('button', { name: 'Snap to Grid', exact: true });
  const step = page.getByTitle('Switch snap step: 25 cm grid or 10 cm (S)', { exact: true });
  await expect(step).toHaveText('🧲 Snap 25 cm');
  await snapping.click();
  await expect(snapping).toHaveAttribute('aria-pressed', 'false');
  const off = page.getByTitle(offTitle('25 cm'), { exact: true });
  await expect(off).toHaveText('🧲 Snap off');
  await expect(off).toHaveAttribute('aria-pressed', 'false');
  await expect(step).toHaveCount(0);
  // S still switches the step, which applies once Snap to Grid is back on.
  await page.getByRole('button', { name: 'Save', exact: true }).press('s');
  await expect(page.getByTitle(offTitle('10 cm'), { exact: true })).toHaveText('🧲 Snap off');
  await expect(snapping).toHaveAttribute('aria-pressed', 'false');
  await snapping.click();
  await expect(step).toHaveText('🧲 Snap 10 cm');
  await expect(step).toHaveAttribute('aria-pressed', 'false');
});

test('the snap step reads in inches when the plan uses feet and inches', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_settings', JSON.stringify({ units: 'imperial' })));
  await page.goto('/editor');
  const step = page.getByTitle('Switch snap step: 9.8" grid or 3.9" (S)', { exact: true });
  await expect(step).toHaveText('🧲 Snap 9.8"');
  await page.getByRole('button', { name: 'Save', exact: true }).press('s');
  await expect(step).toHaveText('🧲 Snap 3.9"');
});
