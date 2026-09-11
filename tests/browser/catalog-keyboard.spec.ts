import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const locale of ['en', 'pt']) for (const recent of [false, true]) test(`${locale}: favorites support keyboard without starting placement (${recent ? 'recent' : 'catalog'})`, async ({ page, browserName }) => {
  await page.addInitScript(recent => {
    localStorage.setItem('hasSeenWelcome', 'true');
    if (recent) localStorage.setItem('o3d_recent_furniture', JSON.stringify(['sofa']));
  }, recent);
  await page.addInitScript(locale => localStorage.setItem('o3d_locale', locale), locale);
  await page.goto('/editor');
  await page.getByRole('button', { name: /^(?:Objects|Objetos)$/, exact: true }).click();
  const search = page.getByRole('textbox', { name: locale === 'pt' ? 'Pesquisar móveis...' : 'Search furniture...', exact: true });
  await search.fill('{number}');
  await expect(page.getByText(locale === 'pt' ? '0 resultados para "{number}"' : '0 results for "{number}"', { exact: true })).toBeVisible();
  await page.getByTitle(locale === 'pt' ? 'Limpar pesquisa' : 'Clear search', { exact: true }).click();
  await expect(search).toHaveValue('');
  const canvas = page.getByLabel(/^(?:Floor plan editor canvas|Área de edição da planta baixa)$/, { exact: true });
  const favorite = page.getByRole('button', { name: locale === 'pt' ? 'Adicionar Sofa aos favoritos' : 'Add Sofa to favorites', exact: true }).first();
  await canvas.focus(); await page.keyboard.down('Space');
  await expect(canvas).toHaveCSS('cursor', 'grab');
  await favorite.focus(); await page.keyboard.up('Space');
  await expect(canvas).not.toHaveCSS('cursor', 'grab');
  await favorite.press('Space');
  const selected = page.getByRole('button', { name: locale === 'pt' ? 'Remover Sofa dos favoritos' : 'Remove Sofa from favorites', exact: true }).first();
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(canvas).not.toHaveCSS('cursor', 'copy');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('o3d_favorite_furniture')!))).toEqual(['sofa']);
  // macOS WebKit uses Option+Tab to include buttons when full keyboard access is off.
  await selected.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Shift+Tab' : 'Shift+Tab');
  await expect(page.getByRole('button', { name: /^Sofa(?: Sofa)?(?: 200×90cm)?$/ }).first()).toBeFocused();
  await selected.press('Enter');
  await expect(favorite).toHaveAttribute('aria-pressed', 'false');
  await expect(canvas).not.toHaveCSS('cursor', 'copy');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('o3d_favorite_furniture')!))).toEqual([]);
  // The sibling placement button remains independently keyboard operable.
  await page.getByRole('button', { name: /^Sofa(?: Sofa)?(?: 200×90cm)?$/ }).first().press('Enter');
  await expect(canvas).toHaveCSS('cursor', 'copy');
});

for (const locale of ['en', 'pt']) test(`${locale}: requested annotation editing focuses its named field and context menus fit the viewport`, async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hasSeenWelcome', 'true'));
  await page.addInitScript(locale => localStorage.setItem('o3d_locale', locale), locale);
  await page.goto('/editor');
  await page.getByRole('button', { name: locale === 'pt' ? 'Salvar' : 'Save', exact: true }).press('ControlOrMeta+k');
  await page.getByRole('combobox', { name: locale === 'pt' ? 'Pesquisar comandos' : 'Search commands', exact: true }).fill(locale === 'pt' ? 'Ferramenta de Texto' : 'Text Tool');
  await page.getByRole('option', { name: locale === 'pt' ? /Ferramenta de Texto/ : /Text Tool/ }).click();
  const canvas = page.getByLabel(/^(?:Floor plan editor canvas|Área de edição da planta baixa)$/, { exact: true });
  await canvas.click({ position: { x: 250, y: 250 } });
  const input = page.getByRole('textbox', { name: locale === 'pt' ? 'Texto da anotação' : 'Annotation text', exact: true });
  await expect(input).toBeFocused();
  await input.fill('Keyboard {number} annotation');
  await input.press('Enter');
  await expect(input).toHaveCount(0);
  const bounds = (await canvas.boundingBox())!;
  await canvas.click({ button: 'right', position: { x: bounds.width - 10, y: bounds.height - 40 } });
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect.poll(async () => {
    const box = (await menu.boundingBox())!;
    return box.x >= 0 && box.y >= 0 && box.x + box.width <= 1440 && box.y + box.height <= 900;
  }).toBe(true);
  const items = menu.getByRole('menuitem');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(items.last()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(items.last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(canvas).toBeFocused();
  await canvas.press('Shift+F10');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(menu).toHaveCount(0);
  await expect(canvas).toBeFocused();
  await canvas.press('ContextMenu');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(menu).toHaveCount(0);
  await page.getByRole('button', { name: locale === 'pt' ? 'Salvar' : 'Save', exact: true }).click();
  async function exported() {
    await page.getByRole('button', { name: locale === 'pt' ? 'Exportar' : 'Export', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: locale === 'pt' ? 'Baixar JSON' : 'Download JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  }
  const before = await exported();
  expect(before.floors[0].textAnnotations).toHaveLength(1);
  expect(before.floors[0].textAnnotations[0].text).toBe('Keyboard {number} annotation');
  await page.goto(`/editor?id=${encodeURIComponent(before.id)}`);
  await expect(page.getByRole('button', { name: locale === 'pt' ? 'Salvar' : 'Save', exact: true })).toBeVisible();
  expect((await exported()).floors[0].textAnnotations).toEqual(before.floors[0].textAnnotations);
  await page.getByRole('button', { name: locale === 'pt' ? 'Salvar' : 'Save', exact: true }).press('l');
  await page.getByRole('button', { name: /Keyboard \{number\} annotation/ }).click();
  const panel = page.locator('[data-plan-properties]');
  const text = panel.getByRole('textbox', { name: locale === 'pt' ? 'Texto' : 'Text', exact: true });
  await text.fill('Updated {name}\nSecond line'); await text.press('Tab');
  for (const [label,value] of [[locale === 'pt' ? 'Tamanho da fonte' : 'Font Size','23.5'],[locale === 'pt' ? 'Rotação (°)' : 'Rotation (°)','27.5'],['X','125.5'],['Y','-75.5']]) {
    const field = panel.getByRole('spinbutton', { name: label, exact: true });
    await field.fill(value); await field.press('Tab');
  }
  const edited = await exported();
  expect(edited.floors[0].textAnnotations[0]).toEqual({ ...before.floors[0].textAnnotations[0], text: 'Updated {name}\nSecond line', fontSize: 23.5, rotation: 27.5, x: 125.5, y: -75.5 });

});
