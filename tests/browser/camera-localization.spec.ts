import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { observeGPU, gpu } from './gpu';

test('Portuguese camera controls capture full-size images and release the preview', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await observeGPU(page);
  await page.goto('/editor');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const viewer = page.getByRole('region', { name: 'Visualizador 3D da planta', exact: true });
  const main = viewer.locator('canvas').first();
  await expect(main).toBeVisible();
  await viewer.getByRole('button', { name: 'Posicionar câmera interna', exact: true }).click();
  const bounds = (await main.boundingBox())!;
  await main.click({ position: { x: bounds.width * .45, y: bounds.height * .5 } });
  const preview = viewer.getByLabel('Prévia da câmera interna', { exact: true });
  await expect(preview).toBeVisible();
  await expect.poll(async () => (await gpu(page)).filter((item: any) => !item.lost && item.width === 384 && item.draws > 0).length).toBe(1);
  for (const name of ['Mover para a esquerda', 'Mover para frente', 'Mover para trás', 'Mover para a direita']) {
    await viewer.getByRole('button', { name, exact: true }).click();
  }
  for (const name of [/^Campo de visão/, /^Altura/]) {
    const slider = viewer.getByRole('slider', { name });
    const before = Number(await slider.inputValue());
    await slider.focus(); await slider.press('ArrowRight');
    await expect(slider).toHaveValue(String(before + 1));
  }
  const xray = viewer.getByRole('checkbox', { name: 'Paredes transparentes (ver através)', exact: true });
  const checked = await xray.isChecked();
  await xray.click(); await expect(xray).toBeChecked({ checked: !checked });
  const pending = page.waitForEvent('download');
  await viewer.getByRole('button', { name: '📸 Capturar 1920×1080', exact: true }).click();
  const bytes = await readFile((await (await pending).path())!);
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  expect(bytes.readUInt32BE(16)).toBe(1920); expect(bytes.readUInt32BE(20)).toBe(1080);
  await viewer.getByRole('button', { name: 'Reposicionar', exact: true }).click();
  await expect.poll(async () => (await gpu(page)).filter((item: any) => !item.lost).length).toBe(1);
  await main.click({ position: { x: bounds.width * .45, y: bounds.height * .5 } });
  await expect(preview).toBeVisible();
  await viewer.getByRole('button', { name: 'Fechar câmera', exact: true }).click();
  await expect(preview).toHaveCount(0);
  await expect.poll(async () => (await gpu(page)).filter((item: any) => !item.lost).length).toBe(1);
});
