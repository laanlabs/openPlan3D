import { expect, it } from 'vitest';
import { parseLengthInput, formatLengthPrecise } from '$lib/stores/settings';

it.each([
  ['12"', 30.48], ["5'6\"", 167.64], [' 2.5 m ', 250],
  ['250 mm', 25], ['12 cm', 12], ['5 ft 6 in', 167.64],
  ['5′6″', 167.64], ["-5'6\"", -167.64], ['.5m', 50],
])('parses explicit units in %s', (text, cm) => {
  for (const units of ['metric', 'imperial'] as const) {
    expect(parseLengthInput(String(text), units)).toBeCloseTo(Number(cm));
  }
});

it('uses displayed units for bare values', () => {
  expect(parseLengthInput('12', 'metric')).toBe(12);
  expect(parseLengthInput('12', 'imperial')).toBe(30.48);
  expect(parseLengthInput('1e2', 'metric')).toBe(100);
});

it.each(['', '12junk', '2 m extra', '1.2.3', 'Infinity', '1e999', '5\' -6"', '1/0"'])(
  'rejects malformed input %s', text => expect(parseLengthInput(text, 'metric')).toBeNull(),
);

it('reads precise displayed imperial lengths back within rounding tolerance', () => {
  for (const cm of [1, 30.47, 100, 250, -100]) {
    const parsed = parseLengthInput(formatLengthPrecise(cm, 'imperial'), 'imperial');
    expect(Math.abs(parsed! - cm)).toBeLessThanOrEqual(.128);
  }
});
