import { afterEach, expect, it, vi } from 'vitest';
import { decodeLocalGLBImages as decode } from '$lib/utils/localGLBImages';

function model(count = 1) {
  const binary = new Uint8Array(24), view = new DataView(binary.buffer);
  view.setUint32(0, 0x89504e47); view.setUint32(4, 0x0d0a1a0a); view.setUint32(12, 0x49484452);
  view.setUint32(16, 8); view.setUint32(20, 4);
  return { binary, document: { buffers: [{ byteLength: 24 }], bufferViews: [{ buffer: 0, byteLength: 24 }],
    images: Array.from({ length: count }, () => ({ bufferView: 0, mimeType: 'image/png' })) } };
}
const bitmap = (width = 8, height = 4) => ({ width, height, close: vi.fn() }) as unknown as ImageBitmap;
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('decodes only embedded image bytes and transfers idempotently disposable ownership', async () => {
  const image = bitmap(), decoder = vi.fn().mockResolvedValue(image); vi.stubGlobal('createImageBitmap', decoder);
  const result = await decode(model());
  expect(result.pixels).toBe(32); expect(result.images).toEqual([image]);
  const [blob, options] = decoder.mock.calls[0];
  expect(blob.type).toBe('image/png'); expect(blob.size).toBe(24);
  expect(new Uint8Array(await blob.arrayBuffer())).toEqual(model().binary);
  expect(options).toEqual({ premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  expect(image.close).not.toHaveBeenCalled();
  result.dispose(); result.dispose(); expect(image.close).toHaveBeenCalledTimes(1);
});
it('closes all earlier images if a later texture fails to decode', async () => {
  const image = bitmap(); vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValueOnce(image).mockRejectedValueOnce(new Error('corrupt')));
  await expect(decode(model(2))).rejects.toThrow('could not be decoded');
  expect(image.close).toHaveBeenCalledTimes(1);
});
it('rejects decoded dimension mismatches and closes the rejected bitmap', async () => {
  const image = bitmap(8192, 8192); vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(image));
  await expect(decode(model())).rejects.toThrow('dimensions'); expect(image.close).toHaveBeenCalledTimes(1);
});
it('cancels pending decode and closes a bitmap that arrives after cancellation', async () => {
  let finish!: (image: ImageBitmap) => void;
  vi.stubGlobal('createImageBitmap', vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; })));
  const controller = new AbortController(), image = bitmap();
  const pending = decode(model(), controller.signal);
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort(); await rejected;
  finish(image); await Promise.resolve(); expect(image.close).toHaveBeenCalledTimes(1);
});
it('times out a stalled decoder and closes a late result', async () => {
  vi.useFakeTimers(); let finish!: (image: ImageBitmap) => void;
  vi.stubGlobal('createImageBitmap', vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; })));
  const pending = decode(model()), rejected = expect(pending).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(30_000); await rejected;
  const image = bitmap(); finish(image); await Promise.resolve(); expect(image.close).toHaveBeenCalledTimes(1);
});
it('rejects pre-canceled imports before decoding and allows models with no images', async () => {
  const decoder = vi.fn(); vi.stubGlobal('createImageBitmap', decoder);
  const controller = new AbortController(); controller.abort();
  await expect(decode(model(), controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(decoder).not.toHaveBeenCalled();
  vi.stubGlobal('createImageBitmap', undefined);
  const result = await decode({ document: {} }); expect(result.images).toEqual([]); result.dispose();
  await expect(decode(model())).rejects.toThrow('cannot decode');
});
