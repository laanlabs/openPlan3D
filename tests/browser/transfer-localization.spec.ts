import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { failProjectWrites, savedProjects, storedRecords } from './storage';
import { readPackageZip, writePackageZip } from '../../src/lib/utils/projectPackageZip';

test('Portuguese package rejection leaves saved records unchanged and allows another file', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenWelcome', 'true');
    localStorage.setItem('o3d_locale', 'pt');
  });
  await page.goto('/');
  await expect(page.getByText('Nenhum projeto ainda', { exact: true })).toBeVisible();
  const before = await storedRecords(page);
  await page.getByRole('button', { name: 'Importar pacote de projeto', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Importar pacote de projeto', exact: true });
  const missingAttachment = readPackageZip(await readFile('tests/fixtures/native-project-package.zip'));
  delete missingAttachment['assets/chair.png'];
  for (const [buffer, message] of [
    [Buffer.from('invalid'), 'O arquivo deve ser um pacote ZIP com menos de 64 MiB.'],
    [Buffer.alloc(22), 'Estrutura ZIP incompatível. Exporte um novo pacote de projeto do OpenPlan3D.'],
    [Buffer.from(writePackageZip(missingAttachment)), 'Anexo ausente: chair.png.'],
  ] as const) {
    const chooser = page.waitForEvent('filechooser');
    await dialog.getByRole('button', { name: 'Escolher pacote de projeto', exact: true }).click();
    await (await chooser).setFiles({ name: 'invalid.zip', mimeType: 'application/zip', buffer });
    await expect(dialog.getByRole('alert')).toHaveText(`Pacote de projeto inválido: ${message}`);
    await expect(dialog.getByRole('button', { name: 'Importar como cópia', exact: true })).toBeDisabled();
    expect(await storedRecords(page)).toEqual(before);
  }
  const chooser = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: 'Escolher pacote de projeto', exact: true }).click();
  const retainedImage = readPackageZip(await readFile('tests/fixtures/native-project-package.zip'));
  retainedImage['assets/chair.png'] = new Uint8Array([1, 2, 3]);
  const retainedBytes = Buffer.from(writePackageZip(retainedImage));
  await (await chooser).setFiles({ name: 'retained-image.zip', mimeType: 'application/zip', buffer: retainedBytes });
  await expect(dialog).toContainText('arquivos anexos');
  await expect(dialog).toContainText('Fotos, notas dos itens e custos acompanham este pacote');
  await expect(dialog).toContainText('O formato da imagem de referência é mantido para o iPhone, mas não pode ser visualizado aqui.');
  await expect(dialog).not.toContainText('Photos, item notes and costs');
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  const downloading = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Baixar pacote original', exact: true }).click();
  expect((await readFile((await (await downloading).path())!)).equals(retainedBytes)).toBe(true);
  await dialog.getByRole('button', { name: 'Importar como cópia', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Projeto importado.');
  const saved = Object.values(await savedProjects(page));
  expect(saved).toHaveLength(1);
  expect((saved[0] as any).projectPackage.assets['assets/chair.png']).toBe('AQID');
});

test('Portuguese recovery preview explains damage and preserves the backup', async ({ page }) => {
  const data = JSON.parse(await readFile('tests/fixtures/library-backup.json', 'utf8'));
  const id = Object.keys(data.projects)[0];
  data.projects = { [id]: data.projects[id] };
  data.projects['damaged {name}'] = '{';
  data.history = { [id]: JSON.stringify([{ data: 'broken' }]) };
  data.thumbnails = { [id]: 'unsupported', missing: 'retained thumbnail' };
  const raw = JSON.stringify(data);
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenWelcome', 'true');
    localStorage.setItem('o3d_locale', 'pt');
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await expect(page.getByText('Nenhum projeto ainda', { exact: true })).toBeVisible();
  const before = await storedRecords(page);
  await page.getByRole('button', { name: 'Restaurar backup da biblioteca', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Restaurar backup da biblioteca', exact: true });
  const chooser = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: 'Escolher arquivo de backup', exact: true }).click();
  await (await chooser).setFiles({ name: 'mixed.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
  for (const message of [
    '1 projeto danificado será mantido para recuperação em vez de ser aberto.',
    'Os anexos de 1 projeto ausente serão mantidos para recuperação.',
    '1 arquivo de recuperação será incluído nos próximos backups da biblioteca.',
    '1 versão danificada mantida para recuperação.',
    'Imagem de prévia incompatível mantida para recuperação.',
    'Este projeto salvo não contém JSON legível.',
    'damaged {name}',
  ]) await expect(dialog).toContainText(message);
  expect(await storedRecords(page)).toEqual(before);
  const downloading = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Baixar backup original', exact: true }).click();
  expect(await readFile((await (await downloading).path())!, 'utf8')).toBe(raw);
  await dialog.getByRole('button', { name: 'Restaurar como cópias', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('1 projeto restaurado.');
  expect(Object.keys(await savedProjects(page))).toHaveLength(1);
  const meta = await storedRecords(page, 'meta');
  const archives = Object.values(meta).filter((value): value is string => typeof value === 'string' && value.includes('openplan3d-recovery'));
  expect(archives).toHaveLength(1);
  const archive = JSON.parse(archives[0]);
  expect(archive.projects['damaged {name}']).toBe('{');
  expect(archive.history[id]).toBe(data.history[id]);
  expect(archive.thumbnails).toEqual(data.thumbnails);
});

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
