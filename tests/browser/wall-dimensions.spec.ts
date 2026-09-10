import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function exportPlan(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
}
async function edit(page: Page, name: string, value: string) {
  const input = page.getByLabel(name, { exact: true });
  await input.fill(value); await input.press('Tab');
}

for (const width of [1440, 390]) {
  test(`numeric wall dimensions preserve joined rooms and valid opening values at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [], external: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4188') external.push(request.url());
    });
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles(resolve('tests/fixtures/connected-dimensions.openplan.json'));
    await expect(page.getByRole('application')).toContainText('1 room');
    // L is the existing layers shortcut, available on desktop and compact layouts.
    await page.getByRole('button', { name: 'Save', exact: true }).press('l');
    await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
    const length = page.getByLabel('Length (cm)', { exact: true });
    await expect(length).toHaveValue('600.5');
    await edit(page, 'Length (cm)', '650.25');
    await expect(length).toHaveValue('650.25');
    await expect(page.getByRole('application')).toContainText('1 room');
    await expect(page.getByRole('application')).toContainText('25.0 m²');
    let exported = await exportPlan(page);
    let walls = exported.floors[0].walls;
    expect(walls[0].end.x).toBeCloseTo(650.25);
    expect(walls[1].start).toEqual(walls[0].end);
    expect(exported.floors[0].rooms[0].name).toBe('Kitchen & Dining');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(length).toHaveValue('600.5');
    await expect(page.getByRole('application')).toContainText('1 room');
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(length).toHaveValue('650.25');
    await page.getByRole('combobox', { name: 'Keep fixed', exact: true }).selectOption('end');
    await edit(page, 'Length (cm)', '700.75');
    await expect(length).toHaveValue('700.75');
    for (const value of ['', '0', '-10', '700 cm extra']) {
      await edit(page, 'Length (cm)', value);
      await expect(length).toHaveValue('700.75');
      await expect(page.getByRole('alert')).toContainText('at least 1 cm');
    }
    await edit(page, 'Thickness (cm)', '');
    await expect(page.getByRole('spinbutton', { name: 'Thickness (cm)', exact: true })).toHaveValue('20');
    await edit(page, 'Thickness (cm)', '-5');
    await expect(page.getByRole('spinbutton', { name: 'Thickness (cm)', exact: true })).toHaveValue('20');
    await edit(page, 'Thickness (cm)', '32.75');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByRole('spinbutton', { name: 'Thickness (cm)', exact: true })).toHaveValue('20');
    await page.getByRole('button', { name: 'Undo', exact: true }).click(); // invalid drafts did not consume history
    await expect(length).toHaveValue('650.25');
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    exported = await exportPlan(page); walls = exported.floors[0].walls;
    expect(walls[0].start.x).toBeCloseTo(-50.5);
    expect(walls[0].end.x).toBeCloseTo(650.25);
    expect(walls[3].end).toEqual(walls[0].start);
    expect(walls[1].start).toEqual(walls[0].end);
    await testInfo.attach(`connected-resize-${width}`, { body: await page.screenshot(), contentType: 'image/png' });

    await page.getByRole('button', { name: '🚪 opening door 1', exact: true }).click();
    const doorWidth = page.getByRole('spinbutton', { name: 'Width (cm)', exact: true });
    await expect(doorWidth).toHaveValue('90.5');
    for (const value of ['', '0', '-1']) {
      await edit(page, 'Width (cm)', value); await expect(doorWidth).toHaveValue('90.5');
    }
    await edit(page, 'Width (cm)', '95.125');
    await edit(page, 'Height (cm)', '');
    await expect(page.getByRole('spinbutton', { name: 'Height (cm)', exact: true })).toHaveValue('205.25');
    await edit(page, 'Height (cm)', '207.75');
    await edit(page, 'Distance from A (cm)', '250.125');
    await expect(page.getByRole('spinbutton', { name: 'Distance from B (cm)', exact: true })).toHaveValue('450.625');
    await edit(page, 'Distance from A (cm)', '');
    await expect(page.getByRole('spinbutton', { name: 'Distance from A (cm)', exact: true })).toHaveValue('250.125');
    await page.getByRole('button', { name: '🪟 standard window 1', exact: true }).click();
    await edit(page, 'Height (cm)', '-10');
    await expect(page.getByRole('spinbutton', { name: 'Height (cm)', exact: true })).toHaveValue('120.5');
    await edit(page, 'Sill Height (cm)', '0');
    await expect(page.getByRole('spinbutton', { name: 'Sill Height (cm)', exact: true })).toHaveValue('0');
    await edit(page, 'Distance from A (cm)', '9999');

    await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
    if (width < 768) await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Dimensions', exact: true }).click();
    await page.getByRole('button', { name: 'ft, inch', exact: true }).click();
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    const beforeFocus = (await exportPlan(page)).floors;
    const inches = page.getByLabel('Length (in)', { exact: true });
    await expect(inches).toHaveValue('275.9');
    for (const name of ['Length (in)', 'Thickness (in)', 'Start Height (in)', 'End Height (in)']) {
      const input = page.getByLabel(name, { exact: true });
      await input.click(); await input.press('Tab');
    }
    expect((await exportPlan(page)).floors).toEqual(beforeFocus);
    // Explicit units override the display preference, and undo restores full precision.
    for (const [draft, expected] of [['12\"', 30.48], ["5'6\"", 167.64], ['2.5 m', 250]] as const) {
      await edit(page, 'Length (in)', draft);
      const changed = (await exportPlan(page)).floors[0].walls;
      expect(Math.hypot(changed[0].end.x - changed[0].start.x, changed[0].end.y - changed[0].start.y)).toBeCloseTo(expected);
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      expect((await exportPlan(page)).floors).toEqual(beforeFocus);
    }
    await edit(page, 'Length (in)', '300.25');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const saved = await exportPlan(page); walls = saved.floors[0].walls;
    expect(Math.hypot(walls[0].end.x - walls[0].start.x, walls[0].end.y - walls[0].start.y)).toBeCloseTo(300.25 * 2.54);
    expect(walls[1].start).toEqual(walls[0].end);
    expect(saved.floors[0].doors[0]).toMatchObject({ width: 95.125, height: 207.75 });
    expect(saved.floors[0].windows[0]).toMatchObject({ height: 120.5, sillHeight: 0 });
    await page.reload();
    await expect(page.getByRole('application')).toContainText('1 room');
    expect((await exportPlan(page)).floors).toEqual(saved.floors);
    await page.getByRole('button', { name: '3D', exact: true }).click();
    // Lazy viewer loading and software WebGL initialization can exceed the default assertion timeout.
    await expect(page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').first()).toBeVisible({ timeout: 30_000 });
    await testInfo.attach(`resized-3d-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    expect(errors).toEqual([]); expect(external).toEqual([]);
  });
}
