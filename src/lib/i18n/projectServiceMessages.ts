import { translate, type Locale, type TranslationKey } from './index';

type ServiceKey = Extract<TranslationKey, `projectService.${string}`>;
const keys: ServiceKey[] = [
  'projectService.storageFull', 'projectService.storageUnavailable',
  'projectService.storageFailed', 'projectService.conflict',
  'projectService.openRetry', 'projectService.newId', 'projectService.changed',
  'projectService.newFailed', 'projectService.fileFailed',
];
const messages = new Map(keys.map(key => [translate('en', key), key]));

/** Translate known service diagnostics without altering unknown error details. */
export function projectServiceMessage(message: string, language: Locale): string {
  const suffix = (['en', 'pt'] as const)
    .map(locale => ` ${translate(locale, 'welcome.noImport')}`)
    .find(value => message.endsWith(value));
  const body = suffix ? message.slice(0, -suffix.length) : message;
  const prefix = translate('en', 'projectService.openUnsaved');
  const unsaved = body.startsWith(`${prefix} `);
  const detail = unsaved ? body.slice(prefix.length + 1) : body;
  const key = messages.get(detail);
  const localized = key ? translate(language, key) : detail;
  return `${unsaved ? `${translate(language, 'projectService.openUnsaved')} ` : ''}${localized}${suffix ? ` ${translate(language, 'welcome.noImport')}` : ''}`;
}
