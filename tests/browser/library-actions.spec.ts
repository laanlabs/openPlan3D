import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { failProjectWrites, savedProjects, storedRecords } from './storage';

async function seed(page: Page) {
  const project = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
  project.id = 'qa-library-actions'; project.name = 'QA Library Actions';
  const second = { ...project, id: 'qa-library-second', name: 'Second project' };
  await page.addInitScript(projects => {
    if (!localStorage.getItem('qaLibraryActionsSeeded')) {
      localStorage.setItem('floorplan_projects', JSON.stringify(Object.fromEntries(projects.map(p => [p.id, JSON.stringify(p)]))));
      localStorage.setItem('qaLibraryActionsSeeded', 'true');
    }
    localStorage.setItem('hasSeenWelcome', 'true');
  }, [project, second]);
  await page.goto('/');
  await expect(page.getByRole('link', { name: project.name, exact: true })).toBeVisible();
  return project;
}
function observe(page: Page) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== 'http://127.0.0.1:4188') external.push(r.url()); });
  return () => { expect(errors).toEqual([]); expect(external).toEqual([]); };
}
function trigger(page: Page, name = 'QA Library Actions') {
  return page.getByRole('button', { name: `Project actions for ${name}`, exact: true });
}
async function action(page: Page, name: string, projectName?: string) {
  await trigger(page, projectName).press('Enter');
  await page.getByRole('menuitem', { name, exact: true }).click();
}
async function holdWrites(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => {
    void navigator.locks.request('openplan3d-project-library', () => new Promise<void>(release => {
      (window as any).releaseLibraryAction = release; resolve();
    }));
  }));
}
async function releaseWrites(page: Page) {
  await page.evaluate(() => { (window as any).releaseLibraryAction(); });
}

