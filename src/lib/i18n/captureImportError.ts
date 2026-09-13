import { translate, type TranslationKey } from './index';

/** Keep machine diagnostics in English and translate known failures at render time. */
export class CaptureImportError extends Error {
  constructor(
    readonly key: Extract<TranslationKey, `captureImport.${string}`>,
    readonly variables: Record<string, string | number> = {},
  ) {
    super(translate('en', key, variables));
    this.name = 'CaptureImportError';
  }
}
