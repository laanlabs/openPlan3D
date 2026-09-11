import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('symbol upload reports invalid images and recovers without changing prior project data', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Objetos', exact: true }).click();
  async function upload(buffer: Buffer) {
    const pending = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: '+ Enviar símbolo (PNG, JPEG, WebP)', exact: true }).click();
    await (await pending).setFiles({ name: 'Original {name}.png', mimeType: 'image/png', buffer });
  }
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  }
  const before = await exported();
  await upload(Buffer.from('not an image'));
  await expect(page.getByRole('alert')).toContainText('Não foi possível abrir esta imagem.');
  let after = await exported();
  expect(after.floors).toEqual(before.floors);
  expect(after.customEntourage).toEqual(before.customEntourage);
  await upload(Buffer.alloc(2 * 1024 * 1024 + 1));
  await expect(page.getByRole('alert')).toHaveText('Imagem muito grande (máximo de 2 MB)');
  const bytes = await readFile('tests/fixtures/item-photo.png');
  await upload(bytes);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Original \{name\}/ })).toBeVisible();
  after = await exported();
  expect(after.floors).toEqual(before.floors);
  expect(after.customEntourage).toHaveLength(1);
  expect(after.customEntourage[0].name).toBe('Original {name}');
  expect(after.customEntourage[0].dataUrl).toBe(`data:image/png;base64,${bytes.toString('base64')}`);
});
