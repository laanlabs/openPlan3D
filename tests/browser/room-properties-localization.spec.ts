import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Portuguese room properties retain names, geometry and material IDs', async ({ page }) => {
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  plan.floors[0].rooms[0].name = 'Original {name}';
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'room.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  await expect(page.getByRole('button', { name: plan.name, exact: true })).toBeVisible();
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const original = await exported();
  await page.getByRole('button', { name: 'Salvar', exact: true }).press('l');
  await page.getByRole('button', { name: /Original \{name\}/ }).click();
  const panel = page.locator('[data-plan-properties]');
  await expect(panel.getByRole('heading', { name: /Propriedades do ambiente/ })).toBeVisible();
  const name = panel.getByRole('textbox', { name: 'Nome do ambiente', exact: true });
  await expect(name).toHaveValue('Original {name}');
  await panel.getByRole('combobox', { name: 'Tipo de ambiente', exact: true }).selectOption('bedroom');
  await expect(name).toHaveValue('Bedroom'); // Existing stored preset name stays stable.
  await name.fill('Meu {name} ambiente'); await name.press('Tab');
  await panel.getByRole('combobox', { name: 'Categoria', exact: true }).selectOption('outdoor');
  await panel.getByRole('button', { name: 'Carvalho claro', exact: true }).click();
  await panel.getByRole('button', { name: 'Verde sálvia', exact: true }).click();
  await panel.getByRole('checkbox', { name: 'Aberto para o andar inferior', exact: true }).check();
  const edited = await exported();
  const room = edited.rooms.find((room: any) => room.id === original.rooms[0].id);
  expect(room).toMatchObject({ name: 'Meu {name} ambiente', roomType: 'outdoor', floorTexture: 'light-oak', color: '#d4e2d4', floorOpening: true });
  expect(room.walls).toEqual(original.rooms[0].walls);
  for (const key of ['walls','doors','windows','furniture']) expect(edited[key]).toEqual(original[key]);
  await panel.getByRole('checkbox', { name: 'Aberto para o andar inferior', exact: true }).uncheck();
  const restored = await exported();
  expect(restored.rooms.find((candidate: any) => candidate.id === room.id)?.floorOpening).toBe(false);

  const details = page.getByRole('region', { name: 'Detalhes do item', exact: true });
  await details.getByRole('combobox', { name: 'Uso do ambiente', exact: true }).selectOption({ label: 'Despensa' });
  const ceiling = details.getByRole('spinbutton', { name: 'Pé-direito do ambiente (cm)', exact: true });
  await ceiling.fill('275.5'); await ceiling.press('Tab');
  const metadata = await exported();
  expect(metadata.rooms.find((candidate: any) => candidate.id === room.id).details).toMatchObject({ roomType: 'pantry', ceilingHeight: 275.5 });
  expect(metadata.walls).toEqual(restored.walls);
});
