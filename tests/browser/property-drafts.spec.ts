import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function exportFloor(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
}

for (const width of [1440, 390]) {
  test(`presentation property drafts preserve geometry at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const fill = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
        if (text === 'QA note' && this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') {
          const p = new DOMPoint(x, y).matrixTransform(this.getTransform()), b = this.canvas.getBoundingClientRect();
          (window as any).__notePoint = { x: b.x + p.x * b.width / this.canvas.width, y: b.y + p.y * b.height / this.canvas.height };
        }
        if (maxWidth === undefined) return fill.call(this, text, x, y);
        return fill.call(this, text, x, y, maxWidth);
      };
    });
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
    const floor = plan.floors[0];
    floor.entourage = [{ id: 'person', defId: 'person', position: { x: 100, y: 100 }, width: 55.125, rotation: 15.125 }];
    floor.furniture = [{ id: 'furniture', catalogId: 'qa-furniture', position: { x: 400, y: 100 }, rotation: 22.125, scale: { x: 1, y: 1, z: 1 } }];
    floor.columns = [{ id: 'column', position: { x: 450, y: 300 }, diameter: 30, height: 280, rotation: 30.125, shape: 'square', color: '#cccccc' }];
    floor.textAnnotations = [{ id: 'note', x: 100.125, y: 300.125, text: 'QA note', fontSize: 20.5, rotation: 5.125, color: '#123456' }];
    floor.backgroundImage = { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8ioAAAAASUVORK5CYII=', position: { x: 0, y: 0 }, scale: 1, opacity: .5, rotation: 10.125, locked: true };
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'drafts.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
    await page.getByRole('button', { name: 'Save', exact: true }).press('l');
    async function edit(name: string, value: string) {
      const field = page.getByRole('spinbutton', { name, exact: true });
      await field.fill(value); await field.press('Tab'); return field;
    }
    await page.getByRole('button', { name: '🌳 Person', exact: true }).click();
    for (const draft of ['', '0', '-1', '.5']) await expect(await edit('Width (cm)', draft)).toHaveValue('55.125');
    await expect(await edit('Rotation (°)', '')).toHaveValue('15.125');
    await expect(await edit('Rotation', '')).toHaveValue('10.125');
    expect((await exportFloor(page)).entourage).toEqual(floor.entourage);
    if (width < 768) await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Dimensions', exact: true }).click();
    await page.getByRole('button', { name: 'ft, inch', exact: true }).click();
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    const inches = page.getByRole('spinbutton', { name: 'Width (in)', exact: true });
    await inches.click(); await inches.press('Tab');
    expect((await exportFloor(page)).entourage).toEqual(floor.entourage);
    await edit('Width (in)', '.5');
    expect((await exportFloor(page)).entourage[0].width).toBe(1.27);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await exportFloor(page)).entourage).toEqual(floor.entourage);
    await page.getByRole('button', { name: '📦 qa-furniture', exact: true }).click();
    await expect(await edit('Rotation (degrees)', '')).toHaveValue('22.125');
    await page.getByRole('button', { name: '🏛️ square column 1', exact: true }).click();
    await expect(await edit('Rotation (degrees)', '')).toHaveValue('30.125');
    // Observe the actual painted text anchor so selection follows responsive canvas layout.
    await page.getByRole('button', { name: 'Save', exact: true }).press('l');
    await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter');
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const point = await page.evaluate(() => (window as any).__notePoint);
    if (width < 768) {
      const sheet = await page.locator('[data-plan-properties]').boundingBox();
      expect(point.y).toBeLessThan(sheet!.y - 8);
      expect(point.y).toBeGreaterThan(72);
    }
    await testInfo.attach(`fit-properties-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
    await page.mouse.click(point.x, point.y);
    for (const [name, value] of [['X', '100.125'], ['Y', '300.125'], ['Rotation (°)', '5.125'], ['Font Size', '20.5']]) {
      await expect(await edit(name, '')).toHaveValue(value);
    }
    for (const value of ['0', '7', '73']) await expect(await edit('Font Size', value)).toHaveValue('20.5');
    const unchanged = await exportFloor(page);
    for (const key of ['entourage', 'furniture', 'columns', 'textAnnotations', 'backgroundImage']) expect(unchanged[key]).toEqual(floor[key]);
    await edit('X', '-25.125'); await edit('Font Size', '22.75');
    const changed = await exportFloor(page);
    expect(changed.textAnnotations[0]).toMatchObject({ x: -25.125, fontSize: 22.75 });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved ✓', { exact: true })).toHaveCount(1);
    await page.reload();
    expect((await exportFloor(page)).textAnnotations).toEqual(changed.textAnnotations);
  });
}
