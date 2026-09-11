import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const method of ['drop', 'click']) for (const kind of ['door', 'window']) test(`${method} a ${kind} uses the curved wall path and supports Undo`, async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  const floor = plan.floors[0];
  floor.walls = [{ ...floor.walls[0], start: { x: -300, y: 0 }, end: { x: 300, y: 0 }, curvePoint: { x: 0, y: 600 } }];
  floor.doors = []; floor.windows = []; floor.rooms = []; floor.furniture = [];
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'curve-drop.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors;
  }
  const before = await exported();
  await page.getByRole('button', { name: 'Zoom em 100%', exact: true }).click();
  const canvas = page.getByLabel(/^(?:Floor plan editor canvas|Área de edição da planta baixa)$/, { exact: true });
  const bounds = (await canvas.boundingBox())!;
  const card = page.getByRole('button', { name: kind === 'door' ? 'Simples 90cm de abrir' : 'Fixa 100×100cm', exact: true });
  const position = { x: bounds.width / 2, y: bounds.height / 2 + 150 };
  if (method === 'drop') await card.dragTo(canvas, { targetPosition: position });
  else { await card.click(); await canvas.click({ position }); await canvas.press('Escape'); }
  const placed = await exported(), key = kind === 'door' ? 'doors' : 'windows';
  expect(placed[0][key]).toHaveLength(1);
  expect(placed[0][key][0]).toMatchObject({ wallId: floor.walls[0].id, type: kind === 'door' ? 'single' : 'fixed' });
  expect(placed[0][key][0].position).toBeCloseTo(.5, 1);
  expect(placed[0].walls).toEqual(before[0].walls);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await exported()).toEqual(before);
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  expect(await exported()).toEqual(placed);
});
