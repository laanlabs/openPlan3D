import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) test(`keyboard room rename commits, cancels and restores focus at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  plan.floors[0].rooms[0].name = 'Original {name}';
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'room.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const before = await exported();
  await page.getByRole('button', { name: 'Salvar', exact: true }).press('l');
  await page.getByRole('button', { name: /Original \{name\}/ }).click();
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  const editor = page.locator('input.absolute[aria-label="Nome do ambiente"]');
  async function rename() {
    await canvas.focus(); await canvas.press('Shift+F10');
    await page.keyboard.press('ArrowDown');
    const action = page.getByRole('menuitem', { name: '✏️ Renomear Cômodo', exact: true });
    await expect(action).toBeFocused(); await action.press('Enter');
    await expect(editor).toBeFocused();
  }
  await rename();
  await editor.fill('Discarded name'); await editor.press('Escape');
  await expect(editor).toHaveCount(0); await expect(canvas).toBeFocused();
  expect(await exported()).toEqual(before);
  await rename();
  const save = page.getByRole('button', { name: 'Salvar', exact: true });
  await save.focus();
  await expect(editor).toHaveCount(0); await expect(save).toBeFocused();
  await rename();
  await editor.fill('Meu {name} ambiente'); await editor.press('Enter');
  await expect(editor).toHaveCount(0); await expect(canvas).toBeFocused();
  expect(await exported()).toEqual({ ...before, rooms: before.rooms.map((room: any, index: number) => index === 0 ? { ...room, name: 'Meu {name} ambiente' } : room) });
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await exported()).toEqual(before);
});
