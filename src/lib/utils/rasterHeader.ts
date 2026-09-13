/** Inspect JPG/PNG dimensions without image decoding. */
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
  return null;
}
