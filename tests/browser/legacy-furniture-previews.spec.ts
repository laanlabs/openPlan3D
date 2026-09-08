import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { packageJSON, readPackageZip } from '../../src/lib/utils/projectPackageZip';
import { readSnapshotStorage, type StoredSnapshot } from '../../src/lib/utils/snapshotStorage';
import { failProjectWrites, savedProjects, storedRecords } from './storage';

const id = 'qa-legacy-furniture-previews';
async function seed(page: Page) {
  const raw = JSON.stringify(JSON.parse(await readFile('tests/fixtures/legacy-furniture-previews.openplan.json', 'utf8')));
  const history = JSON.stringify([{ timestamp: 1, description: 'Before preview refresh', data: raw }]);
  await page.addInitScript(({ id, raw, history }) => {
    if (!localStorage.getItem('qaLegacyPreviewSeeded')) {
      localStorage.setItem('floorplan_projects', JSON.stringify({ [id]: raw }));
      localStorage.setItem(`vh_${id}`, history);
      localStorage.setItem('hasSeenWelcome', 'true');
      localStorage.setItem('qaLegacyPreviewSeeded', 'true');
    }
  }, { id, raw, history });
  await page.goto(`/editor?id=${id}`);
  await page.getByRole('button', { name: 'Save', exact: true }).press('l');
  await expect(page.getByRole('button', { name: '🛏️ Queen Bed', exact: true })).toBeVisible();
  // The existing editor appends a Session start snapshot. Its pooling may change
  // the history wrapper, but the archived original project bytes must survive.
  await expect.poll(async () => readSnapshotStorage((await storedRecords(page, 'history'))[id]).length).toBe(2);
  const openedHistory = (await storedRecords(page, 'history'))[id];
  expect((readSnapshotStorage(openedHistory)[0] as StoredSnapshot).data).toBe(raw);
  expect(await page.evaluate(id => localStorage.getItem(`vh_${id}`), id)).toBe(history);
  return { raw, history: openedHistory };
}
function observe(page: Page) {
  const errors: string[] = [], external: string[] = [], models: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4188') external.push(request.url());
    if (/\.glb$/.test(request.url())) models.push(request.url());
  });
  return { models, check: () => { expect(errors).toEqual([]); expect(external).toEqual([]); } };
}
async function download(page: Page, button: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: button, exact: true }).click();
  return readFile((await (await pending).path())!);
}

for (const width of [1440, 390]) test(`saved legacy furniture refreshes without rewriting recovery data at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  const { models, check } = observe(page), { raw, history } = await seed(page);
  for (const name of ['🪥 Sink', '🪜 Imported stairs', '📦 Unrecognized item']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: '📦 Unrecognized item', exact: true }).click();
  await expect(page.getByText('Original category: future-appliance. Shown as a neutral box.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '🛏️ Queen Bed', exact: true }).click();
  const field = page.getByRole('spinbutton', { name: 'Width (cm)', exact: true });
  await expect(field).toHaveValue('121.875');
  await expect(page.getByRole('textbox', { name: 'Item notes', exact: true })).toHaveValue('Edited locally before preview refresh');
  await expect(page.getByRole('region', { name: 'Item details', exact: true })).toContainText('Item photos (1)');
  // Opening, selecting and exporting must not trigger the one-second autosave.
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const exported = JSON.parse((await download(page, 'Download JSON')).toString());
  expect(exported.projectPackage.furnitureCategoriesVersion).toBe(1);
  expect(exported.floors[0].furniture.map((item: any) => item.catalogId)).toEqual(['sofa', 'stairs', 'bed_queen', 'desk', 'sink_b', 'washer_dryer', 'washer_dryer', 'imported_object']);
  expect(exported.projectPackage.native).toEqual(JSON.parse(raw).projectPackage.native);
  expect((await storedRecords(page))[id]).toBe(raw);
  expect((await storedRecords(page, 'history'))[id]).toBe(history);
  expect(models).toEqual([]);
  await field.fill('119.125'); await field.press('Tab');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(async () => (await savedProjects(page))[id].floors[0].furniture[2].width).toBe(119.125);
  await page.reload();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const files = readPackageZip(new Uint8Array(await download(page, 'Download project package')));
  const plan = packageJSON(files['plan.json']);
  expect(plan.furniture.map((item: any) => item.category)).toEqual(['sofa', 'stairs', 'bed', 'desk', 'sink', 'washerDryer', 'washerdryer', 'future-appliance']);
  expect(plan.furniture[2]).toMatchObject({ width: 1.4890625, depth: 0.93515625, note: 'Edited locally before preview refresh', price: 123.456, photos: ['legacy-photo.png'], future: { retain: 2 } });
  expect(files['assets/legacy-photo.png']).toEqual(new Uint8Array(await readFile('tests/fixtures/item-photo.png')));
  const saved = (await savedProjects(page))[id];
  expect(saved.projectPackage.furnitureCategoriesVersion).toBe(1);
  expect(saved.floors[0].furniture[2]).toMatchObject({ catalogId: 'bed_queen', rotation: 32.75, scale: { x: -1.25, y: 1.125, z: 1 }, futureWeb: { keep: ['fractional', 'mirrored'] } });
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  for (const file of ['loungeDesignSofa', 'bedDouble', 'tableCross', 'bathroomSink', 'washerDryerStacked']) expect(models.filter(url => url.includes(`/${file}.`))).toHaveLength(1);
  expect(models).toHaveLength(5);
  await testInfo.attach(`legacy-previews-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
  check();
});

test('quota recovery keeps old saved bytes and exports a refreshed draft', async ({ page }) => {
  const { check } = observe(page), { raw, history } = await seed(page);
  await page.getByRole('button', { name: '🛏️ Queen Bed', exact: true }).click();
  await failProjectWrites(page);
  const notes = page.getByRole('textbox', { name: 'Item notes', exact: true });
  await notes.fill('Keep this refreshed draft'); await notes.press('Tab');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Browser storage is full');
  expect((await storedRecords(page))[id]).toBe(raw);
  expect((await storedRecords(page, 'history'))[id]).toBe(history);
  const draft = JSON.parse((await download(page, 'Download JSON backup')).toString());
  expect(draft.floors[0].furniture[2]).toMatchObject({ catalogId: 'bed_queen', details: { note: 'Keep this refreshed draft', photos: ['legacy-photo.png'] } });
  expect(draft.projectPackage.assets).toEqual(JSON.parse(raw).projectPackage.assets);
  await page.evaluate(() => { (window as any).failProjectWrites = false; });
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect.poll(async () => (await savedProjects(page))[id].floors[0].furniture[2].details.note).toBe('Keep this refreshed draft');
  await page.reload();
  await page.getByRole('button', { name: 'Save', exact: true }).press('l');
  await expect(page.getByRole('button', { name: '🛏️ Queen Bed', exact: true })).toBeVisible();
  check();
});
