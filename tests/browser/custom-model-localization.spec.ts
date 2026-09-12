import { expect, test } from '@playwright/test';

test.setTimeout(180_000);
test('Portuguese model controls retain user names and explain invalid sources and placed-model removal', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('o3d_locale', 'pt');
    localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door']));
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (text === 'Mesa {modelo}') (window as any).__customModelCaption = text;
      return maxWidth === undefined ? original.call(this, text, x, y) : original.call(this, text, x, y, maxWidth);
    };
  });
  const external: string[] = [], errors: string[] = [];
  page.on('request', request => { if (request.url().includes('example.invalid')) external.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objetos', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Meus modelos 3D', exact: true });
  await panel.locator('input[type=file]').setInputFiles('tests/fixtures/local-model-textured-box.glb');
  const dialog = page.getByRole('dialog', { name: 'Importar modelo GLB', exact: true });
  await expect(dialog.locator('canvas')).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Nome do modelo', exact: true }).fill('Mesa {modelo}');
  await dialog.getByRole('textbox', { name: 'URL de origem (opcional)', exact: true }).fill('file:///model.glb');
  await dialog.getByRole('button', { name: 'Adicionar ao projeto', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Modelo personalizado inválido: use uma URL de origem pública HTTP ou HTTPS.');
  await dialog.getByRole('textbox', { name: 'URL de origem (opcional)', exact: true }).fill('https://example.invalid/original');
  await dialog.getByRole('button', { name: 'Adicionar ao projeto', exact: true }).click();
  await expect(dialog).toBeHidden();
  await panel.getByRole('button', { name: 'Inserir no centro da visualização', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Propriedades de Mesa \{modelo\}/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__customModelCaption)).toBe('Mesa {modelo}');
  await panel.getByRole('button', { name: 'Remover modelo', exact: true }).click();
  await page.getByRole('dialog', { name: 'Remover modelo', exact: true }).getByRole('button', { name: 'Remover modelo', exact: true }).click();
  await expect(panel.getByRole('alert')).toHaveText('Remova os móveis que usam este modelo antes de remover sua definição.');
  await expect(panel.getByText('Mesa {modelo}', { exact: true })).toBeVisible();
  await testInfo.attach('custom-model-portuguese', { body: await page.screenshot(), contentType: 'image/png' });
  expect(external).toEqual([]); expect(errors).toEqual([]);
});