for (const width of [1440, 390]) {
  test(`library menus navigate and cancellation preserves projects at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const check = observe(page); await seed(page);
    const before = await storedRecords(page);
    const button = trigger(page), menu = page.getByRole('menu');
    await button.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Open', exact: true })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('menuitem', { name: 'Delete', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Open', exact: true })).toBeFocused();
    await page.keyboard.press('d');
    await expect(page.getByRole('menuitem', { name: 'Duplicate', exact: true })).toBeFocused();
    await page.keyboard.press('d');
    await expect(page.getByRole('menuitem', { name: 'Delete', exact: true })).toBeFocused();
    await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Rename', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0); await expect(button).toBeFocused();
    await button.press('ArrowUp');
    await expect(page.getByRole('menuitem', { name: 'Delete', exact: true })).toBeFocused();
    await page.keyboard.press('Tab'); await expect(menu).toHaveCount(0);
    await button.press('Enter'); await page.keyboard.press('Shift+Tab'); await expect(menu).toHaveCount(0);
    await button.click(); await page.getByRole('heading', { name: 'Floor Plan Editor', exact: true }).click();
    await expect(menu).toHaveCount(0);
    // Moving to another project's trigger must dismiss the old menu without stealing focus.
    await button.press('Enter'); await trigger(page, 'Second project').focus();
    await expect(menu).toHaveCount(0); await expect(trigger(page, 'Second project')).toBeFocused();
    await action(page, 'Rename');
    const rename = page.getByRole('dialog', { name: 'Rename project', exact: true });
    const field = rename.getByRole('textbox', { name: 'Project name', exact: true });
    await expect(field).toBeFocused(); await field.fill('Uncommitted draft');
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    await expect(field).toBeFocused();
    await page.keyboard.press('Escape'); await expect(rename).toHaveCount(0); await expect(button).toBeFocused();
    await action(page, 'Delete');
    const deletion = page.getByRole('dialog', { name: 'Delete project', exact: true });
    await expect(deletion).toContainText('QA Library Actions');
    await expect(deletion.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await testInfo.attach(`library-delete-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    await page.keyboard.press('Escape'); await expect(deletion).toHaveCount(0); await expect(button).toBeFocused();
    await action(page, 'Delete');
    // A fresh confirmation starts at Cancel, so Enter cannot accept an old deletion.
    await expect(deletion.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.keyboard.press('Enter'); await expect(deletion).toHaveCount(0);
    expect(await storedRecords(page)).toEqual(before);
    await action(page, 'Open'); await expect(page).toHaveURL(/editor\?id=qa-library-actions$/);
    await expect(page.getByRole('application')).toContainText('4 walls');
    check();
  });

  test(`library rename retains failed drafts and submits once at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const check = observe(page), project = await seed(page), before = await storedRecords(page);
    await action(page, 'Rename');
    const dialog = page.getByRole('dialog', { name: 'Rename project', exact: true });
    const field = dialog.getByRole('textbox', { name: 'Project name', exact: true });
    const save = dialog.getByRole('button', { name: 'Save name', exact: true });
    await field.fill('   '); await expect(save).toBeDisabled();
    await field.fill('  Renamed local project  ');
    await failProjectWrites(page); await field.press('Enter');
    await expect(dialog.getByRole('alert')).toContainText('Browser storage is full');
    await expect(field).toHaveValue('  Renamed local project  ');
    expect(await storedRecords(page)).toEqual(before);
    await testInfo.attach(`library-rename-recovery-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    await page.evaluate(() => { (window as any).failProjectWrites = false; });
    await holdWrites(page);
    await field.press('Enter');
    await expect(save).toBeDisabled(); await expect(field).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape'); await expect(dialog).toBeVisible();
    await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
    expect(await storedRecords(page)).toEqual(before);
    await releaseWrites(page);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Renamed local project', exact: true })).toBeVisible();
    await expect(trigger(page, 'Renamed local project')).toBeFocused();
    const saved = await savedProjects(page);
    expect(saved[project.id].floors).toEqual(project.floors);
    expect(Object.keys(saved)).toHaveLength(2);
    expect((await storedRecords(page))['qa-library-second']).toBe(before['qa-library-second']);
    await page.reload();
    await expect(page.getByRole('link', { name: 'Renamed local project', exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    check();
  });
}

test('library copies once while busy and deletes only the confirmed project', async ({ page }) => {
  const check = observe(page), project = await seed(page), before = await storedRecords(page);
  await holdWrites(page); await action(page, 'Duplicate');
  await expect(page.getByRole('status')).toHaveText('Duplicating project…');
  await expect(trigger(page)).toBeDisabled(); await expect(trigger(page, 'Second project')).toBeDisabled();
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  expect(await storedRecords(page)).toEqual(before);
  await releaseWrites(page);
  await expect(page.getByRole('link', { name: `${project.name} (Copy)`, exact: true })).toBeVisible();
  const copied = await savedProjects(page), copy = Object.values(copied).find(p => p.name === `${project.name} (Copy)`)!;
  expect(Object.keys(copied)).toHaveLength(3); expect(copy.floors).toEqual(project.floors);
  await action(page, 'Delete', copy.name);
  const dialog = page.getByRole('dialog', { name: 'Delete project', exact: true });
  await holdWrites(page);
  await dialog.getByRole('button', { name: 'Delete project', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Delete project', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(dialog).toBeVisible();
  await releaseWrites(page); await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('link', { name: copy.name, exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New Project', exact: true })).toBeFocused();
  expect(await storedRecords(page)).toEqual(before);
  await page.reload(); expect(await storedRecords(page)).toEqual(before);
  check();
});

test('failed library deletion keeps its confirmation available for retry', async ({ page }) => {
  const check = observe(page); await seed(page); const before = await storedRecords(page);
  await action(page, 'Delete');
  await page.evaluate(() => {
    (window as any).failLibraryDelete = true;
    const remove = IDBObjectStore.prototype.delete;
    IDBObjectStore.prototype.delete = function(...args) {
      if (this.name === 'projects' && (window as any).failLibraryDelete) throw new DOMException('Unavailable', 'SecurityError');
      return remove.apply(this, args);
    };
  });
  const dialog = page.getByRole('dialog', { name: 'Delete project', exact: true });
  await dialog.getByRole('button', { name: 'Delete project', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Browser storage is unavailable');
  expect(await storedRecords(page)).toEqual(before);
  await page.evaluate(() => { (window as any).failLibraryDelete = false; });
  await dialog.getByRole('button', { name: 'Delete project', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger(page)).toHaveCount(0);
  expect(await storedRecords(page)).toEqual({ 'qa-library-second': before['qa-library-second'] });
  check();
});
