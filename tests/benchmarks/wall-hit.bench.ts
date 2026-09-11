import { expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import type { Wall } from '$lib/models/types';
import { findWallAt } from '$lib/utils/hitTesting';

// Synthetic curve-heavy plans isolate pointer hit-testing cost, excluding drawing,
// browser dispatch and scene updates. Compare on the same host/runtime.
for (const count of [40, 400]) {
  const walls: Wall[] = Array.from({ length: count }, (_, index) => {
    const x = index % 20 * 700, y = Math.floor(index / 20) * 700;
    return { id: `wall-${index}`, start: { x, y }, end: { x: x + 600, y },
      curvePoint: { x: x + 300, y: y + 600 }, thickness: 20, height: 250, color: '#fff' };
  });
  const last = walls.at(-1)!;
  const t = .237;
  const near = { x: last.start.x + 600 * t, y: last.start.y + 1200 * t * (1 - t) };
  for (const [name, point, expected] of [['empty-space', { x: -200, y: -200 }, null], ['last-wall', near, last]] as const) {
    it(`${count} curved walls: ${name}`, () => {
      expect(findWallAt(point, walls, 1)).toBe(expected);
      for (let i = 0; i < 100; i++) findWallAt(point, walls, 1);
      const samples: number[] = [];
      for (let sample = 0; sample < 50; sample++) {
        const start = performance.now();
        for (let i = 0; i < 20; i++) findWallAt(point, walls, 1);
        samples.push((performance.now() - start) / 20);
      }
      samples.sort((a, b) => a - b);
      const report = JSON.stringify({ count, scenario: name, medianMs: samples[25], p95Ms: samples[47], node: process.version, arch: process.arch });
      console.log(report);
      const prefix = process.env.OPENPLAN_BENCHMARK_OUTPUT;
      if (prefix) writeFileSync(`${prefix}-${count}-${name}.json`, report);
    });
  }
}
