import { describe, expect, it } from 'vitest';
import { summarizeSafariTimeline } from '../tooling/safari-timeline.mjs';

const trace = () => ({ version: 1, recording: { startTime: 100, endTime: 110, records: [
  { type: 'timeline-record-type-rendering-frame', startTime: 101, endTime: 101.004 },
  { type: 'timeline-record-type-rendering-frame', startTime: 101.02, endTime: 101.026 },
  { type: 'timeline-record-type-script', eventType: 'animation-frame-fired', startTime: 101 },
  { type: 'timeline-record-type-script', eventType: 'animation-frame-requested', startTime: 101 },
  { type: 'timeline-record-type-cpu', timestamp: 101, usage: 2 },
  { type: 'timeline-record-type-cpu', timestamp: 102, usage: 4 },
  { type: 'timeline-record-type-memory', timestamp: 101, categories: [{ type: 'javascript', size: 1_000_000 }, { type: 'page', size: 2_000_000 }] },
  { type: 'timeline-record-type-network', startTime: 101, request: { url: 'private-project', cookies: ['private-cookie'], headers: ['private-header'] } },
], samples: ['private-stack'], displayName: 'private-name' } });

describe('Safari timeline aggregation', () => {
  it('reports elapsed frame timing and sampled CPU/memory with explicit units', () => {
    const result = summarizeSafariTimeline(trace());
    expect(result.animationCallbacks).toBe(1);
    expect(result.animationRequests).toBe(1);
    expect(result.frameDurationMs).toEqual({ count: 2, min: 4, mean: 5, p95: 6, max: 6 });
    expect(result.frameStartIntervalMs.mean).toBe(20);
    expect(result.cpuPercent.mean).toBe(3);
    expect(result.memoryMB.max).toBe(3);
  });
  it('uses recording-relative, half-open time windows', () => {
    const result = summarizeSafariTimeline(trace(), { from: 1, to: 2 });
    expect(result.cpuPercent.count).toBe(1);
    expect(result.cpuPercent.mean).toBe(2);
    expect(result.rangeSeconds).toEqual({ from: 1, to: 2 });
  });
  it('represents a sleeping interval without inventing zero CPU or memory samples', () => {
    const result = summarizeSafariTimeline(trace(), { from: 5, to: 10 });
    expect(result.renderingFrames).toBe(0);
    expect(result.animationCallbacks).toBe(0);
    expect(result.frameDurationMs.mean).toBeNull();
    expect(result.cpuPercent.mean).toBeNull();
    expect(result.memoryMB.max).toBeNull();
  });
  it('does not expose request data, display names or stacks', () => {
    expect(JSON.stringify(summarizeSafariTimeline(trace()))).not.toContain('private');
  });
  for (const options of [{ from: -1 }, { from: 2, to: 1 }, { to: 11 }, { from: NaN }]) {
    it(`rejects invalid range ${JSON.stringify(options)}`, () => {
      expect(() => summarizeSafariTimeline(trace(), options)).toThrow('time range');
    });
  }
  it('rejects unknown or incomplete recording formats', () => {
    expect(() => summarizeSafariTimeline({ ...trace(), version: 2 })).toThrow('Unsupported');
    expect(() => summarizeSafariTimeline({ version: 1 })).toThrow('Unsupported');
  });
});
