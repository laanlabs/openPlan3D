import { expect, it } from 'vitest';
import { cadText, escapeXml } from '$lib/utils/exportText';

it('escapes SVG markup and drops only the characters XML 1.0 cannot carry', () => {
  expect(escapeXml(`A&B <"c"> 'd'`)).toBe('A&amp;B &lt;&quot;c&quot;&gt; &apos;d&apos;');
  expect(escapeXml('a\x00b\x07c\x0Bd\x0Ce\x1Ff\u{FFFE}g\u{FFFF}h')).toBe('abcdefgh');
  // Tab, line breaks, accented letters and paired surrogates (an emoji) are valid XML and stay.
  const valid = 'tab\there\r\nnext\x85\u{2028}caf\xE9 \u{1F6CB}';
  expect(escapeXml(valid)).toBe(valid);
  expect(escapeXml('lone\u{D800} low\u{DC00} pair\u{1F6CB}')).toBe('lone low pair\u{1F6CB}');
});

it('keeps a DXF text value on one line without control characters', () => {
  expect(cadText('Walnut\nCredenza\x07')).toBe('Walnut Credenza');
  expect(cadText('a\r\nb\rc\td\x0Be\x0Cf\x85g\u{2028}h\u{2029}i')).toBe('a b c d e f g h i');
  expect(cadText('\x00nul\x1Besc\x7Fdel\x9Fc1')).toBe('nulescdelc1');
  const plain = 'Kitchen & Dining <East> 100% caf\xE9 \u{1F6CB}';
  expect(cadText(plain)).toBe(plain);
});
