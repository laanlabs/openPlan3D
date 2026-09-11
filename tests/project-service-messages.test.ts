import { describe, expect, it } from 'vitest';
import { projectServiceMessage } from '../src/lib/i18n/projectServiceMessages';
import { storageErrorMessage, ProjectConflictError } from '../src/lib/services/datastore';
import { translate } from '../src/lib/i18n';
import { prepareLibraryRestore } from '../src/lib/services/libraryRestore';

describe('project service diagnostics', () => {
  it.each([
    ['{', 'backupJSON'], ['[]', 'backupFile'],
    [JSON.stringify({ format: 'openplan3d-library', version: 2 }), 'backupVersion'],
    ...(['projects', 'thumbnails', 'history', 'recovery'] as const).map((field, index) => [
      JSON.stringify({ format: 'openplan3d-library', version: 1, projects: {}, [field]: [] }),
      ['backupProjects', 'backupThumbnails', 'backupHistory', 'backupRecovery'][index],
    ]),
  ])('translates actual backup validation failures: %s', (raw, key) => {
    let message = '';
    try { prepareLibraryRestore(raw); } catch (error) { message = (error as Error).message; }
    expect(message).not.toBe('');
    expect(projectServiceMessage(message, 'en')).toBe(message);
    expect(projectServiceMessage(message, 'pt')).toBe(translate('pt', `projectService.${key}` as Parameters<typeof translate>[1]));
  });

  it('preserves literal repeated keys while translating the actual validation failure', () => {
    const key = '{key}\n<unsafe> “quoted”';
    let message = '';
    try { prepareLibraryRestore(`{${JSON.stringify(key)}:"one",${JSON.stringify(key)}:"two"}`); }
    catch (error) { message = (error as Error).message; }
    expect(projectServiceMessage(message, 'pt')).toBe(`Este backup repete a chave “${key}”. Nenhum projeto foi restaurado.`);
    expect(projectServiceMessage(message, 'en')).toBe(message);
  });

  it('translates empty backup rejection before any database write', async () => {
    const error = await prepareLibraryRestore('{}').restore().catch(error => error as Error);
    expect(error).toBeInstanceOf(Error);
    expect(projectServiceMessage((error as Error).message, 'pt')).toBe('Este backup não contém projetos nem dados de recuperação.');
  });
  it.each(['restore.retry', 'package.retry'] as const)('translates the cause and %s outcome without losing unknown details', key => {
    const cause = storageErrorMessage({ name: 'QuotaExceededError' });
    for (const sourceLocale of ['en', 'pt'] as const) {
      const message = `${cause} ${translate(sourceLocale, key)}`;
      expect(projectServiceMessage(message, 'pt')).toBe(`${translate('pt', 'projectService.storageFull')} ${translate('pt', key)}`);
      expect(projectServiceMessage(message, 'en')).toBe(`${cause} ${translate('en', key)}`);
    }
    expect(projectServiceMessage(`Unknown detail {name}. ${translate('en', key)}`, 'pt'))
      .toBe(`Unknown detail {name}. ${translate('pt', key)}`);
  });
  it('translates real storage failures and keeps the original English diagnostic', () => {
    const quota = storageErrorMessage({ name: 'QuotaExceededError' });
    expect(projectServiceMessage(quota, 'en')).toBe(quota);
    expect(projectServiceMessage(quota, 'pt')).toContain('O armazenamento do navegador está cheio.');
    expect(projectServiceMessage(storageErrorMessage({ name: 'SecurityError' }), 'pt')).toContain('está indisponível');
    expect(projectServiceMessage(storageErrorMessage(null), 'pt')).toContain('Não foi possível salvar');
    expect(projectServiceMessage(new ProjectConflictError().message, 'pt')).toContain('alterado ou excluído em outra aba');
  });

  it('translates the opening wrapper, nested cause and import outcome together', () => {
    const original = `Your current plan could not be saved. ${storageErrorMessage({ name: 'QuotaExceededError' })} No project was imported.`;
    const portuguese = projectServiceMessage(original, 'pt');
    expect(portuguese).toMatch(/^Não foi possível salvar sua planta atual\. O armazenamento/);
    expect(portuguese).toMatch(/Nenhum projeto foi importado\.$/);
    expect(portuguese).not.toMatch(/Your current|Browser storage|No project/);
    expect(projectServiceMessage(original, 'en')).toBe(original);
  });

  it('retains unknown details verbatim inside a translated opening wrapper', () => {
    const detail = 'Unknown database failure: {table} <unsafe> /tmp/plan';
    expect(projectServiceMessage(detail, 'pt')).toBe(detail);
    expect(projectServiceMessage(`Your current plan could not be saved. ${detail}`, 'pt'))
      .toBe(`Não foi possível salvar sua planta atual. ${detail}`);
    expect(projectServiceMessage(`Prefix ${detail} No project was imported. inside text`, 'pt'))
      .toBe(`Prefix ${detail} No project was imported. inside text`);
  });

  it('accepts the welcome screen outcome in either language without duplicating it', () => {
    const original = 'Could not read this file. Nenhum projeto foi importado.';
    expect(projectServiceMessage(original, 'en')).toBe('Could not read this file. No project was imported.');
    expect(projectServiceMessage(original, 'pt')).toBe('Não foi possível ler este arquivo. Nenhum projeto foi importado.');
  });
});
