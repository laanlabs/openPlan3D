/** Inspect JPG/PNG/WebP dimensions without image decoding. */
export function photoHeader(bytes: Uint8Array): { width: number; height: number; mime: string } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a && view.getUint32(12) === 0x49484452) {
    return { width: view.getUint32(16), height: view.getUint32(20), mime: 'image/png' };
  }
  if (bytes.length >= 4 && view.getUint16(0) === 0xffd8) {
    let pos = 2;
    while (pos + 4 <= bytes.length && bytes[pos] === 0xff) {
      if (bytes[pos + 1] === 0xff) { pos++; continue; }
      const marker = bytes[pos + 1], length = view.getUint16(pos + 2);
      if (length < 2 || pos + 2 + length > bytes.length) return null;
      if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 8) return { width: view.getUint16(pos + 7), height: view.getUint16(pos + 5), mime: 'image/jpeg' };
      pos += 2 + length;
    }
  }
  const webp = webpHeader(bytes, view);
  if (webp) return webp;
  return null;
}

const u24 = (view: DataView, offset: number) => view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);

/** WebP (RIFF) dimensions from the VP8/VP8L/VP8X frame headers. */
function webpHeader(bytes: Uint8Array, view: DataView): { width: number; height: number; mime: string } | null {
  if (bytes.length < 30 || view.getUint32(0) !== 0x52494646 || view.getUint32(8) !== 0x57454250) return null;
  const fourCC = view.getUint32(12);
  // 'VP8X' extended format: 24-bit canvas size minus one.
  if (fourCC === 0x56503858) return { width: u24(view, 24) + 1, height: u24(view, 27) + 1, mime: 'image/webp' };
  // 'VP8 ' lossy: start code then 14-bit dimensions.
  if (fourCC === 0x56503820 && view.getUint8(23) === 0x9d && view.getUint8(24) === 0x01 && view.getUint8(25) === 0x2a) {
    return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff, mime: 'image/webp' };
  }
  // 'VP8L' lossless: 0x2f signature then 14-bit width/height minus one.
  if (fourCC === 0x5650384c && bytes[20] === 0x2f) {
    const bits = view.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, mime: 'image/webp' };
  }
  return null;
}
