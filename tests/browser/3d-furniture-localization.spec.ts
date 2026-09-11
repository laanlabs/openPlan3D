import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Portuguese 3D furniture placement preserves catalog identity and undo', async ({ page }) => {
  // Keep all four export comparisons on slower production-browser runs.
  test.slow();
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors;
  }
  const original = await exported();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const viewer = page.getByRole('region', { name: 'Visualizador 3D da planta', exact: true });
  const canvas = viewer.locator('canvas').last();
  await expect(canvas).toBeVisible();
  await viewer.getByRole('button', { name: 'Modo de edição', exact: true }).click();
  await viewer.getByRole('button', { name: 'Posicionar móveis', exact: true }).click();
  const living = viewer.getByRole('button', { name: 'Sala de estar', exact: true });
  await expect(living).toHaveAttribute('aria-pressed', 'true');
  await viewer.getByRole('button', { name: 'Quarto', exact: true }).click();
  await expect(living).toHaveAttribute('aria-pressed', 'false');
  await living.click();
  await viewer.getByRole('button', { name: /Poltrona/ }).click();
  await expect(viewer.getByText('🪑 Clique no piso para posicionar Poltrona • Esc para cancelar', { exact: true })).toBeVisible();
  const bounds = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: bounds.width * .6, y: bounds.height * .65 } });
  await viewer.getByRole('button', { name: 'Sair do posicionamento de móveis', exact: true }).click();
  await page.getByRole('button', { name: '2D', exact: true }).click();
  const placed = await exported();
  expect(placed[0].furniture).toHaveLength(original[0].furniture.length + 1);
  expect(placed[0].furniture.at(-1).catalogId).toBe('chair');
  expect(placed[0].walls).toEqual(original[0].walls);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await exported()).toEqual(original);
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  expect(await exported()).toEqual(placed);
});
