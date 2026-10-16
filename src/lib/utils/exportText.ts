/** Characters XML 1.0 cannot carry, even as references: C0 controls other than tab, LF and CR, lone surrogates, U+FFFE and U+FFFF. */
const XML_INVALID = /[\0-\x08\x0B\x0C\x0E-\x1F\uD800-\uDFFF\uFFFE\uFFFF]/gu;

/** Escape text for SVG markup. Characters XML forbids are dropped, so a stray control character in a saved name cannot make the file unreadable. */
export function escapeXml(s: string): string {
  return s.replace(XML_INVALID, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** A DXF value is one line: line breaks and tabs become a space and other control characters are dropped, so every value stays paired with its group code. */
export function cadText(s: string): string {
  return s.replace(/[\t\n\v\f\r\u0085\u2028\u2029]+/g, ' ').replace(/\p{Cc}/gu, '');
}
