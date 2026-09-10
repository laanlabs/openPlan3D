import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const kind of ['furniture', 'text', 'measurement', 'dimension']) {
  test(`${kind}-only floors export PNG PDF SVG and DXF`, async ({ page }, testInfo) => {
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
    const floor = plan.floors[0];
    for (const key of ['walls', 'doors', 'windows', 'rooms', 'furniture', 'textAnnotations', 'measurements', 'annotations']) floor[key] = [];
    if (kind === 'furniture') floor.furniture = [{ id: 'f', catalogId: 'unknown', position: { x: 9000, y: -8000 }, rotation: 35, width: 160, depth: 90, color: '#cc22cc' }];
    if (kind === 'text') floor.textAnnotations = [{ id: 't', x: 9000, y: -8000, rotation: 25, fontSize: 20, text: 'Standalone note', color: '#cc22cc' }];
    if (kind === 'measurement') floor.measurements = [{ id: 'm', x1: 9000, y1: -8000, x2: 9200, y2: -7950 }];
    if (kind === 'dimension') floor.annotations = [{ id: 'a', x1: 9000, y1: -8000, x2: 9200, y2: -8000, offset: -80, label: 'Standalone dimension' }];
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'standalone.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
    await expect(page.getByRole('button', { name: plan.name, exact: true })).toBeVisible();
    await expect(page.getByRole('application')).toContainText('0 walls');
    async function download(name: string) {
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      const pending = page.waitForEvent('download');
      await page.getByRole('button', { name, exact: true }).click();
      return readFile((await (await pending).path())!);
    }
    const svg = (await download('Export as SVG')).toString();
    expect(svg).not.toMatch(/NaN|Infinity/);
    if (kind === 'text') expect(svg).toContain('Standalone note');
    if (kind === 'dimension') expect(svg).toContain('Standalone dimension');
    if (kind === 'furniture') expect(svg).toContain('#cc22cc');
    if (kind === 'measurement') expect(svg).toContain('#ef4444');
    const png = await download('Export 2D as PNG');
    const pixels = await page.evaluate(async data => {
      const img = new Image(); img.src = data; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
      const p = ctx.getImageData(0, 0, c.width, c.height).data;
      let colored = 0;
      for (let i = 0; i < p.length; i += 4) if (Math.max(p[i], p[i+1], p[i+2]) - Math.min(p[i], p[i+1], p[i+2]) > 50) colored++;
      return { colored, width: c.width, height: c.height };
    }, `data:image/png;base64,${png.toString('base64')}`);
    expect(pixels.colored).toBeGreaterThan(50);
    expect(pixels.width).toBeLessThanOrEqual(4096); expect(pixels.height).toBeLessThanOrEqual(4096);
    await testInfo.attach(`${kind}-only.png`, { body: png, contentType: 'image/png' });
    const dxf = (await download('Export as DXF')).toString();
    expect(dxf).not.toMatch(/NaN|Infinity/);
    expect(dxf).toContain(kind === 'text' ? 'Standalone note' : kind === 'dimension' ? 'Standalone dimension' : 'ENTITIES');
    const pdf = await download('Export as PDF');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    await testInfo.attach(`${kind}-only.pdf`, { body: pdf, contentType: 'application/pdf' });
  });
}
