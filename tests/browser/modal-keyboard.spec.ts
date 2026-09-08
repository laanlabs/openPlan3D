import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { storedRecords } from './storage';

const id = 'qa-modal-keyboard';
async function seed(page: Page) {
  const project = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
  project.id = id; project.name = 'QA Modal Keyboard';
  await page.addInitScript(project => {
    if (!localStorage.getItem('qaModalSeeded')) {
      localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) }));
      localStorage.setItem('hasSeenWelcome', 'true');
      localStorage.setItem('qaModalSeeded', 'true');
    }
  }, project);
  await page.goto(`/editor?id=${id}`);
  await page.getByRole('button', { name: 'Save', exact: true }).press('l');
  await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
  return project;
}
function observe(page: Page) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== 'http://127.0.0.1:4188') external.push(r.url()); });
  return () => { expect(errors).toEqual([]); expect(external).toEqual([]); };
}
async function toolbar(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  if (!await button.isVisible()) await page.getByRole('button', { name: 'More actions', exact: true }).click();
  await button.press('Enter');
}
async function exported(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
async function focusInside(page: Page, name: string) {
  const dialog = page.getByRole('dialog', { name, exact: true });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate(node => node.matches(':modal') && node.contains(document.activeElement))).toBe(true);
  return dialog;
}

for (const width of [1440, 390]) test(`modal focus and keys preserve the selected plan at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  const check = observe(page); await seed(page);
  const before = await exported(page), stored = await storedRecords(page);
  for (const name of ['Settings', 'Version History', 'Area Summary', 'Keyboard Shortcuts', 'Print Preview']) {
    if (name === 'Print Preview') await page.getByRole('button', { name: 'Save', exact: true }).press('ControlOrMeta+p');
    else await toolbar(page, name);
    const dialog = await focusInside(page, name);
    await expect(page.getByRole('application')).toHaveCount(0); // Background is inert.
    for (const key of ['Delete', 'Backspace', 'w', 'r', 'l', 'ControlOrMeta+z']) await page.keyboard.press(key);
    for (const key of ['Tab', 'Tab', 'Shift+Tab']) {
      await page.keyboard.press(key); await focusInside(page, name);
    }
    if (name === 'Settings') {
      await testInfo.attach(`settings-modal-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    }
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('spinbutton', { name: 'Thickness (cm)', exact: true })).toHaveValue('20');
    await expect(page.getByRole('application')).toContainText('4 walls');
    expect((await exported(page)).floors).toEqual(before.floors);
    expect(await storedRecords(page)).toEqual(stored);
  }
  // Editor deletion and undo resume after the dialog has gone away.
  await page.getByRole('button', { name: 'Save', exact: true }).press('Delete');
  await expect(page.getByRole('application')).toContainText('3 walls');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('application')).toContainText('4 walls');
  check();
});

for (const width of [1440, 390]) test(`command palette and modal field editing remain usable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); const check = observe(page); await seed(page);
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await save.press('ControlOrMeta+k');
  await focusInside(page, 'Command Palette');
  const search = page.getByRole('combobox', { name: 'Search commands', exact: true });
  await search.fill('not-a-command');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await expect(page.getByText('No results found', { exact: true })).toBeVisible();
  await expect(search).not.toHaveAttribute('aria-activedescendant');
  await search.fill('wall tool');
  await expect(page.getByRole('option', { name: /Wall Tool/ })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Floor plan editor canvas', { exact: true })).toHaveCSS('cursor', 'crosshair');
  await save.press('ControlOrMeta+k'); await search.fill('settings'); await page.keyboard.press('Enter');
  const dialog = await focusInside(page, 'Settings');
  const name = dialog.getByRole('textbox', { name: 'Project Name', exact: true });
  await name.fill('Keyboard-safe settings'); await name.press('Tab');
  await dialog.getByRole('button', { name: 'Dimensions', exact: true }).click();
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
  await expect(page.getByTitle('Click to rename', { exact: true })).toHaveText('Keyboard-safe settings');
  // Commands that dispatch keyboard events must run after modal teardown.
  const grid = page.getByTitle('Toggle Grid (G)', { exact: true });
  const before = await grid.textContent();
  await save.press('ControlOrMeta+k'); await search.fill('toggle grid'); await page.keyboard.press('Enter');
  await expect(grid).not.toHaveText(before!);
  await save.press('ControlOrMeta+k'); await page.keyboard.press('Escape');
  await expect(save).toBeFocused();
  check();
});

test('closing a dialog preserves elevation and 3D edit modes and print remains usable', async ({ page }) => {
  const check = observe(page); await seed(page);
  await page.getByRole('button', { name: 'Elevation', exact: true }).first().click();
  await toolbar(page, 'Version History'); await focusInside(page, 'Version History');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Elevation', exact: true }).first()).toHaveAttribute('aria-pressed', 'true');
  await toolbar(page, 'Settings');
  const settings = await focusInside(page, 'Settings');
  await settings.click({ position: { x: 5, y: 5 } });
  await expect(settings).toHaveCount(0);
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Mode', exact: true }).click();
  await toolbar(page, 'Settings'); await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Exit Edit Mode', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).press('ControlOrMeta+p');
  const print = await focusInside(page, 'Print Preview');
  await print.getByLabel('Scale:', { exact: true }).selectOption('fit');
  await expect(print.getByRole('button', { name: 'Download PDF', exact: true })).toBeEnabled();
  const pending = page.waitForEvent('download'); await print.getByRole('button', { name: 'Download PDF', exact: true }).click();
  expect((await readFile((await (await pending).path())!)).subarray(0, 4).toString()).toBe('%PDF');
  await page.emulateMedia({ media: 'print' });
  await expect(print.getByLabel('Floor plan print preview', { exact: true })).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await print.getByRole('button', { name: 'Close', exact: true }).click();
  check();
});

for (const width of [1440, 390]) test(`RoomPlan cancellation and template modal focus stay local at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); const check = observe(page); await seed(page);
  const before = await storedRecords(page);
  if (width < 768) await page.getByRole('button', { name: 'Toggle tools panel', exact: true }).click();
  const pending = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import RoomPlan iOS LiDAR scan/ }).click();
  await (await pending).setFiles(resolve('tests/fixtures/handoff-roomplan.json'));
  const dialog = await focusInside(page, 'Import RoomPlan');
  await page.keyboard.press('Tab'); await focusInside(page, 'Import RoomPlan');
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
  expect(await storedRecords(page)).toEqual(before);
  await page.goto('/');
  await page.getByRole('button', { name: 'Templates', exact: true }).press('Enter');
  const templates = await focusInside(page, 'Floor Plan Templates');
  await page.keyboard.press('Shift+Tab'); await focusInside(page, 'Floor Plan Templates');
  await page.keyboard.press('Escape'); await expect(templates).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Templates', exact: true })).toBeFocused();
  expect(await storedRecords(page)).toEqual(before);
  check();
});
