import { translate, type Locale, type TranslationKey } from './index';

type ServiceKey = Extract<TranslationKey, `projectService.${string}`>;
const keys: ServiceKey[] = [
  'projectService.storageFull', 'projectService.storageUnavailable',
  'projectService.storageFailed', 'projectService.conflict',
  'projectService.openRetry', 'projectService.newId', 'projectService.changed',
  'projectService.newFailed', 'projectService.fileFailed',
  'projectService.backupJSON', 'projectService.backupFile', 'projectService.backupVersion',
  'projectService.backupProjects', 'projectService.backupThumbnails',
  'projectService.backupHistory', 'projectService.backupRecovery', 'projectService.backupEmpty',
];
const messages = new Map(keys.map(key => [translate('en', key), key]));
const outcomes = (['welcome.noImport', 'restore.retry', 'package.retry'] as const)
  .flatMap(key => (['en', 'pt'] as const).map(locale => ({ key, text: ` ${translate(locale, key)}` })));

/** Translate known service diagnostics without altering unknown error details. */
export function projectServiceMessage(message: string, language: Locale): string {
  const suffix = outcomes.find(value => message.endsWith(value.text));
  const body = suffix ? message.slice(0, -suffix.text.length) : message;
  const prefix = translate('en', 'projectService.openUnsaved');
  const unsaved = body.startsWith(`${prefix} `);
  const detail = unsaved ? body.slice(prefix.length + 1) : body;
  const key = messages.get(detail);
  const repeatedKey = /^This backup repeats the key “([\s\S]*)”\. No projects were restored\.$/.exec(detail);
  const localized = key ? translate(language, key) : repeatedKey
    ? translate(language, 'projectService.backupRepeatedKey', { key: repeatedKey[1] }) : detail;
  return `${unsaved ? `${translate(language, 'projectService.openUnsaved')} ` : ''}${localized}${suffix ? ` ${translate(language, suffix.key)}` : ''}`;
}
