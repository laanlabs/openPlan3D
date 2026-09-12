import { storedRecords } from './storage';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const fixture = resolve('tests/fixtures/native-import.openplan.json');
const damagedFixture = resolve('tests/fixtures/damaged-native.openplan.json');
async function exportProject(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
async function importProject(page: Page, data: unknown) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await pending).setFiles({ name: 'project.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
}
function observe(page: Page) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4188') external.push(request.url());
  });
  return () => { expect(errors).toEqual([]); expect(external).toEqual([]); };
}

for (const width of [1440, 390]) {
  test(`native import rejects damaged projects atomically at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    const check = observe(page);
    await page.goto('/editor');
    const source = JSON.parse(await readFile(fixture, 'utf8'));
    await importProject(page, source);
    await expect(page.getByRole('application')).toContainText('1 room');
    await page.getByRole('button', { name: 'Save', exact: true }).press('l');
    await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
    const thickness = page.getByRole('spinbutton', { name: 'Thickness (cm)', exact: true });
    await thickness.fill('32.5'); await thickness.press('Tab');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const saved = await exportProject(page), url = page.url();
    const library = await storedRecords(page);
    const changes: [string, (project: any) => void][] = [
      ['walls[0].start', p => p.floors[0].walls[0].start = null],
      ['doors[0].wallId', p => p.floors[0].doors[0].wallId = 'missing'],
      ['floors[0].furniture', p => p.floors[0].furniture = {}],
      ['floors[1].id', p => p.floors.push(structuredClone(p.floors[0]))],
      ['windows[0].height', p => p.floors[0].windows[0].height = -1],
    ];
    for (const [path, change] of changes) {
      const damaged = structuredClone(saved); change(damaged);
      await importProject(page, damaged);
      await expect(page.getByRole('alert')).toContainText(path);
      await expect(page.getByRole('alert')).toContainText('No project was imported.');
      expect(page.url()).toBe(url);
      expect(await exportProject(page)).toEqual(saved);
      expect(await storedRecords(page)).toEqual(library);
      await expect(thickness).toHaveValue('32.5');
      await page.getByRole('button', { name: 'Dismiss import error', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(thickness).toHaveValue('20');
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(thickness).toHaveValue('32.5');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('application')).toContainText('1 room');
    expect((await exportProject(page)).floors).toEqual(saved.floors);
    expect((await exportProject(page)).extensions).toEqual(source.extensions);
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible({ timeout: 60_000 });
    await testInfo.attach(`native-import-recovery-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    check();
  });
}

test('welcome import recovers from a damaged file and accepts missing legacy fields', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const check = observe(page);
  await page.goto('/');
  const importButton = page.getByRole('button', { name: /Import a Plan/ });
  const pending = page.waitForEvent('filechooser'); await importButton.click();
  await (await pending).setFiles(damagedFixture);
  await expect(page.getByRole('alert')).toContainText('walls[0].start');
  await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toBeVisible();
  expect(await storedRecords(page)).toEqual({});
  await page.getByRole('button', { name: 'Dismiss import error', exact: true }).click();
  const retry = page.waitForEvent('filechooser'); await importButton.click();
  await (await retry).setFiles(resolve('tests/fixtures/legacy-native.openplan.json'));
  await expect(page).toHaveURL(/id=qa-legacy-native-import/);
  await expect(page.getByRole('application')).toContainText('1 room');
  const saved = await exportProject(page);
  expect(saved.floors[0]).toMatchObject({ name: 'Ground Floor', level: 0, rooms: [], doors: [], windows: [], furniture: [], stairs: [], columns: [], guides: [], groups: [] });
  expect(saved.floors[0].walls[0]).toMatchObject({ end: { x: 600.5, y: 0 }, height: 280, color: '#444444' });
  await page.reload(); expect((await exportProject(page)).floors).toEqual(saved.floors);
  check();
});

test('damaged saved geometry offers an exact raw backup without hiding healthy projects', async ({ page }) => {
  const check = observe(page);
  const damaged = await readFile(damagedFixture, 'utf8');
  const healthy = JSON.parse(await readFile(fixture, 'utf8')); healthy.id = 'qa-healthy-neighbor';
  const raw = JSON.stringify({ 'qa-project-import-safety': damaged, [healthy.id]: JSON.stringify(healthy) });
  await page.addInitScript(raw => {
    if (localStorage.getItem('floorplan_projects') === null) localStorage.setItem('floorplan_projects', raw);
  }, raw);
  await page.goto('/editor?id=qa-project-import-safety');
  await expect(page.getByRole('alert')).toContainText('walls[0].start');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download library backup', exact: true }).click();
  const backup = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(backup.projects).toEqual(JSON.parse(raw));
  expect(backup.legacy.original.floorplan_projects).toBe(raw);
  expect(await page.evaluate(() => localStorage.getItem('floorplan_projects'))).toBe(raw);
  await page.goto('/editor?id=qa-healthy-neighbor');
  await expect(page.getByRole('application')).toContainText('1 room');
  expect((await exportProject(page)).id).toBe(healthy.id);
  expect(await page.evaluate(() => localStorage.getItem('floorplan_projects'))).toBe(raw);
  check();
});

