import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Portuguese background controls preserve image bytes and restore removed images', async ({ page }) => {
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  const dataUrl = `data:image/png;base64,${(await readFile('tests/fixtures/item-photo.png')).toString('base64')}`;
  plan.floors[0].backgroundImage = { dataUrl, position: { x: 200, y: 150 }, scale: 1, opacity: .5, rotation: 0, locked: false };
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'background.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  const panel = page.locator('[data-plan-properties]');
  await expect(panel.getByRole('heading', { name: /Imagem de fundo/ })).toBeVisible();
  await expect(panel.getByRole('button', { name: '📏 Definir escala', exact: true })).toBeVisible();
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const original = await exported();
  for (const label of ['Opacidade','Escala']) {
    const slider = panel.getByRole('slider', { name: label, exact: true });
    await slider.focus(); await slider.press('ArrowRight');
  }
  const rotation = panel.getByRole('spinbutton', { name: 'Rotação', exact: true });
  await rotation.fill('27.5'); await rotation.press('Tab');
  await panel.getByRole('button', { name: '🔓 Desbloqueado', exact: true }).click();
  const edited = await exported();
  expect(edited.backgroundImage).toEqual({ ...original.backgroundImage, scale: 1.05, opacity: .55, rotation: 27.5, locked: true });
  for (const key of ['walls','doors','windows','rooms','furniture']) expect(edited[key]).toEqual(original[key]);
  await panel.getByRole('button', { name: 'Remover imagem', exact: true }).click();
  expect((await exported()).backgroundImage).toBeUndefined();
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect((await exported()).backgroundImage).toEqual(edited.backgroundImage);
});
