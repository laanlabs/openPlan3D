import { packageJSON } from './projectPackageZip';

export const LOCAL_GLB_FILE_LIMIT = 16 * 1024 * 1024;
export const LOCAL_GLB_JSON_LIMIT = 2 * 1024 * 1024;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
function fail(message: string): never { throw new Error(`Invalid GLB: ${message}`); }

/** Read a bounded glTF 2.0 container without decoding geometry or fetching URLs.
 * This is container validation, not permission to pass the result to a renderer.
 * Resource references, geometry, images and scene complexity still need validation.
 * https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification
 */
export function readLocalGLB(bytes: Uint8Array): { document: Record<string, any>; binary?: Uint8Array } {
  if (bytes.length < 20 || bytes.length > LOCAL_GLB_FILE_LIMIT) fail('Choose a GLB file up to 16 MiB.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u32 = (offset: number) => view.getUint32(offset, true);
  if (u32(0) !== 0x46546c67 || u32(4) !== 2) fail('Only glTF 2.0 binary containers are supported.');
  if (u32(8) !== bytes.length) fail('The declared file length does not match its bytes.');
  let document: Record<string, any> | undefined;
  let binary: Uint8Array | undefined;
  let position = 12;
  let chunkIndex = 0;
  while (position < bytes.length) {
    if (position + 8 > bytes.length) fail('A chunk header is truncated.');
    const length = u32(position), type = u32(position + 4);
    position += 8;
    if (length % 4 || position + length > bytes.length) fail('A chunk is truncated or misaligned.');
    const chunk = bytes.subarray(position, position + length);
    if (chunkIndex === 0) {
      if (type !== JSON_CHUNK || !length || length > LOCAL_GLB_JSON_LIMIT) fail('The first chunk must be JSON up to 2 MiB.');
      try { document = packageJSON(chunk); }
      catch { fail('The JSON must be a readable object with unique keys and bounded nesting.'); }
    } else if (type === BIN_CHUNK) {
      if (chunkIndex !== 1 || binary) fail('The binary chunk must occur once, directly after JSON.');
      binary = chunk;
    } else if (type === JSON_CHUNK) {
      fail('The JSON chunk must occur exactly once.');
    }
    // Unknown chunks are ignored as required by glTF 2.0; the file size remains bounded.
    position += length;
    chunkIndex++;
  }
  if (!document || document.asset?.version !== '2.0' ||
      (document.asset.minVersion !== undefined && document.asset.minVersion !== '2.0')) {
    fail('The document must declare a supported glTF 2.0 asset version.');
  }
  return { document, binary };
}
