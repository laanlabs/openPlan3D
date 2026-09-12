import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const fixture = resolve('tests/fixtures/handoff-roomplan.json');

test('self-hosted sharing fails closed without cloud configuration', async ({ request }) => {
  const response = await request.post('/api/handoffs', { data: { walls: [] } });
  expect(response.status()).toBe(503);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.json()).toEqual({ error: 'Link sharing is unavailable. Use Export Editable Plan (JSON) instead.' });
});

async function importJSON(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  await page.getByRole('button', { name: 'Export', exact: true }).press('Enter');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).press('Enter');
  await (await chooser).setFiles(file);
}

async function exportJSON(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  const path = await (await download).path();
  expect(path).toBeTruthy();
  return JSON.parse(await readFile(path!, 'utf8'));
}

test('import, numeric edit, undo/redo, save/reload and export preserve a multi-floor project', async ({ page }) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4188') externalRequests.push(request.url());
  });
  await page.goto('/editor');
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await importJSON(page, fixture);
  const floor = page.getByRole('combobox', { name: 'Current floor' });
  await expect(floor.locator('option')).toHaveText(['Entry', 'Loft', 'Future Floor']);
  await expect(page.getByRole('application')).toContainText('4 walls');
  await expect(page.getByRole('application')).toContainText('4 doors');
  await expect(page.getByRole('application')).toContainText('2 windows');

  await page.getByTitle('Click to rename', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('Browser regression home');
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
  await page.getByRole('button', { name: 'Toggle Layers Panel', exact: true }).click();
  await page.getByRole('button', { name: /Wall 1$/ }).click();
  const thickness = page.getByRole('spinbutton', { name: 'Thickness (cm)', exact: true });
  await expect(thickness).toHaveValue('27.5');
  await thickness.fill('32.5');
  await thickness.press('Tab');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(thickness).toHaveValue('27.5');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(thickness).toHaveValue('32.5');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();

  const beforeReload = await exportJSON(page);
  expect(beforeReload.name).toBe('Browser regression home');
  expect(beforeReload.floors[0].walls[0].thickness).toBe(32.5);
  expect(beforeReload.floors[0].walls[0].height).toBe(273.5);
  await floor.selectOption({ label: 'Future Floor' });
  await expect(page.getByRole('application')).toContainText('0 walls');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
  const saved = await exportJSON(page);
  await page.reload();
  await expect(floor.locator('option:checked')).toHaveText('Future Floor');
  await expect(page.getByRole('application')).toContainText('0 walls');
  expect(await exportJSON(page)).toEqual(saved);

  // A corrupt import must leave the saved project, selected floor and all bytes intact.
  const damaged = JSON.parse(await readFile(fixture, 'utf8'));
  damaged.doors[0].dimensions[0] = 'damaged';
  await importJSON(page, { name: 'damaged.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(damaged)) });
  await expect(page.getByRole('alert')).toContainText('No project was imported');
  expect(await exportJSON(page)).toEqual(saved);
  await page.getByRole('button', { name: 'Dismiss import error', exact: true }).click();

  // Retry via the other import entry point; prepared iPhone geometry must not be straightened.
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import RoomPlan iOS LiDAR scan/ }).click();
  await (await chooser).setFiles(fixture);
  await expect(page.getByRole('checkbox', { name: /Straighten/ })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: /orthogonal/i })).not.toBeChecked();
  await expect(page.getByRole('spinbutton', { name: /Merge distance/i })).toHaveValue('0');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(floor.locator('option:checked')).toHaveText('Entry');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test('catalog and 3D use bounded, cacheable assets with zero startup model downloads', async ({ page, context }, testInfo) => {
  // Cold catalog/3D loading and offline reload verification share one workflow.
  test.slow();
  const errors: string[] = [];
  const assets: { url: string; cacheControl: string | undefined; bytes: number }[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const pending: Promise<void>[] = [];
  page.on('response', response => {
    if (/\.(glb|webp)(?:\?|$)/.test(response.url())) pending.push((async () => {
      const headers = await response.allHeaders();
      expect(response.ok(), response.url()).toBe(true);
      assets.push({ url: response.url(), cacheControl: headers['cache-control'], bytes: (await response.body()).byteLength });
    })().catch(error => { errors.push(String(error)); }));
  });
  await page.goto('/editor');
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  // Let deferred startup work settle: old eager thumbnail generation would fetch 94 GLBs here.
  await page.waitForLoadState('networkidle');
  expect(assets.filter(x => x.url.endsWith('.glb'))).toHaveLength(0);
  const startup = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => {
    const resource = entry as PerformanceResourceTiming;
    return { url: resource.name, transferBytes: resource.transferSize, encodedBytes: resource.encodedBodySize };
  }));
  await importJSON(page, fixture);
  await expect(page.getByRole('combobox', { name: 'Current floor' }).locator('option')).toHaveCount(3);
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await expect.poll(() => assets.filter(x => x.url.endsWith('.glb')).length).toBeGreaterThan(0);
  await page.waitForLoadState('networkidle');
  await Promise.all(pending);
  const catalogModels = assets.filter(x => x.url.endsWith('.glb'));
  expect(new Set(catalogModels.map(x => x.url)).size).toBeLessThan(25);
  expect(catalogModels.reduce((sum, x) => sum + x.bytes, 0)).toBeLessThan(400_000);
  await page.getByPlaceholder('Search furniture...').fill('Dining Chair');
  await expect(page.getByRole('button', { name: /Dining Chair/ }).first()).toBeVisible();

  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible();
  await page.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Active Floor Only', exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await Promise.all(pending);
  await testInfo.attach('stacked-3d', { body: await page.screenshot(), contentType: 'image/png' });
  const oak = assets.find(x => /floor-light-oak\.[\w-]+\.webp$/.test(x.url));
  expect(oak).toBeTruthy();
  expect(oak!.bytes).toBeLessThan(120_000);
  for (const asset of assets) expect(asset.cacheControl).toContain('immutable');
  // Decode through the same browser image cache used by Three's ImageLoader.
  // Comparing pixels also proves the warm asset is complete and usable.
  const decodedOak = () => page.evaluate(async url => {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    const bytes = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return { width: canvas.width, height: canvas.height, hash: Array.from(new Uint8Array(hash)) };
  }, oak!.url);
  const coldPixels = await decodedOak();
  expect(coldPixels.width).toBeGreaterThan(0);
  expect(coldPixels.height).toBeGreaterThan(0);

  const cold = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => {
    const resource = entry as PerformanceResourceTiming;
    return { url: resource.name, transferBytes: resource.transferSize, encodedBytes: resource.encodedBodySize };
  }));
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  // Prove the previously loaded 3D assets remain usable without network access.
  // WebKit can report zero cached encodedBodySize, and Firefox can reuse an
  // image without a new timing entry. Decode/hash offline instead of relying
  // on those engine-specific timing fields as the cache proof.
  await context.setOffline(true);
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await Promise.all(pending);
  const warmPixels = await decodedOak();
  expect(warmPixels).toEqual(coldPixels);
  const warm = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => {
    const resource = entry as PerformanceResourceTiming;
    return { url: resource.name, transferBytes: resource.transferSize, encodedBytes: resource.encodedBodySize };
  }));
  for (const entry of warm.filter(x => /\.(glb|webp)(?:\?|$)/.test(x.url))) expect(entry.transferBytes).toBe(0);
  await testInfo.attach('asset-transfers', { body: JSON.stringify({ startup, catalogModels, cold, warm, coldPixels, warmPixels }, null, 2), contentType: 'application/json' });
  await context.setOffline(false);
  await page.getByRole('button', { name: '2D', exact: true }).click();
  expect(errors).toEqual([]);
});

