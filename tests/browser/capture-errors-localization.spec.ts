import { expect, test } from '@playwright/test';

test('Portuguese capture import failures keep the editor available', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  const cases = [
    { code: 'bad!', kind: 'invalid', message: 'Código de importação inválido na URL.' },
    { code: 'AB2C', kind: 'network', message: 'Erro de rede ao baixar a captura. Verifique sua conexão e tente novamente.' },
    { code: 'AB2C', kind: 'missing', message: 'O código de captura AB2C não foi encontrado. Ele pode ter expirado — compartilhe novamente pelo app iOS.' },
    { code: 'AB2C', kind: 'http', message: 'Não foi possível baixar a captura (HTTP 503).' },
    { code: 'AB2C', kind: 'json', message: 'A captura baixada não é um JSON válido.' },
    { code: 'AB2C', kind: 'format', message: 'O arquivo baixado não é uma exportação válida do RoomPlan.' },
  ];
  for (const entry of cases) {
    let requests = 0;
    await page.route('https://firebasestorage.googleapis.com/**', async route => {
      requests++;
      if (entry.kind === 'network') await route.abort();
      else await route.fulfill({ status: entry.kind === 'missing' ? 404 : entry.kind === 'http' ? 503 : 200, contentType: 'application/json', body: entry.kind === 'json' ? 'not json' : '{}' });
    });
    await page.goto(`/editor?import=${encodeURIComponent(entry.code)}`);
    await expect(page.getByRole('alert')).toContainText('Falha ao importar captura');
    await expect(page.getByRole('alert')).toContainText(entry.message);
    expect(requests).toBe(entry.kind === 'invalid' ? 0 : 1);
    await page.getByRole('button', { name: 'Dispensar erro', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeVisible();
    await page.unroute('https://firebasestorage.googleapis.com/**');
  }
});
