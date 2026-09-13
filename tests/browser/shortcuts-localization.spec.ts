import { expect, test } from '@playwright/test';

test('Portuguese shortcut help copies localized labels and supports keyboard dismissal', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('o3d_locale', 'pt');
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => { (window as any).__copiedShortcuts = text; } } });
  });
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Salvar', exact: true }).press('?');
  const dialog = page.getByRole('dialog', { name: 'Atalhos de teclado', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Ferramenta de parede', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Copiar todos os atalhos', exact: true }).click();
  const copied = await page.evaluate(() => (window as any).__copiedShortcuts as string);
  expect(copied).toContain('Atalhos de teclado — Open3D Floorplan');
  expect(copied).toMatch(/W\s+Ferramenta de parede/);
  expect(copied).toMatch(/Ctrl\+Z\s+Desfazer/);
  expect(copied).toContain('Clique duplo Finalizar sequência de paredes');
  expect(copied).not.toContain('Select tool');
  await dialog.getByRole('button', { name: 'Fechar atalhos', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Atalhos de teclado', exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('clipboard denial reports a recoverable shortcut copy failure', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('o3d_locale', 'pt');
    (window as any).denyCopy = true;
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => {
      if ((window as any).denyCopy) throw new DOMException('Denied', 'NotAllowedError');
      (window as any).__copiedShortcuts = text;
    } } });
  });
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Atalhos de teclado', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Atalhos de teclado', exact: true });
  const copy = dialog.getByRole('button', { name: 'Copiar todos os atalhos', exact: true });
  await copy.click();
  await expect(dialog.getByRole('status')).toHaveText('Não foi possível copiar os atalhos. Tente novamente.');
  expect(errors).toEqual([]);
  await page.evaluate(() => { (window as any).denyCopy = false; });
  await copy.click();
  await expect(dialog.getByRole('status')).toHaveText('Atalhos copiados.');
  expect(await page.evaluate(() => (window as any).__copiedShortcuts)).toContain('Atalhos de teclado');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Atalhos de teclado', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveCount(0);
  await page.evaluate(() => { navigator.clipboard.writeText = () => new Promise<void>(resolve => { (window as any).finishCopy = resolve; }); });
  await copy.click();
  await expect(copy).toBeDisabled();
  await expect(dialog.getByRole('status')).toHaveText('Copiando atalhos…');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Atalhos de teclado', exact: true }).click();
  await page.evaluate(async () => { (window as any).finishCopy(); await Promise.resolve(); });
  await expect(dialog.getByRole('status')).toHaveCount(0);
  await expect(copy).toBeEnabled();
  expect(errors).toEqual([]);
});
