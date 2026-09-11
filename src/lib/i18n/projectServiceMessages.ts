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
  'projectService.backupSavedJSON', 'projectService.backupSavedUnreadable',
  'projectService.backupIdMismatch', 'projectService.backupHistoryLimit',
  'projectService.backupHistoryUnreadable', 'projectService.backupPreviewUnsupported',
];
const messages = new Map(keys.map(key => [translate('en', key), key]));
const counts: { pattern: RegExp; one: ServiceKey; many: ServiceKey }[] = [
  { pattern: /^(\d+) damaged versions? kept for recovery\.$/, one: 'projectService.backupDamagedVersionOne', many: 'projectService.backupDamagedVersionMany' },
  { pattern: /^(\d+) damaged projects? will be kept for recovery instead of opened\.$/, one: 'projectService.backupDamagedProjectOne', many: 'projectService.backupDamagedProjectMany' },
  { pattern: /^Attachments for (\d+) missing projects? will be kept for recovery\.$/, one: 'projectService.backupMissingProjectOne', many: 'projectService.backupMissingProjectMany' },
  { pattern: /^(\d+) recovery archives? will be included in future library backups\.$/, one: 'projectService.backupArchiveOne', many: 'projectService.backupArchiveMany' },
];

function countedMessage(message: string, language: Locale): string {
  for (const { pattern, one, many } of counts) {
    const match = pattern.exec(message);
    if (match) return translate(language, match[1] === '1' ? one : many, { count: match[1] });
  }
  return message;
}
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
    ? translate(language, 'projectService.backupRepeatedKey', { key: repeatedKey[1] }) : countedMessage(detail, language);
  return `${unsaved ? `${translate(language, 'projectService.openUnsaved')} ` : ''}${localized}${suffix ? ` ${translate(language, suffix.key)}` : ''}`;
}
