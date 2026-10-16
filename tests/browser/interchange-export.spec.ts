import { expect, test, type Page } from '@playwright/test';
import { inflateRawSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// A kitchen written by OpenKitchen3D for iOS; see tests/fixtures/siblings/README.md.
const fixturePath = resolve('tests/fixtures/siblings/ios-sample-kitchen.openplan3d.json');
const categoryKey = (category: any) => typeof category === 'string' ? category : Object.keys(category ?? {})[0];

async function importFixture(page: Page) {
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(fixturePath);
  // A sibling plan keeps its own title (the block's name), not the file name.
  await expect(page.getByRole('button', { name: 'Sample Kitchen', exact: true })).toBeVisible();
  return JSON.parse(await readFile(fixturePath, 'utf8'));
}

test('the interchange download keeps the OpenKitchen3D block and every object identity', async ({ page }) => {
  const fixture = await importFixture(page);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download interchange JSON', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/-openplan3d\.json$/);
  const file = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(file.openplanPrepared).toBe(true);
  expect(file.openkitchen3d).toEqual(fixture.openkitchen3d);
  expect(file.objects.map((object: any) => object.identifier)).toEqual(fixture.objects.map((object: any) => object.identifier));
  for (const object of fixture.objects) {
    const exported = file.objects.find((candidate: any) => candidate.identifier === object.identifier);
    expect(categoryKey(exported.category), object.identifier).toBe(categoryKey(object.category));
  }
  expect(file.walls.map((wall: any) => wall.identifier)).toEqual(fixture.walls.map((wall: any) => wall.identifier));
});

test('Open in OpenCatio3D opens a transfer link in a new tab with the whole plan in the fragment', async ({ page, context }) => {
  // The sibling site is never reached: every request off the local server is answered here.
  await context.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4188')
    ? route.continue()
    : route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }));
  const fixture = await importFixture(page);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Open in OpenCatio3D', exact: true }).click();
  const tab = await popup;
  await tab.waitForURL(/^https:\/\/app\.opencatio3d\.com\//);
  const prefix = 'https://app.opencatio3d.com/#/import/v1/', url = tab.url();
  expect(url.startsWith(prefix)).toBe(true);
  const payload = url.slice(prefix.length);
  expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
  const plan = JSON.parse(inflateRawSync(Buffer.from(payload, 'base64url')).toString('utf8'));
  expect(plan.openplanPrepared).toBe(true);
  expect(plan.openkitchen3d).toEqual(fixture.openkitchen3d);
  expect(plan.objects.map((object: any) => object.identifier)).toEqual(fixture.objects.map((object: any) => object.identifier));
  expect(await tab.evaluate(() => window.opener)).toBeNull();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
