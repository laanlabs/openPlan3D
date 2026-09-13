import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { benchmarkProject } from '../fixtures/render-benchmark';

test('exports moved room labels without clipping and caps raster dimensions', async ({ page }, testInfo) => {
 const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
 await page.goto('/editor');
 await page.getByRole('button', { name: 'Export', exact: true }).click();
 const chooser = page.waitForEvent('filechooser');
 await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
 const project = benchmarkProject('small');
 project.floors[0].furniture = []; project.floors[0].doors = []; project.floors[0].windows = [];
 project.floors[0].rooms[0].name = 'Moved room';
 project.floors[0].rooms[0].labelOffset = { x: -2000, y: -200 };
 await (await chooser).setFiles({ name: 'labels.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
 await page.waitForLoadState('networkidle');
 async function download(name: string) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  return readFile((await (await pending).path())!);
 }
 const svg = (await download('Export as SVG')).toString('utf8');
 const layout = await page.evaluate(svg => {
  const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
  root.style.position = 'fixed'; root.style.left = '-10000px'; document.body.append(root);
  const text = [...root.querySelectorAll('text')].find(t => t.textContent === 'Moved room')!;
  const box = text.getBBox(), view = root.viewBox.baseVal;
  const result = { x: box.x, y: box.y, right: box.x + box.width, bottom: box.y + box.height, width: view.width, height: view.height,
   polygonX: Number(root.querySelector('polygon')!.getAttribute('points')!.split(',')[0]) };
  root.remove(); return result;
 }, svg);
 expect(layout.x).toBeGreaterThanOrEqual(0); expect(layout.y).toBeGreaterThanOrEqual(0);
 expect(layout.right).toBeLessThan(layout.width); expect(layout.bottom).toBeLessThan(layout.height);
 expect(layout.right).toBeLessThan(layout.polygonX);
 const png = await download('Export 2D as PNG');
 expect(png.subarray(1, 4).toString()).toBe('PNG');
 expect(png.readUInt32BE(16)).toBe(4096); expect(png.readUInt32BE(20)).toBeLessThanOrEqual(4096);
 const dxf = (await download('Export as DXF')).toString();
 expect(dxf).toContain('Moved room'); expect(dxf).toMatch(/\r?\n10\r?\n-1775\r?\n20\r?\n-25\r?\n/);
 const pdf = await download('Export as PDF'); expect(pdf.subarray(0, 5).toString()).toBe('%PDF-'); expect(pdf.length).toBeGreaterThan(10000);
 await testInfo.attach('moved-label.svg', { body: svg, contentType: 'image/svg+xml' });
 await testInfo.attach('moved-label.png', { body: png, contentType: 'image/png' });
 expect(errors).toEqual([]);
});
