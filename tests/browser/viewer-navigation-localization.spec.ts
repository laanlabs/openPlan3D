import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('Portuguese 3D navigation preserves project data and exports a screenshot', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/sloped-walls.openplan.json'));
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  }
  const before = await exported();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const viewer = page.getByRole('region', { name: 'Visualizador 3D da planta', exact: true });
  await expect(viewer.locator('canvas').first()).toBeVisible();
  await viewer.getByRole('button', { name: 'Mostrar todos os pavimentos empilhados', exact: true }).click();
  await viewer.getByRole('button', { name: 'Somente pavimento ativo', exact: true }).click();
  await viewer.getByRole('button', { name: 'Vista superior', exact: true }).click();
  await viewer.getByRole('button', { name: 'Tornar paredes transparentes', exact: true }).click();
  await viewer.getByRole('button', { name: 'Mostrar paredes sólidas', exact: true }).click();
  await viewer.getByRole('button', { name: 'Modo de edição', exact: true }).click();
  await viewer.getByRole('button', { name: 'Sair do modo de edição', exact: true }).click();
  const camera = viewer.getByRole('button', { name: 'Posicionar câmera interna', exact: true });
  await camera.click();
  await expect(viewer.getByText('📷 Clique no piso para posicionar a câmera', { exact: true })).toBeVisible();
  await camera.click();
  await expect(viewer.getByText('📷 Clique no piso para posicionar a câmera', { exact: true })).toHaveCount(0);
  const lighting = viewer.getByRole('button', { name: 'Controles de iluminação', exact: true });
  await expect(lighting).toHaveAttribute('aria-expanded', 'false');
  await lighting.click();
  await expect(lighting).toHaveAttribute('aria-expanded', 'true');
  const azimuth = viewer.getByRole('slider', { name: /^Posição do sol/ });
  const elevation = viewer.getByRole('slider', { name: /^Elevação do sol/ });
  const ambient = viewer.getByRole('slider', { name: /^Luz ambiente/ });
  for (const [label, az, el, light] of [['manhã', 90, 25, 30], ['meio-dia', 180, 80, 45], ['entardecer', 270, 15, 20], ['noite', 0, 5, 8]] as const) {
    const preset = viewer.getByRole('button', { name: new RegExp(label + '$') });
    await preset.click();
    await expect(preset).toHaveAttribute('aria-pressed', 'true');
    await expect(azimuth).toHaveValue(String(az));
    await expect(elevation).toHaveValue(String(el));
    await expect(ambient).toHaveValue(String(light));
  }
  await ambient.focus(); await ambient.press('ArrowRight');
  await expect(ambient).toHaveValue('9');
  await expect(viewer.getByRole('button', { name: /noite$/ })).toHaveAttribute('aria-pressed', 'false');
  await lighting.click();
  await expect(lighting).toHaveAttribute('aria-expanded', 'false');
  const pending = page.waitForEvent('download');
  await viewer.getByRole('button', { name: 'Salvar captura 3D', exact: true }).click();
  const screenshot = await pending;
  expect(screenshot.suggestedFilename()).toBe('floorplan-3d.png');
  expect((await readFile((await screenshot.path())!)).subarray(0, 8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));
  await page.getByRole('button', { name: '2D', exact: true }).click();
  const after = await exported();
  expect(after.floors).toEqual(before.floors);
  expect(after.settings).toEqual(before.settings);
});
