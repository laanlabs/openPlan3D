import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';

// Hardware acceleration off, a blocklisted GPU, or a policy or extension blocking WebGL: the
// browser cannot create a WebGL context. The 3D view must say so instead of showing an empty
// viewer with dead controls and an uncaught error, and the 2D editor must keep working.
async function withoutWebGL(page: Page, locale: 'en' | 'pt') {
  await page.addInitScript(locale => {
    localStorage.setItem('o3d_locale', locale);
    localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door']));
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: any[]) {
      return /^(webgl2?|experimental-webgl)$/.test(type) ? null : (getContext as any).call(this, type, ...args);
    } as typeof getContext;
  }, locale);
}

test('3D view explains missing WebGL, offers no dead controls and leaves 2D editing working', async ({ page }) => {
  test.setTimeout(90_000); // Lazy viewer bundle plus the 3D PNG capture's bounded wait.
  await withoutWebGL(page, 'en');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let downloads = 0;
  page.on('download', () => downloads++);
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/connected-dimensions.openplan.json'));
  await expect(page.getByRole('button', { name: 'QA Connected Dimensions', exact: true })).toBeVisible();

  const viewer = page.getByRole('region', { name: '3D floor plan viewer', exact: true });
  const message = 'The 3D view needs WebGL, which this browser could not start. Turn on hardware acceleration or try another browser. The 2D plan still works.';
  // The second visit mounts a fresh viewer from the loaded bundle, which must fail the same way.
  for (let visit = 0; visit < 2; visit++) {
    await page.getByRole('button', { name: '3D', exact: true }).click();
    // The first visit also downloads the lazily loaded viewer bundle.
    await expect(viewer.getByRole('alert')).toHaveText(message, { timeout: 60_000 });
    await expect(viewer.locator('canvas')).toHaveCount(0);
    // The toolbar, lighting and Blender export all need the renderer.
    await expect(viewer.getByRole('button')).toHaveCount(0);
    await page.getByRole('button', { name: '2D', exact: true }).click();
    await expect(viewer).toHaveCount(0);
    await expect(page.getByLabel('Floor plan editor canvas', { exact: true })).toBeVisible();
    await expect(page.getByRole('application')).toContainText('4 walls');
  }

  await page.getByRole('button', { name: 'Toggle Layers Panel', exact: true }).click();
  await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
  const thickness = page.getByRole('spinbutton', { name: 'Thickness (cm)', exact: true });
  await expect(thickness).toHaveValue('20');
  await thickness.fill('25'); await thickness.press('Tab');
  await expect(thickness).toHaveValue('25');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(thickness).toHaveValue('20');

  // Export 3D as PNG opens the view to capture it; with nothing to capture it reports the failure.
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: 'Export 3D as PNG', exact: true }).click();
  await expect(viewer.getByRole('alert')).toHaveText(message);
  await expect(page.getByRole('alert').filter({ hasText: "Couldn't export 3D PNG" })).toBeVisible({ timeout: 30_000 });
  await expect(viewer).toHaveCount(0);
  expect(downloads).toBe(0);
  expect(errors).toEqual([]);
});

test('Portuguese 3D view explains missing WebGL', async ({ page }) => {
  await withoutWebGL(page, 'pt');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const viewer = page.getByRole('region', { name: 'Visualizador 3D da planta', exact: true });
  await expect(viewer.getByRole('alert')).toHaveText('A vista 3D precisa do WebGL, que este navegador não conseguiu iniciar. Ative a aceleração de hardware ou use outro navegador. A planta 2D continua funcionando.', { timeout: 60_000 });
  await expect(viewer.getByRole('button')).toHaveCount(0);
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect(page.getByLabel('Área de edição da planta baixa', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the one-time 3D tip waits for a working 3D view instead of being used up without WebGL', async ({ page }) => {
  test.setTimeout(90_000); // Three viewer visits, the first also downloading the lazy bundle.
  // WebGL stays blocked until the test allows it, as when hardware acceleration is turned back on.
  await page.addInitScript(() => {
    localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-export', 'first-door']));
    (window as any).__blockWebGL = true;
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: any[]) {
      return (window as any).__blockWebGL && /^(webgl2?|experimental-webgl)$/.test(type) ? null : (getContext as any).call(this, type, ...args);
    } as typeof getContext;
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  const viewer = page.getByRole('region', { name: '3D floor plan viewer', exact: true });
  const main = viewer.locator('canvas[data-plan3d-canvas="true"]');
  const tip = page.getByRole('region', { name: 'Getting started tip', exact: true });
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(viewer.getByRole('alert')).toBeVisible({ timeout: 60_000 });
  // No tip about orbiting and walkthrough, which this view does not offer. Checked once rather
  // than polled, because an open tip closes by itself after eight seconds.
  expect(await tip.count()).toBe(0);
  await page.getByRole('button', { name: '2D', exact: true }).click();

  await page.evaluate(() => { (window as any).__blockWebGL = false; });
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(main).toBeVisible({ timeout: 60_000 });
  // The first working 3D view still gets the tip, in its usual place.
  await expect(tip).toContainText('Orbit with mouse, scroll to zoom. Try walkthrough mode!');
  const box = (await tip.boundingBox())!;
  expect([Math.round(box.x), Math.round(box.y)]).toEqual([200, 80]);
  await tip.getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(tip).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('o3d_tips_seen')!))).toContain('first-3d');

  // Shown once: the next 3D view starts without it.
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(main).toBeVisible({ timeout: 30_000 });
  expect(await tip.count()).toBe(0);
  expect(errors).toEqual([]);
});
