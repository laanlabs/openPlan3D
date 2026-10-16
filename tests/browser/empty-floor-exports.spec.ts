import { expect, test } from '@playwright/test';

// Every 2D export of an empty floor explains why nothing downloaded, from the Export menu and the command palette.
for (const locale of ['en', 'pt'] as const) test(`${locale}: empty-floor PNG, SVG, DXF, DWG and PDF exports show a notice and download nothing`, async ({ page }) => {
  const pt = locale === 'pt';
  await page.addInitScript(locale => {
    localStorage.setItem('o3d_locale', locale);
    localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door']));
  }, locale);
  // A new project opens on an empty Ground Floor.
  await page.goto('/editor');
  await expect(page.getByRole('application')).toContainText(pt ? '0 paredes' : '0 walls');
  let downloads = 0;
  page.on('download', () => downloads++);
  const notice = page.getByRole('alert');
  async function expectEmptyNotice(title: string, format: string) {
    await expect(notice).toContainText(title);
    await expect(notice).toContainText(pt ? `ao piso ativo antes de exportar um ${format}.` : `to the active floor before exporting ${format === 'SVG' ? 'an' : 'a'} ${format}.`);
    await page.getByRole('button', { name: pt ? 'Fechar aviso de exportação' : 'Dismiss export notice', exact: true }).click();
    await expect(notice).toHaveCount(0);
  }
  const menuItems: [item: string, title: string, format: string][] = pt ? [
    ['Exportar 2D como PNG', 'Não foi possível exportar o PNG 2D', 'PNG'],
    ['Exportar como SVG', 'Não foi possível exportar o SVG', 'SVG'],
    ['Exportar como DXF', 'Não foi possível exportar o DXF', 'DXF'],
    ['Exportar como DWG', 'Não foi possível exportar o DWG', 'DWG'],
    ['Exportar como PDF', 'Não foi possível exportar o PDF', 'PDF'],
  ] : [
    ['Export 2D as PNG', "Couldn't export 2D PNG", 'PNG'],
    ['Export as SVG', "Couldn't export SVG", 'SVG'],
    ['Export as DXF', "Couldn't export DXF", 'DXF'],
    ['Export as DWG', "Couldn't export DWG", 'DWG'],
    ['Export as PDF', "Couldn't export PDF", 'PDF'],
  ];
  for (const [item, title, format] of menuItems) {
    await page.getByRole('button', { name: pt ? 'Exportar' : 'Export', exact: true }).click();
    await page.getByRole('button', { name: item, exact: true }).click();
    await expectEmptyNotice(title, format);
  }
  // The command palette's SVG and DXF commands report the same outcome.
  for (const format of ['SVG', 'DXF']) {
    await page.getByRole('button', { name: pt ? 'Salvar' : 'Save', exact: true }).press('ControlOrMeta+k');
    await page.getByRole('combobox', { name: pt ? 'Pesquisar comandos' : 'Search commands', exact: true }).fill(`${pt ? 'Exportar' : 'Export'} ${format}`);
    await page.keyboard.press('Enter');
    await expectEmptyNotice(pt ? `Não foi possível exportar o ${format}` : `Couldn't export ${format}`, format);
  }
  expect(downloads).toBe(0);
});
