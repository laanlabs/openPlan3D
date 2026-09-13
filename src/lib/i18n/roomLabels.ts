import type { TranslationKey } from './index';

// Display labels only: preset IDs and template names remain the placement/drag identifiers.
export const roomPresetLabels: Record<string, TranslationKey> = {
  rectangle: 'roomChoices.rectangle',
  'l-shape': 'roomChoices.lShape',
  't-shape': 'roomChoices.tShape',
  'u-shape': 'roomChoices.uShape',
};
export const roomTemplateLabels: Record<string, TranslationKey> = {
  'Living Room': 'roomChoices.living',
  Bedroom: 'roomChoices.bedroom',
  Kitchen: 'roomChoices.kitchen',
  Bathroom: 'roomChoices.bathroom',
  Office: 'roomChoices.office',
  'Dining Room': 'roomChoices.dining',
};
