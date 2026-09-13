import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function exportedFloor(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
}

for (const width of [1440, 390]) {
  test(`structural dimensions reject invalid drafts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
    plan.floors[0].stairs = [{ id: 'qa-stair', position: { x: 100, y: 100 }, width: 100.125, depth: 300.125, rotation: 15.5, riserCount: 14, direction: 'up', stairType: 'straight' }];
    plan.floors[0].columns = [{ id: 'qa-column', position: { x: 400, y: 100 }, diameter: 30.125, height: 280.125, rotation: 0, shape: 'round', color: '#cccccc' }];
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'structural.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
    await page.getByRole('button', { name: 'Save', exact: true }).press('l');
    await page.getByRole('button', { name: '🪜 Stair 1 (up)', exact: true }).click();
    async function edit(name: string, value: string) {
      const field = page.getByRole('spinbutton', { name, exact: true });
      await field.fill(value); await field.press('Tab');
      return field;
    }
    for (const [name, saved, invalid] of [
      ['Width (cm)', '100.125', ['', '0', '-1']],
      ['Depth (cm)', '300.125', ['', '0', '-10']],
      ['Risers', '14', ['', '0', '2', '31', '3.5']],
      ['Rotation (degrees)', '15.5', ['']],
    ] as const) {
      for (const draft of invalid) await expect(await edit(name, draft)).toHaveValue(saved);
    }
    expect((await exportedFloor(page)).stairs).toEqual(plan.floors[0].stairs);
    await edit('Width (cm)', '125.75');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await exportedFloor(page)).stairs).toEqual(plan.floors[0].stairs);
    await page.getByRole('button', { name: '🏛️ round column 1', exact: true }).click();
    for (const [name, saved, invalid] of [
      ['Diameter (cm)', '30.125', ['', '0', '9', '201']],
      ['Height (cm)', '280.125', ['', '-1', '49', '1001']],
    ] as const) {
      for (const draft of invalid) await expect(await edit(name, draft)).toHaveValue(saved);
    }
    expect((await exportedFloor(page)).columns).toEqual(plan.floors[0].columns);
    if (width < 768) await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Dimensions', exact: true }).click();
    await page.getByRole('button', { name: 'ft, inch', exact: true }).click();
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    for (const name of ['Diameter (in)', 'Height (in)']) {
      const field = page.getByRole('spinbutton', { name, exact: true });
      await field.click(); await field.press('Tab');
    }
    expect((await exportedFloor(page)).columns).toEqual(plan.floors[0].columns);
    await edit('Diameter (in)', '5'); // 12.7 cm is within the physical 10–200 cm range.
    await edit('Height (in)', '20'); // 50.8 cm is within the physical 50–1000 cm range.
    const changed = await exportedFloor(page);
    expect(changed.columns[0]).toMatchObject({ diameter: 12.7, height: 50.8 });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved ✓', { exact: true })).toHaveCount(1);
    await page.reload();
    expect((await exportedFloor(page)).columns).toEqual(changed.columns);
  });
}
