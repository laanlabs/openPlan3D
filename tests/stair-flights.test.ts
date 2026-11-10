import { describe, expect, it } from 'vitest';
import { drawStair } from '$lib/utils/canvasRenderer';
import { stairFlights, stairPlanRegions } from '$lib/utils/stairPlanGeometry';
import type { Stair } from '$lib/models/types';

const stair = (stairType: Stair['stairType']): Stair =>
  ({ id: 's', position: { x: 0, y: 0 }, rotation: 0, width: 100, depth: 300, riserCount: 14, stairType, direction: 'up' });

/** The plan's arrowheads for an up stair, as [tip, unit vector the head points along]. */
function upArrowheads(s: Stair) {
  let path: number[][] = [];
  const heads: { tip: number[]; dir: number[] }[] = [];
  const ctx = { save() {}, restore() {}, translate() {}, rotate() {}, fillRect() {}, strokeRect() {}, stroke() {}, closePath() {}, arc() {}, fillText() {},
    setLineDash() {}, beginPath() { path = []; }, moveTo(x: number, y: number) { path.push([x, y]); }, lineTo(x: number, y: number) { path.push([x, y]); },
    fill() {
      if (path.length !== 3) return;
      const [tip, a, b] = path, vx = tip[0] - (a[0] + b[0]) / 2, vy = tip[1] - (a[1] + b[1]) / 2, l = Math.hypot(vx, vy);
      heads.push({ tip, dir: [vx / l, vy / l] });
    },
  } as unknown as CanvasRenderingContext2D;
  drawStair({ ctx, width: 500, height: 500, zoom: 1, camX: 0, camY: 0 } as never, s, false);
  return heads;
}

const inside = (x: number, y: number, s: Stair) =>
  stairPlanRegions(s).some(r => x >= r.x - 1e-6 && x <= r.x + r.width + 1e-6 && y >= r.y - 1e-6 && y <= r.y + r.height + 1e-6);

describe('stair flights', () => {
  for (const type of ['straight', 'l-shaped', 'u-shaped'] as const) {
    const s = stair(type), { runs, landings } = stairFlights(s);

    it(`${type} runs lie on the plan's footprint`, () => {
      for (const run of runs) {
        const side = { x: -run.dir.y * run.width / 2, y: run.dir.x * run.width / 2 };
        const end = { x: run.start.x + run.dir.x * run.length, y: run.start.y + run.dir.y * run.length };
        for (const p of [run.start, end]) for (const k of [-1, 1]) expect(inside(p.x + k * side.x, p.y + k * side.y, s)).toBe(true);
      }
      for (const l of landings) for (const [x, y] of [[l.x, l.y], [l.x + l.width, l.y + l.height]]) expect(inside(x, y, s)).toBe(true);
    });

    it(`${type} climbs the way the plan's UP arrows point`, () => {
      const heads = upArrowheads(s);
      expect(heads.length).toBeGreaterThan(0);
      for (const head of heads) {
        // The run under each arrowhead climbs along it.
        const run = runs.find(r => {
          const t = (head.tip[0] - r.start.x) * r.dir.x + (head.tip[1] - r.start.y) * r.dir.y;
          const off = Math.abs((head.tip[0] - r.start.x) * r.dir.y - (head.tip[1] - r.start.y) * r.dir.x);
          return t >= 0 && t <= r.length && off <= r.width / 2;
        })!;
        expect(run).toBeDefined();
        expect(head.dir[0] * run.dir.x + head.dir[1] * run.dir.y).toBeCloseTo(1);
      }
    });

    it(`${type} uses every riser once, with landings level with the run below`, () => {
      let next = 0;
      for (const run of runs) { expect(run.firstRiser).toBe(next); next += run.risers; }
      expect(next).toBe(s.riserCount);
      for (const l of landings) expect(runs.some(r => r.firstRiser + r.risers === l.atRiser)).toBe(true);
    });
  }

  it('the second run of an L and a U starts where the landing is', () => {
    for (const type of ['l-shaped', 'u-shaped'] as const) {
      const { runs: [, second], landings: [landing] } = stairFlights(stair(type));
      const touches = second.start.x >= landing.x - 1e-6 && second.start.x <= landing.x + landing.width + 1e-6
        && second.start.y >= landing.y - 1e-6 && second.start.y <= landing.y + landing.height + 1e-6;
      expect(touches).toBe(true);
    }
  });
});
