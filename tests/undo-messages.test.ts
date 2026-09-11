import { expect, it } from 'vitest';
import { undoMessage } from '../src/lib/i18n/undoMessages';

it('translates exact built-in undo descriptions and preserves unknown text', () => {
  expect(undoMessage('Added floor', 'pt')).toBe('Pavimento adicionado');
  expect(undoMessage('Added floor', 'en')).toBe('Added floor');
  for (const value of ['Added floor {name}', 'My <room> action', 'Moved furniture: Custom chair', 'Edit\nprivate note']) {
    expect(undoMessage(value, 'pt')).toBe(value);
    expect(undoMessage(value, 'en')).toBe(value);
  }
});
