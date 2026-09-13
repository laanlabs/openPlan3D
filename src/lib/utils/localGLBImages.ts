import type { readLocalGLB } from './localGLB';
import { LOCAL_MODEL_IMAGE_PIXELS, validateLocalGLBResources } from './localGLBResources';

const DECODE_TIMEOUT_MS = 30_000;
const canceled = () => new DOMException('Model import was canceled.', 'AbortError');

/** ImageBitmap decoding cannot be interrupted. Close a late result after cancel
 * or timeout, and remove all listeners/timers on every completion path. */
function decode(blob: Blob, signal?: AbortSignal): Promise<ImageBitmap> {
  if (signal?.aborted) return Promise.reject(canceled());
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true; cleanup(); reject(error);
    };
    const abort = () => fail(canceled());
    const timer = setTimeout(() => fail(new Error('Model texture decoding timed out.')), DECODE_TIMEOUT_MS);
    signal?.addEventListener('abort', abort, { once: true });
    try {
      createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }).then(bitmap => {
        if (settled) { bitmap.close(); return; }
        settled = true; cleanup(); resolve(bitmap);
      }, () => fail(new Error('A model texture could not be decoded.')));
    } catch {
      fail(new Error('A model texture could not be decoded.'));
    }
  });
}

/** Decode embedded images sequentially without fetch or object URLs. The caller
 * owns the returned bitmaps and must dispose them after model textures are done.
 * An abort signal governs this pending operation, not the returned resource. */
export async function decodeLocalGLBImages(container: ReturnType<typeof readLocalGLB>, signal?: AbortSignal) {
  const { imageHeaders, ranges } = validateLocalGLBResources(container);
  if (signal?.aborted) throw canceled();
  if (imageHeaders.length && typeof createImageBitmap !== 'function') throw new Error('This browser cannot decode local model textures.');
  const images: ImageBitmap[] = [];
  let disposed = false, pixels = 0;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const bitmap of images) bitmap.close();
  };
  try {
    for (let index = 0; index < imageHeaders.length; index++) {
      const expected = imageHeaders[index];
      const range = ranges[container.document.images[index].bufferView];
      // Copy just this embedded image into the immutable Blob, never its full GLB.
      const bytes = container.binary!.slice(range.offset, range.offset + range.length);
      const bitmap = await decode(new Blob([bytes], { type: expected.mime }), signal);
      images.push(bitmap);
      if (signal?.aborted) throw canceled();
      const { width, height } = bitmap;
      // EXIF orientation may transpose dimensions without changing pixel count.
      const dimensionsMatch = (width === expected.width && height === expected.height) ||
        (expected.mime === 'image/jpeg' && width === expected.height && height === expected.width);
      if (!dimensionsMatch || !Number.isInteger(width) || !Number.isInteger(height) ||
          width < 1 || height < 1 || width > 4096 || height > 4096) throw new Error('Decoded model texture dimensions do not match its bounded header.');
      pixels += width * height;
      if (pixels > LOCAL_MODEL_IMAGE_PIXELS) throw new Error('Decoded model textures exceed the pixel budget.');
    }
    return { images, pixels, dispose };
  } catch (error) {
    dispose(); throw error;
  }
}
