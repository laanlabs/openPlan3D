import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { savedProjects, storedRecords } from './storage';

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
    const before = await storedRecords(page);
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
    await dialog.getByRole('button', { name: flow.confirm, exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText(flow.success);
    await expect(dialog.getByRole('button', { name: flow.confirm, exact: true })).toHaveCount(0);
    expect(Object.keys(await savedProjects(page))).toHaveLength(1);
    await dialog.getByRole('button', { name: 'Concluir', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });
}
