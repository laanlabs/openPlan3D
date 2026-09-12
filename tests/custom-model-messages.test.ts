import { expect, it } from 'vitest';
import { customModelMessages } from '$lib/i18n/customModelMessages';
import { translate } from '$lib/i18n';

it('retains actionable English messages and translates every registered model error', () => {
  for (const [message, key] of Object.entries(customModelMessages)) {
    expect(translate('en', key)).toBe(message);
    expect(translate('pt', key)).toBeTruthy();
    expect(translate('pt', key)).not.toBe(message);
  }
  expect(translate('pt', customModelMessages['Browser storage has too little space for this model and its saved versions.'])).toContain('espaço suficiente');
  expect(translate('pt', customModelMessages['Remove this model’s placed furniture before removing its definition.'])).toContain('Remova os móveis');
  expect(customModelMessages['Future validator detail']).toBeUndefined();
});
