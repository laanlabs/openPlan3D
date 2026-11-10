import { expect, test, type Page } from '@playwright/test';

const exportMessage = 'Your plan is ready! Try SVG for vector graphics or PDF for printing.';
const viewerMessage = 'Orbit with mouse, scroll to zoom, double-click to orbit around a point. Try walkthrough mode!';
const tip = (page: Page) => page.getByRole('region', { name: 'Getting started tip', exact: true });

async function openEditorWithClock(page: Page) {
  await page.clock.install({ time: new Date('2026-09-07T12:00:00Z') });
  await page.goto('/editor');
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await page.clock.pauseAt(new Date('2026-09-07T12:01:00Z'));
}

test('an open onboarding hint stays readable and dismissible through resizing', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openEditorWithClock(page);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  // Close the menu while leaving its introductory hint open.
  await page.getByRole('button', { name: 'Export', exact: true }).click();

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 852 },
    { width: 280, height: 390 },
    { width: 844, height: 390 },
    { width: 280, height: 130 },
    { width: 200, height: 100 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.clock.runFor(400);
    await expect(tip(page)).toContainText(exportMessage);
    await expect.poll(() => tip(page).evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const button = element.querySelector('button')!;
      const buttonBounds = button.getBoundingClientRect();
      const hit = document.elementFromPoint(
        buttonBounds.x + buttonBounds.width / 2, buttonBounds.y + buttonBounds.height / 2,
      );
      return {
        inside: bounds.left >= 7 && bounds.top >= 7
          && bounds.right <= innerWidth - 7 && bounds.bottom <= innerHeight - 7,
        readableWidth: bounds.width >= Math.min(260, innerWidth - 16),
        buttonInside: buttonBounds.top >= bounds.top && buttonBounds.bottom <= bounds.bottom,
        buttonReachable: hit === button || button.contains(hit),
        opaque: getComputedStyle(element).opacity === '1',
      };
    })).toEqual({ inside: true, readableWidth: true, buttonInside: true, buttonReachable: true, opaque: true });
    await testInfo.attach(`hint-${viewport.width}x${viewport.height}`, {
      body: await page.screenshot(), contentType: 'image/png',
    });
  }

  await tip(page).getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(tip(page)).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.clock.runFor(400);
  await expect(tip(page)).not.toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('o3d_tips_seen')!))).toContain('first-export');
  expect(errors).toEqual([]);
});

test('replacement hints get their own timer and resizing does not delay auto-dismissal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openEditorWithClock(page);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.clock.runFor(6000);
  await expect(tip(page)).toContainText(exportMessage);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  // The 3D hint replaces it once the viewer has started; the paused clock keeps the old timer waiting.
  await expect(tip(page)).toContainText(viewerMessage, { timeout: 30_000 });
  await page.clock.runFor(2500);
  // The first hint's deadline has passed, but the replacement is only 2.5s old.
  await expect(tip(page)).toContainText(viewerMessage);
  await page.setViewportSize({ width: 280, height: 390 });
  await page.clock.runFor(5000);
  await expect(tip(page)).toContainText(viewerMessage);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.clock.runFor(600);
  await expect(tip(page)).not.toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('o3d_tips_seen')!))).toContain('first-3d');

  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  // A started viewer is where the hint would open again.
  await expect(page.locator('canvas[data-plan3d-canvas="true"]')).toBeVisible();
  await page.clock.runFor(400);
  await expect(tip(page)).not.toBeVisible();
  // Replacing a tip must not mark that unfinished tip as seen.
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.clock.runFor(400);
  await expect(tip(page)).toContainText(exportMessage);
  await tip(page).getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(tip(page)).not.toBeVisible();
  expect(errors).toEqual([]);
});

test('hints close and stay closed for the session when storage cannot record them', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Readable storage that is too full to record a dismissed hint.
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key: string, value: string) {
      if (key === 'o3d_tips_seen') throw new DOMException('Full', 'QuotaExceededError');
      return setItem.call(this, key, value);
    };
  });
  await openEditorWithClock(page);
  const exportButton = page.getByRole('button', { name: 'Export', exact: true });
  await exportButton.click();
  await page.clock.runFor(400);
  await expect(tip(page)).toContainText(exportMessage);
  await tip(page).getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(tip(page)).not.toBeVisible();
  // "Got it" also closed the menu; opening it again must not bring the hint back.
  await exportButton.click();
  await page.clock.runFor(400);
  await expect(tip(page)).not.toBeVisible();
  await exportButton.click();

  // Automatic dismissal takes the same path.
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.clock.runFor(400);
  // The hint opens once the viewer has started, and its timer starts then.
  await expect(tip(page)).toContainText(viewerMessage, { timeout: 30_000 });
  await page.clock.runFor(8000);
  await expect(tip(page)).not.toBeVisible();
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas[data-plan3d-canvas="true"]')).toBeVisible();
  await page.clock.runFor(400);
  await expect(tip(page)).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('o3d_tips_seen'))).toBeNull();
  expect(errors).toEqual([]);
});
