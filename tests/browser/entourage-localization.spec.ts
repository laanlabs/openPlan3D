import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Portuguese presentation symbols retain their IDs and sizes through placement and undo', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objetos', exact: true }).click();
  for (const name of ['Pessoa','Duas pessoas','Sedã','SUV','Picape','Árvore caducifólia','Conífera','Arbusto','Cerca viva','Planta em vaso','Grama','Ombrelone']) {
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(1);
  }
  const person = page.getByRole('button', { name: 'Pessoa', exact: true });
  await expect(person).toHaveAttribute('title', 'Pessoa (55 cm) — clique na planta para posicionar; Shift+clique para inserir vários');
  await person.click();
  const canvas = page.getByLabel(/^(?:Floor plan editor canvas|Área de edição da planta baixa)$/, { exact: true });
  await canvas.click({ position: { x: 300, y: 250 } });
  await page.getByRole('button', { name: 'Alternar painel de camadas', exact: true }).click();
  await expect(page.getByRole('button', { name: '🌳 Pessoa', exact: true })).toBeVisible();
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const placed = await exported();
  expect(placed.entourage).toHaveLength(1);
  expect(placed.entourage[0]).toMatchObject({ defId: 'person', width: 55 });
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect((await exported()).entourage ?? []).toHaveLength(0);
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  await page.getByRole('button', { name: '🌳 Pessoa', exact: true }).click();
  const panel = page.locator('[data-plan-properties]');
  await expect(panel.getByText('Pessoa', { exact: true })).toBeVisible();
  const width = panel.getByRole('spinbutton', { name: 'Largura (cm)', exact: true });
  await width.fill('72.5'); await width.press('Tab');
  const rotation = panel.getByRole('spinbutton', { name: 'Rotação (°)', exact: true });
  await rotation.fill('27.5'); await rotation.press('Tab');
  const opacity = panel.getByRole('slider', { name: 'Opacidade (100%)', exact: true });
  await opacity.focus(); await opacity.press('ArrowLeft');
  await expect(panel.getByRole('slider', { name: 'Opacidade (95%)', exact: true })).toHaveValue('0.95');
  await panel.getByRole('button', { name: '🔓 Desbloqueado', exact: true }).click();
  const edited = (await exported()).entourage[0];
  expect(edited).toEqual({ ...placed.entourage[0], width: 72.5, rotation: 27.5, opacity: 0.95, locked: true });
  await panel.getByRole('button', { name: '🔒 Bloqueado', exact: true }).click();
  await panel.getByRole('button', { name: 'Excluir', exact: true }).click();
  expect((await exported()).entourage ?? []).toHaveLength(0);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect((await exported()).entourage[0]).toEqual({ ...edited, locked: false });

});