test('sloped walls preserve heights and openings through edits, reversal, elevation and reload', async ({ page }, testInfo) => {
  test.slow();
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4188') externalRequests.push(request.url());
  });
  await page.goto('/editor');
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await importJSON(page, resolve('tests/fixtures/sloped-walls.openplan.json'));
  await expect(page.getByRole('application')).toContainText('4 walls');
  await page.getByRole('button', { name: 'Toggle Layers Panel', exact: true }).click();
  await page.getByRole('button', { name: /Wall 1$/ }).click();
  const start = page.getByRole('spinbutton', { name: 'Start Height (cm)', exact: true });
  const end = page.getByRole('spinbutton', { name: 'End Height (cm)', exact: true });
  await expect(start).toHaveValue('160');
  await expect(end).toHaveValue('340');
  await expect(page.getByRole('status')).toContainText('Some openings do not fit');
  await start.fill('180'); await start.press('Tab');
  await end.fill('320'); await end.press('Tab');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(start).toHaveValue('180');
  await expect(end).toHaveValue('340');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(end).toHaveValue('320');
  for (const invalid of ['-1', '']) {
    await start.fill(invalid); await start.press('Tab');
    await expect(start).toHaveValue('180');
  }
  const before = await exportJSON(page);
  const originalWall = before.floors[0].walls[0];
  expect(originalWall).toMatchObject({ startHeight: 180, endHeight: 320, height: 320 });
  await page.getByRole('button', { name: /Reverse direction/ }).click();
  await expect(start).toHaveValue('320'); await expect(end).toHaveValue('180');
  const reversed = await exportJSON(page);
  expect(reversed.floors[0].walls[0]).toMatchObject({ start: originalWall.end, end: originalWall.start, startHeight: 320, endHeight: 180, height: 320 });
  expect(reversed.floors[0].doors[0]).toMatchObject({ position: 0.4, swingDirection: 'right', flipSide: true, width: 100, height: 210 });
  expect(reversed.floors[0].windows[0]).toMatchObject({ position: 0.8, width: 100, height: 150, sillHeight: 90 });
  await page.getByTitle('View this wall face-on and edit its doors and windows', { exact: true }).click();
  await expect(page.getByText('6 m × 3.2 m → 1.8 m', { exact: true })).toBeVisible();
  await testInfo.attach('sloped-elevation', { body: await page.screenshot(), contentType: 'image/png' });
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
  await page.reload();
  expect((await exportJSON(page)).floors).toEqual(reversed.floors);
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
  await page.waitForLoadState('networkidle');
  await testInfo.attach('sloped-stacked-3d', { body: await page.screenshot(), contentType: 'image/png' });
  await page.getByRole('combobox', { name: 'Current floor' }).selectOption({ label: 'Curved Upper' });
  await page.getByRole('button', { name: 'Active Floor Only', exact: true }).click();
  await page.getByRole('button', { name: '2D', exact: true }).click();
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

