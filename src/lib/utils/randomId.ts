/**
 * A v4 UUID that works without Web Crypto.
 *
 * `crypto.randomUUID()` exists only in a secure context, so plain-HTTP
 * deployments (self-hosted, or `npm run dev -- --host` on a phone) would throw
 * on the unguarded call sites. Prefer `randomUUID`, otherwise build a v4 UUID
 * from `crypto.getRandomValues` (also insecure-context-safe), and only fall back
 * to `Math.random` when no crypto API is present at all.
 */
const HEX = '0123456789abcdef';

export function randomId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  let out = '';
  for (let index = 0; index < bytes.length; index++) {
    out += HEX[bytes[index] >> 4] + HEX[bytes[index] & 0x0f];
    if (index === 3 || index === 5 || index === 7 || index === 9) out += '-';
  }
  return out;
}
