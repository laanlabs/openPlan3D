import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) test(`Portuguese layers preserve visibility, selection and source text at ${width}px`, async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.setViewportSize({ width, height: 900 });
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  plan.floors[0].textAnnotations = [{ id: 'literal-note', x: 0, y: 0, text: 'Original {number} note', fontSize: 20, rotation: 0, color: '#123456' }];
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'layers.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  await expect(page.getByRole('application')).toContainText('walls');
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  }
  const before = await exported();
  if (width < 768) {
    const visibility = page.getByRole('button', { name: '🗂 Camadas', exact: true });
    await visibility.click();
    const walls = page.getByRole('checkbox', { name: 'Paredes', exact: true });
    await expect(walls).toBeChecked();
    await walls.click();
    await expect(walls).not.toBeChecked();
    await walls.click();
    await expect(page.getByRole('checkbox', { name: 'Pavimento abaixo', exact: true })).toBeDisabled();
    const labels = page.getByRole('checkbox', { name: 'Nomes dos ambientes', exact: true });
    const wasChecked = await labels.isChecked();
    await labels.click();
    await expect(labels).toBeChecked({ checked: !wasChecked });
    await labels.click();
    await visibility.click();
    await expect(walls).toHaveCount(0);

    await page.getByRole('button', { name: 'Mais ações', exact: true }).click();
    await page.getByRole('button', { name: 'Camadas', exact: true }).click();
  } else await page.getByRole('button', { name: 'Toggle Layers Panel', exact: true }).click();
  await expect(page.locator('div').filter({ hasText: /^🗂 Camadas$/ })).toBeVisible();
  const hide = page.getByTitle('Ocultar Paredes', { exact: true });
  await hide.focus();
  await page.keyboard.press('Space');
  await expect(page.getByTitle('Mostrar Paredes', { exact: true })).toBeVisible();
  const wall = page.getByRole('button', { name: /Parede 1$/, exact: false });
  await wall.click();
  await expect(hide).toBeVisible();
  await expect(wall).toHaveClass(/bg-blue-100/);
  const note = page.getByRole('button', { name: 'T Nota 1 (Original {number} note)', exact: true });
  await note.click();
  await expect(note).toHaveClass(/bg-blue-100/);
  const after = await exported();
  expect(after.floors).toEqual(before.floors);
  expect(after.floors[0].textAnnotations[0].text).toBe('Original {number} note');
});