for (const width of [1440, 390]) {
  test(`floor elevations survive edits and reload at ${width}px with stacked views`, async ({ page }, testInfo) => {
    test.slow();
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    const externalRequests: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4188') externalRequests.push(request.url());
    });
    const settings = async () => {
      if (width < 768) await page.getByRole('button', { name: 'More actions', exact: true }).click();
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
    };
    const selectFloor = async (name: string) => {
      if (width < 768) {
        await page.getByRole('button', { name: 'More actions', exact: true }).click();
        await page.getByRole('button', { name, exact: true }).click();
      } else await page.getByRole('combobox', { name: 'Current floor' }).selectOption({ label: name });
    };
    await page.goto('/editor');
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    await importJSON(page, resolve('tests/fixtures/sloped-walls.openplan.json'));
    const original = await exportJSON(page);
    await settings();
    const upper = page.getByRole('spinbutton', { name: 'Curved Upper elevation (cm)', exact: true });
    const ground = page.getByRole('spinbutton', { name: 'Sloped Ground elevation (cm)', exact: true });
    await expect(upper).toHaveValue('300');
    await expect(ground).toHaveValue('0');
    await ground.fill('-50.5'); await ground.press('Tab');
    await upper.fill('425.5'); await upper.press('Tab');
    await upper.fill(''); await upper.press('Tab');
    await expect(upper).toHaveValue('425.5');
    await testInfo.attach(`floor-settings-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await settings();
    await expect(upper).toHaveValue('300');
    await expect(ground).toHaveValue('-50.5');
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await settings();
    await expect(upper).toHaveValue('425.5');
    await page.getByRole('button', { name: 'Use default elevation for Curved Upper', exact: true }).click();
    await expect(upper).toHaveValue('300');
    await upper.fill('425.5'); await upper.press('Tab');
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    // The completed-save text remains in the DOM but is hidden on narrow screens.
    await expect(page.getByText('Saved ✓', { exact: true })).toHaveCount(1);
    const saved = await exportJSON(page);
    expect(saved.floors.map((floor: { elevation: number }) => floor.elevation)).toEqual([-50.5, 425.5]);
    expect(saved.floors.map(({ elevation: _, ...floor }: { elevation: number }) => floor)).toEqual(original.floors);
    await page.reload();
    expect((await exportJSON(page)).floors).toEqual(saved.floors);
    // JSON import must preserve the setting as well as local storage does.
    await importJSON(page, { name: 'elevations.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
    await expect(page.getByRole('button', { name: `${saved.name} (Imported copy)`, exact: true })).toBeVisible();
    await selectFloor('Curved Upper');
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
    await expect(page.getByText('Curved Upper · 425.5 cm elevation', { exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await testInfo.attach(`adjusted-stack-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    if (width >= 768) {
      await page.getByRole('button', { name: 'Enter Walkthrough Mode', exact: true }).click();
      await expect(page.getByText('Walkthrough Controls', { exact: true })).toBeVisible();
      await testInfo.attach('upper-floor-walkthrough', { body: await page.screenshot(), contentType: 'image/png' });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Enter Walkthrough Mode', exact: true })).toBeVisible();
      // Browser mouse capture can be denied independently of the editor. A
      // rejected browser API must leave keyboard walkthrough usable, without
      // an unhandled rejection. This does not alter project or scene state.
      await page.evaluate(() => {
        HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new DOMException('Mouse capture denied', 'NotAllowedError'));
      });
      await page.getByRole('button', { name: 'Enter Walkthrough Mode', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('Mouse look is unavailable');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Enter Walkthrough Mode', exact: true })).toBeVisible();
    }
    await selectFloor('Sloped Ground');
    await expect(page.getByText('Sloped Ground · -50.5 cm elevation', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Active Floor Only', exact: true }).click();
    await expect(page.getByText('Sloped Ground · -50.5 cm elevation', { exact: true })).not.toBeVisible();
    await page.getByRole('button', { name: '2D', exact: true }).click();
    expect(errors).toEqual([]);
    expect(externalRequests).toEqual([]);
  });
}
