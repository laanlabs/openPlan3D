import type { readLocalGLB } from './localGLB';
import { photoHeader } from './rasterHeader';

export const LOCAL_MODEL_IMAGE_PIXELS = 32 * 1024 * 1024;
function fail(message: string): never { throw new Error(`Invalid GLB resources: ${message}`); }
function list(value: unknown, maximum: number, name: string): Record<string, any>[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum || value.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    fail(`Invalid or oversized ${name} table.`);
  }
  return value;
}
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

/** Validate embedded storage and raster budgets before a decoder is invoked.
 * Accessors, meshes, extensions and scene complexity require separate validation.
 */
export function validateLocalGLBResources(container: ReturnType<typeof readLocalGLB>) {
  const { document, binary } = container;
  const buffers = list(document.buffers, 1, 'buffer');
  const views = list(document.bufferViews, 4096, 'buffer view');
  const images = list(document.images, 32, 'image');
  const buffer = buffers[0];
  if (buffer) {
    if (buffer.uri !== undefined) fail('Embed all buffers in the GLB; external and data URLs are not supported.');
    if (!integer(buffer.byteLength) || !buffer.byteLength || !binary ||
        buffer.byteLength > binary.length || binary.length - buffer.byteLength > 3) {
      fail('The embedded buffer length does not match the binary chunk.');
    }
    for (const byte of binary.subarray(buffer.byteLength)) if (byte !== 0) fail('Binary padding must contain zero bytes.');
  } else if (binary?.length || views.length || images.length) {
    fail('Embedded resources require a declared buffer.');
  }
  const ranges = views.map(view => {
    const offset = view.byteOffset ?? 0;
    if (view.buffer !== 0 || !integer(offset) || !integer(view.byteLength) || !view.byteLength ||
        !buffer || offset > buffer.byteLength || view.byteLength > buffer.byteLength - offset) {
      fail('A buffer view points outside the embedded buffer.');
    }
    if (view.byteStride !== undefined && (!integer(view.byteStride) || view.byteStride < 4 || view.byteStride > 252 || view.byteStride % 4)) {
      fail('A buffer view has an invalid byte stride.');
    }
    if (view.extensions && Object.keys(view.extensions).length) fail('Compressed buffer views are not supported.');
    return { offset, length: view.byteLength as number };
  });
  let pixels = 0;
  const imageHeaders = images.map(image => {
    if (image.uri !== undefined) fail('Embed all images in the GLB; external and data URLs are not supported.');
    if (!integer(image.bufferView) || image.bufferView >= ranges.length) fail('An image has no valid embedded buffer view.');
    const range = ranges[image.bufferView];
    const header = photoHeader(binary!.subarray(range.offset, range.offset + range.length));
    if (!header || header.mime !== image.mimeType || header.width <= 0 || header.height <= 0 ||
        header.width > 4096 || header.height > 4096) fail('Use embedded JPG or PNG textures up to 4096 pixels per side.');
    pixels += header.width * header.height;
    if (pixels > LOCAL_MODEL_IMAGE_PIXELS) fail('The model exceeds the total texture pixel budget.');
    return header;
  });
  return { ranges, imageHeaders, pixels };
}
