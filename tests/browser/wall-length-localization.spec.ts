import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('Portuguese wall length controls preserve connections and reject invalid drafts', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/connected-dimensions.openplan.json'));
  await page.getByRole('button', { name: 'Salvar', exact: true }).press('l');
  await page.getByRole('button', { name: '─ Parede 1', exact: true }).click();
  const length = page.getByRole('textbox', { name: 'Comprimento (cm)', exact: true });
  await expect(length).toHaveValue('600.5');
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const original = await exported();
  await length.fill('6.5025 m'); await length.press('Enter');
  await expect(length).toHaveValue('650.25');
  await page.getByRole('combobox', { name: 'Manter fixo', exact: true }).selectOption('end');
  await length.fill('700.75'); await length.press('Enter');
  const edited = await exported();
  expect(edited.walls[0].start.x).toBeCloseTo(-50.5);
  expect(edited.walls[0].end.x).toBeCloseTo(650.25);
  expect(edited.walls[1].start).toEqual(edited.walls[0].end);
  expect(edited.walls[3].end).toEqual(edited.walls[0].start);
  expect(edited.doors).toEqual(original.doors);
  expect(edited.windows).toEqual(original.windows);
  for (const value of ['', '0', '-1', '700 cm extra']) {
    await length.fill(value); await length.press('Enter');
    await expect(length).toHaveValue('700.75');
    await expect(page.getByRole('alert')).toHaveText('Digite um comprimento de parede de pelo menos 1 cm.');
  }
  expect((await exported()).walls).toEqual(edited.walls);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(length).toHaveValue('650.25');

  for (const [label,value] of [['Altura inicial (cm)','100'],['Altura final (cm)','200']]) {
    const input = page.getByRole('spinbutton', { name: label, exact: true });
    await input.fill(value); await input.press('Tab');
  }
  await expect(page.getByRole('status')).toContainText('Algumas aberturas não cabem nesta parede.');
  const sloped = await exported();
  expect(sloped.doors).toEqual(original.doors);
  expect(sloped.windows).toEqual(original.windows);
  await page.getByRole('button', { name: '🔄 Inverter direção', exact: true }).click();
  const reversed = await exported();
  expect(reversed.walls[0].start).toEqual(sloped.walls[0].end);
  expect(reversed.walls[0].end).toEqual(sloped.walls[0].start);
  expect(reversed.walls[0].startHeight).toBe(200);
  expect(reversed.walls[0].endHeight).toBe(100);
  for (const key of ['doors','windows']) {
    expect(reversed[key][0].width).toBe(sloped[key][0].width);
    expect(reversed[key][0].height).toBe(sloped[key][0].height);
  }
  await page.getByRole('button', { name: '↔️ Igualar (200 cm)', exact: true }).click();
  const equalized = await exported();
  expect(equalized.walls[0]).toMatchObject({ startHeight: 200, endHeight: 200 });

  const curve = page.getByRole('button', { name: 'Parede curva', exact: true });
  await expect(curve).toHaveAttribute('aria-pressed', 'false');
  await curve.click();
  await expect(curve).toHaveAttribute('aria-pressed', 'true');
  await expect(curve).toHaveText('◆ Ativada');
  const curved = await exported();
  const wall = equalized.walls[0];
  const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y;
  const lengthCm = Math.hypot(dx, dy);
  expect(curved.walls[0].curvePoint).toEqual({ x: (wall.start.x + wall.end.x) / 2 - dy / lengthCm * 60, y: (wall.start.y + wall.end.y) / 2 + dx / lengthCm * 60 });
  expect(curved.doors).toEqual(equalized.doors);
  expect(curved.windows).toEqual(equalized.windows);
  await curve.click();
  await expect(curve).toHaveAttribute('aria-pressed', 'false');
  expect((await exported()).walls).toEqual(equalized.walls);

  const panel = page.locator('[data-plan-properties]');
  // Texture choices have visible text; color swatches use the same name as a title.
  await panel.getByRole('button', { name: 'Tijolo vermelho', exact: true }).filter({ hasText: 'Tijolo vermelho' }).click();
  await panel.getByRole('button', { name: 'Exterior', exact: true }).click();
  await panel.getByRole('button', { name: 'Painel de madeira', exact: true }).filter({ hasText: 'Painel de madeira' }).click();
  const materials = await exported();
  expect(materials.walls[0]).toEqual({ ...equalized.walls[0], interiorTexture: 'red-brick', interiorColor: '#8B4513', exteriorTexture: 'wood-panel', exteriorColor: '#8B6914' });
  await panel.getByRole('button', { name: 'Nenhuma', exact: true }).click();
  const noExteriorTexture = await exported();
  expect(noExteriorTexture.walls[0]).toEqual({ ...materials.walls[0], exteriorTexture: 'none' });
  expect(noExteriorTexture.doors).toEqual(equalized.doors);
  expect(noExteriorTexture.windows).toEqual(equalized.windows);
});
