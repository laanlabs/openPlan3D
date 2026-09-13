import { expect, test } from '@playwright/test';

test.setTimeout(180_000);
test('full 3D viewer shares model decoding and releases images when leaving the viewer', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door']));
    const images = new WeakSet<object>();
    const counters = { decoded: 0, uploads: 0, closed: 0 };
    (window as any).__customModelGPU = counters;
    const decode = window.createImageBitmap;
    window.createImageBitmap = async function (...args: any[]) {
      const image = await Reflect.apply(decode, window, args);
      if (image.width === 32 && image.height === 24) { images.add(image); counters.decoded++; }
      return image;
    } as typeof createImageBitmap;
    const close = ImageBitmap.prototype.close;
    ImageBitmap.prototype.close = function () {
      if (images.has(this)) { counters.closed++; images.delete(this); }
      return close.call(this);
    };
    for (const method of ['texImage2D', 'texSubImage2D'] as const) {
      const upload = WebGL2RenderingContext.prototype[method];
      WebGL2RenderingContext.prototype[method] = function (this: WebGL2RenderingContext, ...args: any[]) {
        if (args.some(arg => arg && typeof arg === 'object' && images.has(arg))) counters.uploads++;
        return Reflect.apply(upload, this, args);
      } as any;
    }
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  const panel = page.getByRole('region', { name: 'My 3D models', exact: true });
  await panel.locator('input[type=file]').setInputFiles('tests/fixtures/local-model-textured-box.glb');
  const dialog = page.getByRole('dialog', { name: 'Import GLB model', exact: true });
  await expect(dialog.locator('canvas')).toBeVisible();
  await dialog.getByRole('button', { name: 'Add to project', exact: true }).click();
  await expect(dialog).toBeHidden();
  await panel.getByRole('button', { name: 'Place at view center', exact: true }).click();
  await panel.getByRole('button', { name: 'Place at view center', exact: true }).click();
  const before = await page.evaluate(() => ({ ...(window as any).__customModelGPU }));
  expect(before.decoded).toBe(1); expect(before.closed).toBe(1);
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const viewer = page.getByRole('region', { name: '3D floor plan viewer', exact: true });
  await expect(viewer.locator('canvas').first()).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => (window as any).__customModelGPU.uploads)).toBeGreaterThan(before.uploads);
  const shown = await page.evaluate(() => ({ ...(window as any).__customModelGPU }));
  expect(shown.decoded).toBe(before.decoded + 1);
  expect(shown.closed).toBe(before.closed);
  await testInfo.attach('custom-model-in-viewer', { body: await viewer.screenshot(), contentType: 'image/png' });
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__customModelGPU.closed)).toBe(before.closed + 1);
  expect(errors).toEqual([]);
});