test('a damaged version stays available for backup and cannot replace the current plan', async ({ page }, testInfo) => {
  const check = observe(page), source = JSON.parse(await readFile(fixture, 'utf8'));
  const history = JSON.stringify([{ timestamp: Date.now(), description: 'Damaged snapshot', data: await readFile(damagedFixture, 'utf8') }]);
  await page.addInitScript(({ source, history }) => {
    localStorage.setItem('floorplan_projects', JSON.stringify({ [source.id]: JSON.stringify(source) }));
    localStorage.setItem(`vh_${source.id}`, history);
  }, { source, history });
  await page.goto(`/editor?id=${source.id}`);
  await expect(page.getByRole('application')).toContainText('1 room');
  const before = await exportProject(page);
  await page.getByRole('button', { name: 'Version History', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Version History', exact: true });
  page.once('dialog', modal => modal.accept());
  await dialog.getByRole('group', { name: 'Damaged snapshot', exact: true }).getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('walls[0].start');
  await expect(dialog.getByRole('alert')).toContainText('Your current plan has not changed.');
  const raw = (await storedRecords(page, 'history'))[source.id];
  const pending = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download version backup', exact: true }).click();
  expect(await readFile((await (await pending).path())!, 'utf8')).toBe(raw);
  await testInfo.attach('damaged-version-recovery', { body: await page.screenshot(), contentType: 'image/png' });
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  expect(await exportProject(page)).toEqual(before);
  check();
});

test('welcome import accepts the advertised iPhone RoomPlan JSON locally', async ({ page }) => {
  const check = observe(page);
  await page.goto('/');
  const pending = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import a Plan/ }).click();
  await (await pending).setFiles(resolve('tests/fixtures/handoff-roomplan.json'));
  await expect(page.getByRole('application')).toContainText('4 walls');
  await expect(page.getByRole('combobox', { name: 'Current floor' }).locator('option')).toHaveText(['Entry', 'Loft', 'Future Floor']);
  const saved = await exportProject(page);
  expect(saved.floors[0].walls[0].thickness).toBe(27.5);
  expect(saved.floors[0].doors[0].width).toBeCloseTo(91.5);
  await page.reload(); expect((await exportProject(page)).floors).toEqual(saved.floors);
  check();
});

test('unreadable history remains downloadable and is not replaced by the session snapshot', async ({ page }) => {
  const check = observe(page), source = JSON.parse(await readFile(fixture, 'utf8'));
  await page.addInitScript(source => {
    localStorage.setItem('floorplan_projects', JSON.stringify({ [source.id]: JSON.stringify(source) }));
    localStorage.setItem(`vh_${source.id}`, '{damaged history bytes');
  }, source);
  await page.goto(`/editor?id=${source.id}`);
  await expect(page.getByRole('application')).toContainText('1 room');
  await page.getByRole('button', { name: 'Version History', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Version History', exact: true });
  await expect(dialog.getByRole('alert')).toContainText('Version history could not be read.');
  const pending = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download version backup', exact: true }).click();
  expect(await readFile((await (await pending).path())!, 'utf8')).toBe('{damaged history bytes');
  expect(await page.evaluate(id => localStorage.getItem(`vh_${id}`), source.id)).toBe('{damaged history bytes');
  check();
});

test('imported reserved and punctuated IDs save and reopen through project-library links', async ({ page }) => {
  const check = observe(page), source = JSON.parse(await readFile(fixture, 'utf8'));
  await page.goto('/editor');
  for (const [i, id] of ['__proto__', 'qa project?#& spaces'].entries()) {
    const project = { ...source, id, name: `QA unusual ID ${i}` };
    await importProject(page, project);
    await expect(page.getByRole('application')).toContainText('1 room');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await page.getByRole('link', { name: project.name, exact: true }).click();
    await expect(page.getByRole('application')).toContainText('1 room');
    expect(new URL(page.url()).searchParams.get('id')).toBe(id);
    const loaded = await exportProject(page);
    expect(loaded.id).toBe(id); expect(loaded.name).toBe(project.name);
    expect(loaded.floors[0].walls).toEqual(project.floors[0].walls);
  }
  check();
});
