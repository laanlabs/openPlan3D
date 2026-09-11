import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) for (const kind of ['door', 'window'] as const) test(`keyboard ${kind} Properties focuses editing and preserves Undo at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'properties.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const before = await exported();
  await page.getByRole('button', { name: 'Salvar', exact: true }).press('l');
  await page.getByRole('button', { name: kind === 'door' ? '🚪 Porta aberta 1' : /^🪟 Janela .* 1$/, exact: true }).click();
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  await canvas.focus();
  await canvas.press('Shift+F10');
  const properties = page.getByRole('menuitem', { name: '⚙️ Propriedades', exact: true });
  await expect(properties).toBeFocused();
  await properties.press('Enter');
  await expect(page.getByRole('menu')).toHaveCount(0);
  const panel = page.locator('[data-plan-properties]');
  await expect(panel.locator(':focus')).toHaveCount(1);
  const widthField = panel.getByRole('spinbutton', { name: 'Largura (cm)', exact: true });
  await widthField.fill('75'); await widthField.press('Tab');
  const edited = await exported();
  const key = kind === 'door' ? 'doors' : 'windows';
  expect(edited).toEqual({ ...before, [key]: before[key].map((opening: any, index: number) => index === 0 ? { ...opening, width: 75 } : opening) });
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await exported()).toEqual(before);
});
