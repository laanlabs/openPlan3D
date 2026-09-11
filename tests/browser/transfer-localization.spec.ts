import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { failProjectWrites, savedProjects, storedRecords } from './storage';

test('Portuguese backup rejection preserves each original file and saved records', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenWelcome', 'true');
    localStorage.setItem('o3d_locale', 'pt');
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await expect(page.getByText('Nenhum projeto ainda', { exact: true })).toBeVisible();
  const before = await storedRecords(page);
  const history = await storedRecords(page, 'history');
  await page.getByRole('button', { name: 'Restaurar backup da biblioteca', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Restaurar backup da biblioteca', exact: true });
  for (const [raw, message] of [
    ['{broken', 'Este backup não contém JSON legível.'],
    ['{"format":"openplan3d-library","version":2}', 'Esta versão do backup da biblioteca não é compatível.'],
    ['{"{key}<unsafe>":"a","{key}<unsafe>":"b"}', 'Este backup repete a chave “{key}<unsafe>”.'],
  ]) {
    const chooser = page.waitForEvent('filechooser');
    await dialog.getByRole('button', { name: 'Escolher arquivo de backup', exact: true }).click();
    await (await chooser).setFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
    await expect(dialog.getByRole('alert')).toHaveText(`${message} Nenhum projeto foi restaurado.`);
    await expect(dialog.getByRole('button', { name: 'Restaurar como cópias', exact: true })).toBeDisabled();
    const downloading = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Baixar backup original', exact: true }).click();
    expect(await readFile((await (await downloading).path())!, 'utf8')).toBe(raw);
    expect(await storedRecords(page)).toEqual(before);
    expect(await storedRecords(page, 'history')).toEqual(history);
  }
});

for (const flow of [
  { title: 'Restaurar backup da biblioteca', choose: 'Escolher arquivo de backup', original: 'Baixar backup original', confirm: 'Restaurar como cópias', success: '1 projeto restaurado.', file: 'tests/fixtures/library-backup.json', preview: '1 projeto pronto para restaurar' },
  { title: 'Importar pacote de projeto', choose: 'Escolher pacote de projeto', original: 'Baixar pacote original', confirm: 'Importar como cópia', success: 'Projeto importado.', file: 'tests/fixtures/native-project-package.zip', preview: 'arquivos anexos' },
]) {
  test(`Portuguese transfer preserves original bytes and requires confirmation: ${flow.title}`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenWelcome', 'true');
      localStorage.setItem('o3d_locale', 'pt');
    });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/');
    await expect(page.getByText('Nenhum projeto ainda', { exact: true })).toBeVisible();
    const before = await storedRecords(page);
    const historyBefore = await storedRecords(page, 'history');
    await page.getByRole('button', { name: flow.title, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: flow.title, exact: true });
    const chooser = page.waitForEvent('filechooser');
    await dialog.getByRole('button', { name: flow.choose, exact: true }).click();
    await (await chooser).setFiles(flow.file);
    await expect(dialog).toContainText(flow.preview);
    expect(await storedRecords(page)).toEqual(before);
    const downloading = page.waitForEvent('download');
    await dialog.getByRole('button', { name: flow.original, exact: true }).click();
    const original = await readFile((await (await downloading).path())!);
    expect(original.equals(await readFile(flow.file))).toBe(true);
    await failProjectWrites(page);
    await dialog.getByRole('button', { name: flow.confirm, exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('O armazenamento do navegador está cheio.');
    await expect(dialog.getByRole('alert')).toContainText('Você pode tentar novamente.');
    await expect(dialog.getByRole('alert')).not.toContainText('Browser storage');
    expect(await storedRecords(page)).toEqual(before);
    expect(await storedRecords(page, 'history')).toEqual(historyBefore);
    const retainedDownload = page.waitForEvent('download');
    await dialog.getByRole('button', { name: flow.original, exact: true }).click();
    expect((await readFile((await (await retainedDownload).path())!)).equals(original)).toBe(true);
    await page.evaluate(() => { (window as any).failProjectWrites = false; });
    await dialog.getByRole('button', { name: flow.confirm, exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText(flow.success);
    await expect(dialog.getByRole('button', { name: flow.confirm, exact: true })).toHaveCount(0);
    expect(Object.keys(await savedProjects(page))).toHaveLength(1);
    await dialog.getByRole('button', { name: 'Concluir', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });
}
