import { describe, expect, it } from 'vitest';
import { projectServiceMessage } from '../src/lib/i18n/projectServiceMessages';
import { storageErrorMessage, ProjectConflictError } from '../src/lib/services/datastore';
import { translate } from '../src/lib/i18n';
import { prepareLibraryRestore } from '../src/lib/services/libraryRestore';
import { readFileSync } from 'node:fs';
import { packageJSON, readPackageZip, writePackageZip } from '../src/lib/utils/projectPackageZip';
import { readProjectPackage, PACKAGE_NOTICE } from '../src/lib/services/projectPackage';
import { validatePackagePlan, validatePackageMapping } from '../src/lib/utils/projectPackageBridge';
import { readProject } from '../src/lib/utils/projectValidation';

describe('project service diagnostics', () => {
  it.each([
    [null, 'document deve ser um objeto.'],
    [{ id: '' }, 'id deve ser um texto não vazio.'],
    [{ id: 'project', name: 4 }, 'name deve ser um texto.'],
    [{ id: 'project', floors: [] }, 'floors deve conter pelo menos um andar.'],
    [{ id: 'project', floors: {} }, 'document.floors deve ser uma lista.'],
    [{ id: 'project', floors: [{ id: 'floor', level: 1.5 }] }, 'floors[0].level deve ser um número inteiro.'],
    [{ id: 'project', attachmentNames: { '{path}\n<unsafe>': false } }, 'attachmentNames.{path}\n<unsafe> deve ser um texto.'],
  ])('translates actual project field errors while preserving paths: %j', (value, expected) => {
    let message = '';
    try { readProject(value); } catch (error) { message = (error as Error).message; }
    expect(projectServiceMessage(message, 'pt')).toBe(`Projeto inválido: ${expected}`);
    expect(projectServiceMessage(message, 'en')).toBe(message);
    expect(projectServiceMessage(`${message} No project was imported.`, 'pt')).toBe(`Projeto inválido: ${expected} Nenhum projeto foi importado.`);
  });
  it.each([
    [() => validatePackagePlan({ walls: [{}] }), 'A planta editada no iPhone contém geometria ou referências inválidas.'],
    [() => validatePackageMapping({}), 'Mapa de identificadores inválido.'],
    [() => validatePackageMapping(Array(2).fill({ id: '00000000-0000-4000-8000-000000000001', kind: 'walls', floorId: 'floor', webId: 'wall' })), 'Identificador mapeado duplicado.'],
  ] as const)('translates native bridge validation errors: %s', (validate, expected) => {
    let message = '';
    try { validate(); } catch (error) { message = (error as Error).message; }
    expect(projectServiceMessage(message, 'pt')).toBe(`Pacote de projeto inválido: ${expected}`);
    expect(projectServiceMessage(message, 'en')).toBe(message);
  });
  it.each(['missing', 'unknown'] as const)('translates actual %s attachment/file errors', kind => {
    const files = readPackageZip(readFileSync('tests/fixtures/native-project-package.zip'));
    if (kind === 'missing') delete files['assets/chair.png'];
    else files['unknown.json'] = new TextEncoder().encode('{}');
    let message = '';
    try { readProjectPackage(writePackageZip(files)); } catch (error) { message = (error as Error).message; }
    expect(projectServiceMessage(message, 'pt')).toBe(kind === 'missing'
      ? 'Pacote de projeto inválido: Anexo ausente: chair.png.'
      : 'Pacote de projeto inválido: Arquivo de pacote não reconhecido: unknown.json.');
    expect(projectServiceMessage(message, 'en')).toBe(message);
  });

  it('translates real preview notices while retaining unsupported image bytes', () => {
    const files = readPackageZip(readFileSync('tests/fixtures/native-project-package.zip'));
    files['assets/chair.png'] = new Uint8Array([1, 2, 3]);
    const preview = readProjectPackage(writePackageZip(files));
    expect(preview.warnings).toContain(PACKAGE_NOTICE);
    expect(preview.warnings.map(message => projectServiceMessage(message, 'pt'))).toEqual([
      translate('pt', 'projectService.packageNotice'),
      'O formato da imagem de referência é mantido para o iPhone, mas não pode ser visualizado aqui.',
    ]);
    for (const message of preview.warnings) expect(projectServiceMessage(message, 'en')).toBe(message);
    expect((preview.project as any).projectPackage.assets['assets/chair.png']).toBe('AQID');
  });
  it.each([
    [() => readPackageZip(new Uint8Array()), 'O arquivo deve ser um pacote ZIP com menos de 64 MiB.'],
    [() => readPackageZip(new Uint8Array(22)), 'Estrutura ZIP incompatível. Exporte um novo pacote de projeto do OpenPlan3D.'],
    [() => packageJSON(undefined), 'Documento JSON ausente ou grande demais.'],
    [() => packageJSON(new TextEncoder().encode('{')), 'Um documento JSON está ilegível.'],
    [() => packageJSON(new TextEncoder().encode('{"a":1,"a":2}')), 'Um documento JSON contém chaves duplicadas.'],
    [() => packageJSON(new TextEncoder().encode('[]')), 'Era esperado um objeto JSON.'],
  ] as const)('translates package reader errors: %s', (read, expected) => {
    let message = '';
    try { read(); } catch (error) { message = (error as Error).message; }
    expect(projectServiceMessage(message, 'pt')).toBe(`Pacote de projeto inválido: ${expected}`);
    expect(projectServiceMessage(message, 'en')).toBe(message);
  });

  it('retains the damaged package filename and unknown details', () => {
    const bytes = writePackageZip({ 'assets/photo.png': new Uint8Array([1, 2, 3]) });
    bytes[30 + 'assets/photo.png'.length] ^= 1;
    let message = '';
    try { readPackageZip(bytes); } catch (error) { message = (error as Error).message; }
    expect(projectServiceMessage(message, 'pt')).toBe('Pacote de projeto inválido: O arquivo assets/photo.png está danificado.');
    expect(projectServiceMessage(message, 'en')).toBe(message);
    expect(projectServiceMessage('Invalid project package: Unknown {detail}.', 'pt')).toBe('Pacote de projeto inválido: Unknown {detail}.');
  });
  it.each([1, 2])('translates real recovery warnings with %i damaged records', count => {
    const data = JSON.parse(readFileSync('tests/fixtures/library-backup.json', 'utf8'));
    const id = Object.keys(data.projects)[0];
    data.projects = { [id]: data.projects[id] };
    data.history = { [id]: JSON.stringify(Array(count).fill({ data: 'broken' })) };
    data.thumbnails = { [id]: 'unsupported' };
    data.recovery = Object.fromEntries(Array.from({ length: count - 1 }, (_, i) => [`archive-${i}`, 'retained']));
    for (let i = 0; i < count; i++) {
      data.projects[`damaged-${i}`] = '{';
      data.thumbnails[`missing-${i}`] = 'retained thumbnail';
    }
    const preview = prepareLibraryRestore(JSON.stringify(data));
    const warnings = [...preview.warnings, ...preview.entries.flatMap(entry => entry.warnings)];
    const translated = warnings.map(message => projectServiceMessage(message, 'pt'));
    const number = count === 1 ? 'One' : 'Many';
    for (const kind of ['backupDamagedVersion', 'backupDamagedProject', 'backupMissingProject', 'backupArchive']) {
      expect(translated).toContain(translate('pt', `projectService.${kind}${number}` as Parameters<typeof translate>[1], { count }));
    }
    expect(translated).toContain('Imagem de prévia incompatível mantida para recuperação.');
    expect(translated).toContain('Este projeto salvo não contém JSON legível.');
    for (const message of warnings) expect(projectServiceMessage(message, 'en')).toBe(message);
    expect(preview.projectCount).toBe(1);
    expect(preview.recoveryArchives).toBe(count);
  });

  it('translates retained history and mismatched project identities from the preview', () => {
    const data = JSON.parse(readFileSync('tests/fixtures/library-backup.json', 'utf8'));
    const id = Object.keys(data.projects)[0];
    data.projects.mismatch = data.projects[id];
    data.history = { [id]: JSON.stringify(Array.from({ length: 11 }, (_, timestamp) => ({ timestamp, description: 'unchanged', data: data.projects[id] }))) };
    let preview = prepareLibraryRestore(JSON.stringify(data));
    expect(projectServiceMessage(preview.entries.find(entry => entry.id === 'mismatch')!.warnings[0], 'pt')).toContain('não corresponde');
    expect(projectServiceMessage(preview.entries[0].warnings[0], 'pt')).toContain('As 10 versões válidas mais recentes');
    expect(preview.entries[0].versions).toBe(10);
    data.history[id] = '{';
    preview = prepareLibraryRestore(JSON.stringify(data));
    expect(projectServiceMessage(preview.entries[0].warnings[0], 'pt')).toBe('Histórico de versões ilegível mantido para recuperação.');
  });
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
