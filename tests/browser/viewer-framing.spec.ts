import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

// Four magenta columns mark the outer corners of a wide plan. Inspect rendered
// pixels, rather than depending on Three/Svelte internals or screenshot goldens.
test('top-down fits every corner after orbit, stacking and viewport changes', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4188') external.push(request.url());
  });
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/top-down-framing.openplan.json'));
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.waitForLoadState('networkidle');
  const hint = page.getByRole('button', { name: 'Got it', exact: true });
  await expect(hint).toBeHidden({ timeout: 15_000 });
  await expect(hint).not.toBeVisible();
  const canvas = page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').last();
  const samples: any[] = [];
  const inspect = () => canvas.evaluate((node: HTMLCanvasElement) => {
    const probe = document.createElement('canvas'); probe.width = node.width; probe.height = node.height;
    const ctx = probe.getContext('2d')!; ctx.drawImage(node, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, probe.width, probe.height);
    const canvasBounds = node.getBoundingClientRect();
    const buttons = [...node.closest('[role="region"]')!.querySelectorAll('button')].map(button => button.getBoundingClientRect()).filter(rect => rect.width && rect.height);
    const counts = [0, 0, 0, 0]; let minX = width, minY = height, maxX = -1, maxY = -1;
    let occluded = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4, r = data[index], g = data[index + 1], b = data[index + 2];
      if (r > 140 && b > 110 && r > g * 1.6 && b > g * 1.6) {
        counts[(y >= height / 2 ? 2 : 0) + (x >= width / 2 ? 1 : 0)]++;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        const screenX = canvasBounds.x + x / width * canvasBounds.width, screenY = canvasBounds.y + y / height * canvasBounds.height;
        if (buttons.some(rect => screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom)) occluded++;
      }
    }
    return { counts, minX, minY, maxX, maxY, width, height, occluded };
  });
  const allCornersFit = async () => {
    const result = await inspect();
    return result.occluded === 0 && result.counts.every(count => count > 25) && result.minX > result.width * 0.025 && result.maxX < result.width * 0.975 && result.minY > result.height * 0.025 && result.maxY < result.height * 0.975;
  };
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 900 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      for (const stacked of [false, true]) {
        if (stacked) await page.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
        const bounds = (await canvas.boundingBox())!;
        // Leave damping in flight before requesting the fitted view.
        await page.mouse.move(bounds.x + bounds.width * 0.45, bounds.y + bounds.height * 0.6);
        await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.5, { steps: 3 });
        await page.mouse.up();
        await page.getByRole('button', { name: 'Top-Down View', exact: true }).click();
        await expect.poll(allCornersFit).toBe(true);
        await page.evaluate(() => new Promise<void>(resolve => { let remaining = 20; const frame = () => --remaining ? requestAnimationFrame(frame) : resolve(); requestAnimationFrame(frame); }));
        expect(await allCornersFit()).toBe(true);
        samples.push({ viewport, stacked, ...(await inspect()) });
        await testInfo.attach(`top-down-${viewport.width}-${stacked ? 'stacked' : 'active'}`, { body: await page.screenshot(), contentType: 'image/png' });
        if (stacked) await page.getByRole('button', { name: 'Active Floor Only', exact: true }).click();
      }
    }
    // Top-Down is also an explicit way out of keyboard walkthrough, including
    // browsers where mouse capture is denied.
    await page.evaluate(() => { HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new DOMException('Denied', 'NotAllowedError')); });
    await page.getByRole('button', { name: 'Enter Walkthrough Mode', exact: true }).click();
    await expect(page.getByText('Walkthrough Controls', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Top-Down View', exact: true }).click();
    await expect(page.getByText('Walkthrough Controls', { exact: true })).not.toBeVisible();
    await expect.poll(allCornersFit).toBe(true);
    expect(errors).toEqual([]); expect(external).toEqual([]);
  } finally {
    await testInfo.attach('corner-pixel-bounds', { body: JSON.stringify(samples, null, 2), contentType: 'application/json' });
  }
});
