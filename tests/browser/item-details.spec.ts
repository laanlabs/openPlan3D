import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { packageJSON, readPackageZip } from '../../src/lib/utils/projectPackageZip';
import { photoHeader, PHOTO_STORED_LIMIT } from '../../src/lib/services/itemPhotos';
import { readSnapshotStorage } from '../../src/lib/utils/snapshotStorage';
import { savedProjects, storedRecords, failProjectWrites } from './storage';

const fixture = resolve('tests/fixtures/native-project-package.zip');
function observe(page: Page) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4188') external.push(request.url()); });
  return () => { expect(errors).toEqual([]); expect(external).toEqual([]); };
}
async function choose(page: Page, button: string, path: string) {
  const pending = page.waitForEvent('filechooser'); await page.getByRole('button', { name: button, exact: true }).click();
  await (await pending).setFiles(path);
}
async function openPackage(page: Page, path = fixture) {
  await page.goto('/'); await page.getByRole('button', { name: 'Import a project package', exact: true }).click();
  await choose(page, 'Choose project package', path);
  await page.getByRole('button', { name: 'Import as copy', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Project imported.');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const project = Object.values(await savedProjects(page))[0];
  await page.getByRole('link', { name: project.name, exact: true }).click();
  return project;
}
async function selectFurniture(page: Page) {
  await page.getByRole('button', { name: 'Save', exact: true }).press('l');
  await page.getByRole('button', { name: '💺 Armchair', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Item details', exact: true })).toBeVisible();
}
async function fill(page: Page, name: string, value: string, numeric = false) {
  const input = page.getByRole(numeric ? 'spinbutton' : 'textbox', { name, exact: true });
  await input.fill(value); await input.press('Tab');
}
async function download(page: Page, button: string) {
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: button, exact: true }).click();
  return readFile((await (await pending).path())!);
}
async function packageFiles(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  return readPackageZip(new Uint8Array(await download(page, 'Download project package')));
}
async function addPhoto(page: Page, path = resolve('tests/fixtures/large-item-photo.png')) {
  await choose(page, 'Add photo', path);
  await expect(page.getByRole('button', { name: 'Add photo', exact: true })).toBeEnabled();
}

for (const width of [1440, 390]) test(`field keyboard editing cannot select or paste plan objects at ${width}px`, async ({ page }) => {
  const check = observe(page); await page.setViewportSize({ width, height: 900 });
  const original = await openPackage(page); await selectFurniture(page);
  const itemWidth = page.getByRole('spinbutton', { name: 'Width (cm)', exact: true });
  // Use actual key events: fill() bypasses the canvas listener that used to
  // swallow select-all and leave the old number in front of the typed value.
  await itemWidth.press('ControlOrMeta+a');
  await itemWidth.press('Backspace');
  await itemWidth.pressSequentially('78.125');
  await itemWidth.press('Tab');
  await expect(itemWidth).toHaveValue('78.125');
  for (const dimension of ['Width (cm)', 'Depth (cm)', 'Height (cm)']) {
    const input = page.getByRole('spinbutton', { name: dimension, exact: true });
    const value = await input.inputValue();
    for (const draft of ['', '0', '-1']) {
      await input.fill(draft); await input.press('Tab');
      await expect(input).toHaveValue(value);
    }
  }
  // Seed the canvas clipboard with furniture before using the text clipboard.
  await page.getByRole('button', { name: 'Save', exact: true }).press('ControlOrMeta+c');
  const notes = page.getByRole('textbox', { name: 'Item notes', exact: true });
  await notes.press('ControlOrMeta+a');
  await notes.pressSequentially('Soft green fabric chair');
  await expect(notes).toHaveValue('Soft green fabric chair');
  await notes.press('ControlOrMeta+a'); await notes.press('ControlOrMeta+c');
  await notes.press('ArrowRight'); await notes.press('Enter'); await notes.press('ControlOrMeta+v');
  await expect(notes).toHaveValue('Soft green fabric chair\nSoft green fabric chair');
  await notes.press('ControlOrMeta+z');
  await expect(notes).toHaveValue('Soft green fabric chair\n');
  await expect(itemWidth).toHaveValue('78.125');
  await notes.press('ControlOrMeta+a'); await notes.press('Backspace');
  await notes.pressSequentially('Soft green fabric chair');
  await notes.press('Tab');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  // A click does not await the async IndexedDB transaction. Verify the saved
  // note before navigating away, then independently check the reloaded editor.
  await expect.poll(async () => (await savedProjects(page))[original.id]?.floors[0].furniture[0].details.note)
    .toBe('Soft green fabric chair');
  await page.reload(); await selectFurniture(page);
  await expect(notes).toHaveValue('Soft green fabric chair');
  await expect(itemWidth).toHaveValue('78.125');
  const saved = (await savedProjects(page))[original.id];
  const expected = structuredClone(original);
  expected.floors[0].furniture[0].width = 78.125;
  expected.floors[0].furniture[0].details.note = 'Soft green fabric chair';
  expect(saved.floors).toEqual(expected.floors);
  expect(saved.settings).toEqual(original.settings);
  check();
});

for (const width of [1440, 390]) test(`item metadata and optimized photos survive undo, save and exports at ${width}px`, async ({ page }, testInfo) => {
  const check = observe(page); await page.setViewportSize({ width, height: 900 });
  const original = await openPackage(page); await selectFurniture(page);
  const panel = page.getByRole('region', { name: 'Item details', exact: true });
  await expect(page.getByRole('textbox', { name: 'Item notes', exact: true })).toHaveValue('Keep furniture note');
  await expect(page.getByRole('spinbutton', { name: 'Item cost', exact: true })).toHaveValue('456.75');
  const notes = page.getByRole('textbox', { name: 'Item notes', exact: true });
  await notes.fill(''); await notes.press('l'); await notes.press('?'); await notes.press('/');
  await expect(notes).toHaveValue('l?/');
  await expect(page.getByRole('button', { name: '💺 Armchair', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await fill(page, 'Item cost', '-1', true);
  await expect(page.getByRole('spinbutton', { name: 'Item cost', exact: true })).toHaveValue('456.75');
  await fill(page, 'Item notes', 'Chosen on the web'); await fill(page, 'Item cost', '123.456', true);
  await addPhoto(page); await expect(panel).toContainText('Item photos (2)');
  await addPhoto(page); await expect(panel).toContainText('Item photos (2)');
  await expect(panel).toContainText('large-item-photo.jpg');
  await page.getByRole('button', { name: `Select room ${original.floors[0].rooms[0].name}`, exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Room use', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '💺 Armchair', exact: true }).click();
  await expect(notes).toHaveValue('Chosen on the web');
  await expect(page.getByRole('spinbutton', { name: 'Item cost', exact: true })).toHaveValue('123.456');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(async () => (await savedProjects(page))[original.id].floors[0].furniture[0].details.price).toBe(123.456);
  await page.reload(); await selectFurniture(page);
  await expect(page.getByRole('textbox', { name: 'Item notes', exact: true })).toHaveValue('Chosen on the web');
  await expect(panel).toContainText('Item photos (2)');
  await testInfo.attach(`item-details-${width}`, { body: await panel.screenshot(), contentType: 'image/png' });
  const files = await packageFiles(page), plan = packageJSON(files['plan.json']);
  expect(plan.furniture[0]).toMatchObject({ note: 'Chosen on the web', price: 123.456 });
  expect(plan.walls[0].extension.future).toBe(true);
  const photoName = plan.furniture[0].photos.find((name: string) => name !== 'chair.png');
  const added = files[`assets/${photoName}`];
  expect(photoHeader(added)).toMatchObject({ width: 1600, height: 800, mime: 'image/jpeg' });
  expect(added.length).toBeLessThanOrEqual(PHOTO_STORED_LIMIT);
  expect(Object.keys(files).filter(name => name.startsWith('assets/'))).toHaveLength(3);

  await page.getByRole('button', { name: 'Remove photo 2 from item', exact: true }).click();
  await expect(panel).toContainText('Item photos (1)');
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await expect(panel).toContainText('Item photos (2)');
  await page.getByRole('button', { name: 'Redo', exact: true }).click(); await expect(panel).toContainText('Item photos (1)');
  await panel.locator('summary').click();
  await page.getByRole('button', { name: `Delete retained file ${photoName}`, exact: true }).click();
  await page.getByRole('button', { name: 'Delete file from project', exact: true }).click();
  expect((await packageFiles(page))[`assets/${photoName}`]).toBeUndefined();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(async () => Object.keys((await savedProjects(page))[original.id].projectPackage.assets)).toHaveLength(2);
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible();
  await page.getByRole('link', { name: width < 640 ? 'Back to Projects' : 'Projects', exact: true }).click();
  const backup = JSON.parse((await download(page, 'Download library backup')).toString());
  const saved = JSON.parse(backup.projects[original.id]);
  expect(saved.floors[0].furniture[0].details).toMatchObject({ note: 'Chosen on the web', price: 123.456, photos: ['chair.png'] });
  expect(saved.projectPackage.assets[`assets/${photoName}`]).toBeUndefined();
  const versions = readSnapshotStorage(backup.history[original.id]) as { data: string }[];
  expect(versions.some(v => JSON.parse(v.data).projectPackage.assets[`assets/${photoName}`])).toBe(true);
  expect(Object.values(JSON.parse(backup.history[original.id]).assets).filter(data => data === Buffer.from(added).toString('base64'))).toHaveLength(1);
  check();
});

test('room, wall and opening metadata can be edited after an actual Swift return', async ({ page }) => {
  const check = observe(page);
  const source = await openPackage(page, resolve('tests/fixtures/swift-metadata-return.zip')); await selectFurniture(page);
  await expect(page.getByRole('textbox', { name: 'Item notes', exact: true })).toHaveValue('Native follow-up');
  await expect(page.getByRole('spinbutton', { name: 'Item cost', exact: true })).toHaveValue('');
  await expect(page.getByRole('region', { name: 'Item details', exact: true })).toContainText('Item photos (0)');
  await page.getByRole('button', { name: `Select room ${source.floors[0].rooms[0].name}`, exact: true }).click();
  await fill(page, 'Item notes', 'Web room update');
  await fill(page, 'Room ceiling height (cm)', '297.625', true);
  await page.getByRole('combobox', { name: 'Room use', exact: true }).selectOption('office');
  await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Construction material', exact: true })).toHaveValue('concrete');
  await page.getByRole('combobox', { name: 'Construction material', exact: true }).selectOption('wood');
  await page.getByRole('button', { name: '🚪 single door 1', exact: true }).click();
  await fill(page, 'Item cost', '12.345', true);
  const plan = packageJSON((await packageFiles(page))['plan.json']);
  expect(plan.rooms[0]).toMatchObject({ note: 'Web room update', ceilingHeight: 2.97625, type: 'office' });
  expect(plan.walls[0].material).toBe('wood'); expect(plan.openings[0].price).toBe(12.345);
  check();
});

test('bad photos and quota failures keep the saved project and an exportable draft', async ({ page }) => {
  const check = observe(page), original = await openPackage(page); await selectFurniture(page);
  const before = await storedRecords(page);
  await addPhoto(page, resolve('tests/fixtures/library-backup.json'));
  await expect(page.getByRole('region', { name: 'Item details', exact: true }).getByRole('alert')).toContainText('readable JPG or PNG');
  expect(await storedRecords(page)).toEqual(before);
  await failProjectWrites(page);
  await fill(page, 'Item notes', 'Keep this unsaved photo draft');
  await addPhoto(page, resolve('tests/fixtures/item-photo.png'));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Browser storage is full');
  expect(await storedRecords(page)).toEqual(before);
  const draft = JSON.parse((await download(page, 'Download JSON backup')).toString());
  expect(draft.floors[0].furniture[0].details.note).toBe('Keep this unsaved photo draft');
  expect(draft.floors[0].furniture[0].details.photos).toHaveLength(2);
  expect(Object.keys(draft.projectPackage.assets)).toHaveLength(3);
  await page.evaluate(() => { (window as any).failProjectWrites = false; });
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect.poll(async () => (await savedProjects(page))[original.id].floors[0].furniture[0].details.note).toBe('Keep this unsaved photo draft');
  check();
});

test('changing selection while a photo decodes cannot attach it to another item', async ({ page }) => {
  const check = observe(page); await openPackage(page); await selectFurniture(page);
  const before = await storedRecords(page);
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function() {
      await new Promise<void>(resolve => { (window as any).finishPhotoDecode = resolve; });
      return decode.call(this);
    };
  });
  await choose(page, 'Add photo', resolve('tests/fixtures/item-photo.png'));
  await expect(page.getByRole('button', { name: 'Preparing photo…', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
  await page.evaluate(() => (window as any).finishPhotoDecode());
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  expect(await storedRecords(page)).toEqual(before);
  const plan = packageJSON((await packageFiles(page))['plan.json']);
  expect(plan.furniture[0].photos).toEqual(['chair.png']);
  check();
});
