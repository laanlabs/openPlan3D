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
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  await canvas.click({ position: { x: 300, y: 250 } });
  await page.getByRole('button', { name: 'Toggle Layers Panel', exact: true }).click();
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
});
