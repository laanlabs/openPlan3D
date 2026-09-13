import { translate, type Locale, type TranslationKey } from './index';

const reasons: Extract<TranslationKey, `projectValidation.${string}`>[] = [
  'projectValidation.object',
  'projectValidation.nonempty',
  'projectValidation.text',
  'projectValidation.number',
  'projectValidation.positive',
  'projectValidation.array',
  'projectValidation.boolean',
  'projectValidation.choice',
  'projectValidation.read',
  'projectValidation.floor',
  'projectValidation.duplicateFloor',
  'projectValidation.integer',
  'projectValidation.duplicateElement',
  'projectValidation.wall',
  'projectValidation.positiveInteger',
  'projectValidation.duplicateSymbol',
  'projectValidation.date',
  'projectValidation.validDate',
];
const suffixes = reasons.map(key => ({ key, text: ` ${translate('en', key)}.` }));

/** Keep the exact field path, including user-defined attachment names. */
export function projectValidationMessage(message: string, language: Locale): string {
  const prefix = `${translate('en', 'projectValidation.prefix')} `;
  if (!message.startsWith(prefix)) return message;
  const detail = message.slice(prefix.length);
  const reason = suffixes.find(value => detail.endsWith(value.text));
  const body = reason
    ? `${detail.slice(0, -reason.text.length)} ${translate(language, reason.key)}.` : detail;
  return `${translate(language, 'projectValidation.prefix')} ${body}`;
}
