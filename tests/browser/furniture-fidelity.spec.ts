import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { savedProjects } from './storage';

const fixture = resolve('tests/fixtures/furniture-fidelity.openplan.json');
const chairURL = /\/loungeChair\.[\w-]+\.glb$/;
function observe(page: Page) {
  const errors: string[] = [], external: string[] = [], models: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4188') external.push(request.url());
    if (/\.glb$/.test(request.url())) models.push(request.url());
  });
  return { models, check() { expect(errors).toEqual([]); expect(external).toEqual([]); expect(models.some(url => /toaster/.test(url))).toBe(false); } };
}
async function openFixture(page: Page) {
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await pending).setFiles(fixture);
  await expect(page.getByRole('button', { name: 'QA Furniture Fidelity', exact: true })).toBeVisible();
}
async function colors(page: Page) {
  // Inspect actual rendered pixels, without relying on private Three.js scene state.
  return page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first().evaluate((source: HTMLCanvasElement) => {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext('2d')!; context.drawImage(source, 0, 0, 256, 256);
    const pixels = context.getImageData(0, 0, 256, 256).data;
    const result = { red: 0, green: 0, blue: 0 };
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
      if (r > 50 && r > g * 1.5 && r > b * 1.5) result.red++;
      if (g > 50 && g > r * 1.5 && g > b * 1.5) result.green++;
      // The selected navy (#191970) remains dark under scene lighting. Require
      // a clear blue hue above the shadow floor, rather than bright blue pixels.
      if (b > 20 && b > r * 1.5 && b > g * 1.5) result.blue++;
    }
    return result;
  });
}
async function open3D(page: Page) {
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle');
}

for (const width of [1440, 390]) test(`furniture tint, finish and resource reuse survive 3D rebuilds at ${width}px`, async ({ page }, testInfo) => {
  test.slow();
  const observed = observe(page); await page.setViewportSize({ width, height: 900 });
  await openFixture(page); await open3D(page);
  await expect.poll(async () => (await colors(page)).green).toBeGreaterThan(50);
  expect((await colors(page)).red).toBeGreaterThan(50);
  expect((await colors(page)).blue).toBeLessThan(25);
  expect(observed.models.filter(url => chairURL.test(url))).toHaveLength(1);
  await page.getByRole('button', { name: 'Make Walls Transparent', exact: true }).click();
  await expect.poll(async () => (await colors(page)).green).toBeGreaterThan(50);
  await page.getByRole('button', { name: 'Show Solid Walls', exact: true }).click();
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).press('l');
  await page.getByRole('button', { name: '💺 Armchair', exact: true }).first().click();
  await expect(page.getByRole('combobox', { name: 'Material', exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Color: #191970', exact: true }).click();
  await page.getByRole('combobox', { name: 'Material', exact: true }).selectOption('Fabric');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(async () => Object.values(await savedProjects(page)).some(project => project.floors[0].furniture.some((item: any) => item.id === 'chair-red' && item.color === '#191970' && item.material === 'Fabric'))).toBe(true);
  await open3D(page);
  await expect.poll(async () => (await colors(page)).blue, { timeout: 60_000 }).toBeGreaterThan(50);
  expect((await colors(page)).green).toBeGreaterThan(50);
  expect(observed.models.filter(url => chairURL.test(url))).toHaveLength(1);
  await testInfo.attach(`furniture-${width}`, { body: await page.screenshot(), contentType: 'image/png' });

  if (width === 1440) {
    await page.getByRole('button', { name: '2D', exact: true }).click();
    await page.getByRole('button', { name: 'Objects', exact: true }).click();
    await page.getByPlaceholder('Search furniture...').fill('Armchair');
    await expect(page.getByRole('img', { name: 'Armchair', exact: true })).toBeVisible();
    expect(observed.models.filter(url => chairURL.test(url))).toHaveLength(1);
  }
  await page.reload();
  await page.getByRole('button', { name: 'Save', exact: true }).press('l');
  await page.getByRole('button', { name: '💺 Armchair', exact: true }).first().click();
  await expect(page.getByRole('combobox', { name: 'Material', exact: true })).toHaveValue('Fabric');
  await open3D(page);
  await expect.poll(async () => (await colors(page)).blue, { timeout: 60_000 }).toBeGreaterThan(50);
  expect((await colors(page)).green).toBeGreaterThan(50);
  observed.check();
});

test('a model completing after 3D closes stays reusable without another download', async ({ page }) => {
  const observed = observe(page);
  let release!: () => void, arrived!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; }), requested = new Promise<void>(resolve => { arrived = resolve; });
  await page.route(chairURL, async route => { arrived(); await hold; await route.continue(); });
  await openFixture(page);
  await page.getByRole('button', { name: '3D', exact: true }).click(); await requested;
  await page.getByRole('button', { name: '2D', exact: true }).click(); release();
  await page.waitForLoadState('networkidle'); await open3D(page);
  await expect.poll(async () => (await colors(page)).green).toBeGreaterThan(50);
  expect(observed.models.filter(url => chairURL.test(url))).toHaveLength(1);
  observed.check();
});
