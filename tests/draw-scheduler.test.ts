import { expect, it, vi } from 'vitest';
import { createDrawScheduler } from '$lib/utils/drawScheduler';

function frames() {
  const queue = new Map<number, FrameRequestCallback>();
  let id = 0;
  return {
    queue,
    request: (callback: FrameRequestCallback) => { queue.set(id, callback); return id++; },
    cancel: (id: number) => { queue.delete(id); },
    flush() {
      const batch = [...queue];
      queue.clear();
      for (const [, callback] of batch) callback(0);
    },
  };
}

it('stays idle until invalidated and coalesces bursts, including frame ID zero', () => {
  const f = frames(), draw = vi.fn();
  const scheduler = createDrawScheduler(draw, f.request, f.cancel);
  expect(f.queue.size).toBe(0);
  for (let i = 0; i < 20; i++) scheduler.invalidate();
  expect(f.queue.size).toBe(1);
  f.flush();
  expect(draw).toHaveBeenCalledOnce();
  expect(f.queue.size).toBe(0);
  scheduler.invalidate();
  f.flush();
  expect(draw).toHaveBeenCalledTimes(2);
  expect(f.queue.size).toBe(0);
});

it('retains one invalidation raised during drawing, then sleeps', () => {
  const f = frames();
  const draw = vi.fn(() => {
    if (draw.mock.calls.length === 1) { scheduler.invalidate(); scheduler.invalidate(); }
  });
  const scheduler = createDrawScheduler(draw, f.request, f.cancel);
  scheduler.invalidate();
  f.flush();
  expect(f.queue.size).toBe(1);
  f.flush();
  expect(draw).toHaveBeenCalledTimes(2);
  expect(f.queue.size).toBe(0);
});

it('cancels pending work and ignores late callbacks and async invalidations after stop', () => {
  const f = frames(), draw = vi.fn();
  const scheduler = createDrawScheduler(draw, f.request, f.cancel);
  scheduler.invalidate();
  const late = [...f.queue.values()][0];
  scheduler.stop();
  scheduler.stop();
  late(0);
  scheduler.invalidate();
  expect(f.queue.size).toBe(0);
  expect(draw).not.toHaveBeenCalled();
});

it('can stop during a draw, cancelling an invalidation raised by the draw', () => {
  const f = frames();
  const scheduler = createDrawScheduler(() => {
    scheduler.invalidate();
    scheduler.stop();
    scheduler.invalidate();
  }, f.request, f.cancel);
  scheduler.invalidate();
  f.flush();
  expect(f.queue.size).toBe(0);
});
