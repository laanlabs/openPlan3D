import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) test(`keyboard room rename and floor materials preserve focus and Undo at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  plan.floors[0].rooms[0].name = 'Original {name}';
  plan.floors[0].rooms[0].floorTexture = 'none';
  plan.floors[0].rooms[0].labelOffset = { x: 35, y: -20 };
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
  const canvas = page.getByLabel(/^(?:Floor plan editor canvas|Área de edição da planta baixa)$/, { exact: true });
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
  await page.getByRole('button', { name: /Original \{name\}/ }).click();
  await canvas.focus(); await canvas.press('Shift+F10');
  const resetLabel = page.getByRole('menuitem', { name: '↺ Redefinir posição do rótulo', exact: true });
  await expect(resetLabel).toBeFocused(); await resetLabel.press('Enter');
  expect(await exported()).toEqual({ ...before, rooms: before.rooms.map((room: any, index: number) => {
    if (index !== 0) return room;
    const { labelOffset, ...rest } = room;
    return rest;
  }) });
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await exported()).toEqual(before);
  await page.getByRole('button', { name: /Original \{name\}/ }).click();
  await canvas.focus(); await canvas.press('Shift+F10');
  await page.keyboard.press('End');
  const deleteRoom = page.getByRole('menuitem', { name: '🗑️ Excluir Cômodo', exact: true });
  await expect(deleteRoom).toBeFocused(); await deleteRoom.press('Enter');
  expect(await exported()).toEqual({ ...before, rooms: [], walls: [], doors: [], windows: [] });
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await exported()).toEqual(before);
  await page.getByRole('button', { name: /Original \{name\}/ }).click();
  await rename();
  const save = page.getByRole('button', { name: 'Salvar', exact: true });
  await save.focus();
  await expect(editor).toHaveCount(0); await expect(save).toBeFocused();
  await rename();
  await editor.fill('Meu {name} ambiente'); await editor.press('Enter');
  await expect(editor).toHaveCount(0); await expect(canvas).toBeFocused();
  const renamed = { ...before, rooms: before.rooms.map((room: any, index: number) => index === 0 ? { ...room, name: 'Meu {name} ambiente' } : room) };
  expect(await exported()).toEqual(renamed);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await exported()).toEqual(before);
  // Accepting an unchanged name must preserve the redo of the actual rename.
  await rename(); await editor.press('Enter');
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  expect(await exported()).toEqual(renamed);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await exported()).toEqual(before);
  await page.getByRole('button', { name: /Original \{name\}/ }).click();
  await canvas.focus(); await canvas.press('Shift+F10');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  const materialAction = page.getByRole('menuitem', { name: '🎨 Alterar Textura do Piso', exact: true });
  await expect(materialAction).toBeFocused(); await materialAction.press('Enter');
  const materials = page.getByRole('group', { name: 'Material do piso', exact: true });
  await expect(materials.locator(':focus')).toHaveCount(1);
  const oak = materials.getByRole('button', { name: 'Carvalho claro', exact: true });
  await oak.focus(); await oak.press('Enter');
  await expect(oak).toHaveAttribute('aria-pressed', 'true');
  expect(await exported()).toEqual({ ...before, rooms: before.rooms.map((room: any, index: number) => index === 0 ? { ...room, floorTexture: 'light-oak' } : room) });
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await exported()).toEqual(before);
});
