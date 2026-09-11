import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Portuguese print controls preserve paper, scale validation and PDF export', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('o3d_locale', 'pt');
    (window as any).printedLabels = [];
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
      if (text.startsWith('Escala:') || text.startsWith('OpenPlan3D')) (window as any).printedLabels.push(text);
      if (maxWidth === undefined) fillText.call(this, text, x, y);
      else fillText.call(this, text, x, y, maxWidth);
    };
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/editor');
  await page.getByRole('button', { name: /^(?:Export|Exportar)$/, exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /^(?:Import\ JSON|Importar\ JSON)$/, exact: true }).click();
  await (await chooser).setFiles('tests/fixtures/connected-dimensions.openplan.json');
  await expect(page.getByRole('application')).toContainText('1 room');
  await page.getByRole('button', { name: /^(?:Export|Exportar)$/, exact: true }).click();
  await page.getByRole('button', { name: 'Layout de impressão', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Prévia de impressão', exact: true });
  await dialog.getByRole('combobox', { name: 'Papel:', exact: true }).selectOption('a4');
  await dialog.getByRole('combobox', { name: 'Orientação:', exact: true }).selectOption('portrait');
  await dialog.getByRole('combobox', { name: 'Escala:', exact: true }).selectOption('25');
  await expect(dialog.getByRole('alert')).toContainText('A planta não cabe nesta escala.');
  await expect(dialog.getByRole('button', { name: 'Baixar PDF', exact: true })).toBeDisabled();
  await dialog.getByRole('combobox', { name: 'Escala:', exact: true }).selectOption('fit');
  const download = dialog.getByRole('button', { name: 'Baixar PDF', exact: true });
  await expect(download).toBeEnabled();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  const canvas = dialog.getByLabel('Prévia de impressão da planta', { exact: true });
  const ratio = await canvas.evaluate(node => (node as HTMLCanvasElement).width / (node as HTMLCanvasElement).height);
  expect(ratio).toBeCloseTo(210 / 297, 2);
  const downloading = page.waitForEvent('download');
  await download.click();
  const file = await downloading;
  const bytes = await readFile((await file.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(bytes.length).toBeGreaterThan(1000);
  expect(bytes.toString('latin1')).toContain('Tabela de ambientes');
  const printed = await page.evaluate(() => (window as any).printedLabels as string[]);
  expect(printed).toContain('Escala: Ajustar à página');
  expect(printed.some(text => text.includes('Imprima em 100%'))).toBe(true);
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
