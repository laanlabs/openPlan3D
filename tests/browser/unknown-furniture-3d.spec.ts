import { test, expect } from '@playwright/test';
import { benchmarkProject } from '../fixtures/render-benchmark';

for (const width of [1440, 390]) test(`unknown furniture renders in 3D at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door'])));
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/editor');
  const project = benchmarkProject('small'), floor = project.floors[0];
  floor.walls = []; floor.rooms = []; floor.doors = []; floor.windows = []; floor.columns = []; floor.stairs = [];
  floor.furniture = [
    { id: 'saved', catalogId: 'unavailable-model', position: { x: -150, y: 0 }, rotation: 30, width: 160, depth: 80, height: 90, color: '#ff00ff', scale: { x: -1.5, y: 0.75, z: 1.5 } },
    { id: 'defaults', catalogId: 'unavailable-default', position: { x: 150, y: 0 }, rotation: 15, color: '#00ff00', scale: { x: 1, y: 1, z: 1 } },
  ];
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'unknown-3d.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const hint = page.getByRole('button', { name: 'Got it', exact: true });
  await expect(hint).toBeHidden({ timeout: 15_000 });
  const canvas = page.getByRole('region', { name: '3D floor plan viewer' }).locator('canvas').last();
  await page.getByRole('button', { name: 'Top-Down View', exact: true }).click();
  await expect.poll(() => canvas.evaluate((node: HTMLCanvasElement) => {
    const probe = document.createElement('canvas'); probe.width = node.width; probe.height = node.height;
    const ctx = probe.getContext('2d')!; ctx.drawImage(node, 0, 0);
    const { data } = ctx.getImageData(0, 0, node.width, node.height);
    let magenta = 0, green = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r=data[i], g=data[i+1], b=data[i+2];
      if (r>100 && b>100 && r>g*1.5 && b>g*1.5) magenta++;
      if (g>100 && g>r*1.5 && g>b*1.5) green++;
    }
    return magenta>100 && green>100;
  })).toBe(true);
  await testInfo.attach(`unknown-3d-${width}`, { body: await page.screenshot(), contentType: 'image/png' });
  expect(errors).toEqual([]);
});
