import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { observeGPU, gpu } from './gpu';

test.use({ viewport: { width: 844, height: 600 } });

test('3D sleeps when idle and wakes for controls, scene changes and walkthrough', async ({ page }) => {
  test.setTimeout(120_000);
  await observeGPU(page);
  // Observe the browser boundary in CI, without production instrumentation.
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    const pending = new Set<number>();
    let fired = 0;
    (window as any).__animationAudit = () => ({ pending: pending.size, fired });
    window.requestAnimationFrame = callback => {
      const id = request(time => { pending.delete(id); fired++; callback(time); });
      pending.add(id);
      return id;
    };
    window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/top-down-framing.openplan.json'));
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.waitForLoadState('networkidle');
  const hint = page.getByRole('button', { name: 'Got it', exact: true });
  if (await hint.isVisible()) await hint.click();
  const canvas = page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').last();
  const audit = () => page.evaluate(() => (window as any).__animationAudit());
  const activeDraws = async () => (await gpu(page)).find((entry: any) => entry.connected && !entry.lost)?.draws ?? 0;
  const pixels = async () => createHash('sha256').update(await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL())).digest('hex');
  const idle = async () => {
    // Software-rendered CI needs time to draw each remaining damping step.
    await expect.poll(async () => (await audit()).pending, { timeout: 40_000 }).toBe(0);
    const before = await audit(), draws = await activeDraws();
    // A quiet interval must contain neither polling callbacks nor GPU draws.
    await page.waitForTimeout(350);
    expect(await audit()).toEqual(before);
    expect(await activeDraws()).toBe(draws);
  };
  await idle();
  let before = await pixels();
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * 0.45, bounds.y + bounds.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.65, bounds.y + bounds.height * 0.5, { steps: 4 });
  await page.mouse.up();
  await idle();
  expect(await pixels()).not.toBe(before);

  before = await pixels();
  await page.getByRole('button', { name: 'Top-Down View', exact: true }).click();
  await idle();
  expect(await pixels()).not.toBe(before);

  // Moving/removing a placement preview must wake a sleeping viewer too.
  await page.getByRole('button', { name: 'Edit Mode', exact: true }).click();
  await page.getByRole('button', { name: 'Place Furniture', exact: true }).click();
  await page.getByRole('button', { name: /Armchair/ }).click();
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.65);
  await page.waitForLoadState('networkidle');
  await idle();
  before = await pixels();
  await page.mouse.move(bounds.x + bounds.width * 0.6, bounds.y + bounds.height * 0.65);
  await idle();
  expect(await pixels()).not.toBe(before);
  before = await pixels();
  await page.getByRole('button', { name: 'Exit Furniture Placement', exact: true }).click();
  await idle();
  expect(await pixels()).not.toBe(before);
  await page.getByRole('button', { name: 'Exit Edit Mode', exact: true }).click();

  before = await pixels();
  await page.getByRole('button', { name: 'Lighting Controls', exact: true }).click();
  await page.getByRole('button', { name: /night/i }).click();
  await page.getByRole('button', { name: 'Lighting Controls', exact: true }).click();
  await idle();
  expect(await pixels()).not.toBe(before);
  before = await pixels();
  await page.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
  await idle();
  expect(await pixels()).not.toBe(before);
  const draws = (await gpu(page))[0].draws;
  await page.setViewportSize({ width: 844, height: 390 });
  await idle();
  expect((await gpu(page))[0].draws).toBeGreaterThan(draws);

  await page.evaluate(() => { HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new DOMException('Denied', 'NotAllowedError')); });
  await page.getByRole('button', { name: 'Enter Walkthrough Mode', exact: true }).click();
  await expect(page.getByText('Walkthrough Controls', { exact: true })).toBeVisible();
  await expect.poll(async () => (await gpu(page))[0].draws).toBeGreaterThan((await gpu(page))[0].draws);
  before = await pixels();
  await page.keyboard.down('ArrowUp');
  try {
    // Hold through an actual rendered movement step, including slow CI GPUs.
    await expect.poll(pixels, { timeout: 10_000 }).not.toBe(before);
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await page.getByRole('button', { name: 'Top-Down View', exact: true }).click();
  await expect(page.getByText('Walkthrough Controls', { exact: true })).not.toBeVisible();
  await idle();
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect.poll(async () => (await gpu(page))[0].lost).toBe(true);
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await idle();
  expect((await gpu(page))[1].draws).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
