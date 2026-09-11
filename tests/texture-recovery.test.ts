import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('$lib/utils/catalogAssetUrl', () => ({ catalogAssetUrl: (path: string) => path }));
vi.mock('$app/paths', () => ({ base: '' }));

class TestImage {
  static requests: TestImage[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 128;
  naturalHeight = 64;
  src = '';
  constructor() { TestImage.requests.push(this); }
}
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(0);
  TestImage.requests = [];
  vi.stubGlobal('Image', TestImage);
  const context = new Proxy({}, { get: () => vi.fn() });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it.each(['wall', 'floor'])('recovers a failed %s texture without repeated per-frame requests', async kind => {
  const textures = await import('$lib/utils/textureGenerator');
  const draw = () => kind === 'wall'
    ? textures.getWallTextureCanvas('red-brick', '#884422')
    : textures.getFloorTextureCanvas('hardwood');
  const wake = vi.fn(), unsubscribe = textures.setTextureLoadCallback(wake);
  draw(); draw();
  expect(TestImage.requests).toHaveLength(1);
  expect(TestImage.requests[0].onerror).toBeTypeOf('function');
  TestImage.requests[0].onerror!();
  for (let i = 0; i < 10; i++) draw();
  expect(TestImage.requests).toHaveLength(1);
  expect(wake).not.toHaveBeenCalled();
  vi.advanceTimersByTime(30_001);
  draw(); draw();
  expect(TestImage.requests).toHaveLength(2);
  TestImage.requests[1].onload!();
  expect(wake).toHaveBeenCalledTimes(1);
  const canvas = draw();
  expect(canvas?.width).toBe(128);
  expect(canvas?.height).toBe(64);
  expect(draw()).toBe(canvas);
  expect(TestImage.requests).toHaveLength(2);
  unsubscribe();
});
