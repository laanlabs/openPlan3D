import { translate, type Locale, type TranslationKey } from './index';
import { projectValidationMessage } from './projectValidationMessages';

type ServiceKey = Extract<TranslationKey, `projectService.${string}`>;
const keys: ServiceKey[] = [
  'projectService.historyMissing',
  'projectService.historyChanged',
  'projectService.historyWrongProject',
  'projectService.historyRead',
  'projectService.upgradeBlocked',
  'projectService.libraryUnreadable',
  'projectService.recoveryId',
  'projectService.copyId',
  'projectService.savedIdMismatch',
  'projectService.restoredId',
  'projectService.recoveryPreserve',
  'projectService.itemDetails',
  'projectService.retainedDetails',
  'projectService.historyUnreadable',
  'projectService.historySize',
  'projectService.packageNotice', 'projectService.packageTracingNotice',
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
const packageKeys: ServiceKey[] = [
  'projectService.packageGeometry', 'projectService.packageIdentity', 'projectService.packageDuplicateIdentity',
  'projectService.packageImages',
  'projectService.packageAttachmentData',
  'projectService.packageRetainedData',
  'projectService.packageCategoryVersion',
  'projectService.packageLegacyExport',
  'projectService.packageAttachmentCount',
  'projectService.packageAttachmentPath',
  'projectService.packageAttachmentSize',
  'projectService.packageReturnData',
  'projectService.packageNested',
  'projectService.packageDetailsBaseline',
  'projectService.packageCategoryBaseline',
  'projectService.packageLegacyImport',
  'projectService.packageOversized',
  'projectService.packagePathDirectory', 'projectService.packageSize',
  'projectService.packageLayout', 'projectService.packageDirectory',
  'projectService.packageDirectoryDamaged', 'projectService.packageCompression',
  'projectService.packagePath', 'projectService.packageHeaders',
  'projectService.packageBoundaries', 'projectService.packageUnexpected',
  'projectService.packageTooMany', 'projectService.packageLimit',
  'projectService.packageJSONSize', 'projectService.packageJSONUnreadable',
  'projectService.packageJSONDepth', 'projectService.packageJSONDuplicate',
  'projectService.packageJSONObject', 'projectService.packageManifest',
];
const packageMessages = new Map(packageKeys.map(key => [translate('en', key), key]));

function packageMessage(message: string, language: Locale): string {
  const prefix = `${translate('en', 'projectService.packageInvalid')} `;
  if (!message.startsWith(prefix)) return message;
  const detail = message.slice(prefix.length);
  const key = packageMessages.get(detail);
  const damaged = /^The file ([\s\S]+) is damaged\.$/.exec(detail);
  const missing = /^Missing attachment: ([\s\S]+)\.$/.exec(detail);
  const unknown = /^Unrecognized package file: ([\s\S]+)\.$/.exec(detail);
  const translated = key ? translate(language, key) : damaged
    ? translate(language, 'projectService.packageFileDamaged', { name: damaged[1] }) : missing
    ? translate(language, 'projectService.packageMissingAttachment', { name: missing[1] }) : unknown
    ? translate(language, 'projectService.packageUnknownFile', { name: unknown[1] }) : detail;
  return `${translate(language, 'projectService.packageInvalid')} ${translated}`;
}
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
  return projectValidationMessage(packageMessage(message, language), language);
}
const outcomes = (['welcome.noImport', 'restore.retry', 'package.retry', 'projectService.historyUnchanged'] as const)
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
