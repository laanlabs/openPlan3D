import type { Stair } from '$lib/models/types';

type Rect = { x: number; y: number; width: number; height: number };
/** Local filled regions drawn by the stair renderer. Spiral uses its circle. */
export function stairPlanRegions(stair: Stair): Rect[] {
  const w = stair.width, d = stair.depth;
  switch (stair.stairType) {
    case 'l-shaped': return [
      { x: -w / 2, y: 0, width: w, height: d / 2 },
      { x: -w / 2, y: -w / 2, width: w, height: w / 2 },
      { x: w / 2, y: -w / 2, width: d / 2, height: w },
    ];
    case 'u-shaped': {
      const run = w * .425;
      return [{ x: -w / 2, y: -d / 2, width: run, height: d },
        { x: w / 2 - run, y: -d / 2, width: run, height: d },
        { x: -w / 2, y: -d / 2 - w * .1, width: w, height: w * .1 }];
    }
    case 'spiral': {
      const side = Math.min(w, d);
      return [{ x: -side / 2, y: -side / 2, width: side, height: side }];
    }
    default: return [{ x: -w / 2, y: -d / 2, width: w, height: d }];
  }
}
export function stairLocalBounds(stair: Stair) {
  const regions = stairPlanRegions(stair);
  return { minX: Math.min(...regions.map(r => r.x)), minY: Math.min(...regions.map(r => r.y)),
    maxX: Math.max(...regions.map(r => r.x + r.width)), maxY: Math.max(...regions.map(r => r.y + r.height)) };
}
export function stairPlanBounds(stair: Stair) {
  const angle = stair.rotation * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
  const points = stairPlanRegions(stair).flatMap(r => [[r.x, r.y], [r.x+r.width, r.y], [r.x+r.width, r.y+r.height], [r.x, r.y+r.height]])
    .map(([x,y]) => ({ x: stair.position.x + x*c-y*s, y: stair.position.y+x*s+y*c }));
  if (stair.stairType === 'spiral') {
    const r = Math.min(stair.width, stair.depth) / 2;
    return { minX: stair.position.x-r, maxX: stair.position.x+r, minY: stair.position.y-r, maxY: stair.position.y+r };
  }
  return { minX: Math.min(...points.map(p=>p.x)), maxX: Math.max(...points.map(p=>p.x)),
    minY: Math.min(...points.map(p=>p.y)), maxY: Math.max(...points.map(p=>p.y)) };
}
export function stairContainsLocalPoint(stair: Stair, x: number, y: number) {
  if (stair.stairType === 'spiral') return Math.hypot(x, y) <= Math.min(stair.width, stair.depth) / 2;
  return stairPlanRegions(stair).some(r => x >= r.x && x <= r.x+r.width && y >= r.y && y <= r.y+r.height);
}

/** Spiral treads on the plan start at this local angle and sweep this far, in the direction an up stair climbs. */
export const SPIRAL_START_ANGLE = -Math.PI / 2;
export const SPIRAL_SWEEP = Math.PI * 1.75;

type LocalPoint = { x: number; y: number };
/** A straight run in the stair's local plan coordinates: its bottom riser is centred on `start`, and it climbs
 *  `risers` steps along the unit vector `dir`, over `length`, starting after `firstRiser` steps of the stair. */
export interface StairRun { start: LocalPoint; dir: LocalPoint; width: number; length: number; risers: number; firstRiser: number }
/** A landing's plan rectangle, level with the top of riser `atRiser`. */
export interface StairLanding extends Rect { atRiser: number }

/** The flights the plan draws, in the order an up stair climbs them: the plan's UP arrow points along each
 *  run's `dir`. Every run and landing lies inside `stairPlanRegions`. Spiral stairs have no straight runs. */
export function stairFlights(stair: Stair): { runs: StairRun[]; landings: StairLanding[] } {
  const w = stair.width, d = stair.depth, n = stair.riserCount;
  const half = Math.floor(n / 2);
  const up = { x: 0, y: -1 };
  switch (stair.stairType) {
    case 'l-shaped': return {
      runs: [
        { start: { x: 0, y: d / 2 }, dir: up, width: w, length: d / 2, risers: half, firstRiser: 0 },
        { start: { x: w / 2, y: 0 }, dir: { x: 1, y: 0 }, width: w, length: d / 2, risers: n - half, firstRiser: half },
      ],
      landings: [{ x: -w / 2, y: -w / 2, width: w, height: w / 2, atRiser: half }],
    };
    case 'u-shaped': {
      const run = w * .425;
      return {
        runs: [
          { start: { x: -w / 2 + run / 2, y: d / 2 }, dir: up, width: run, length: d, risers: half, firstRiser: 0 },
          { start: { x: w / 2 - run / 2, y: -d / 2 }, dir: { x: 0, y: 1 }, width: run, length: d, risers: n - half, firstRiser: half },
        ],
        landings: [{ x: -w / 2, y: -d / 2 - w * .1, width: w, height: w * .1, atRiser: half }],
      };
    }
    case 'spiral': return { runs: [], landings: [] };
    default: return { runs: [{ start: { x: 0, y: d / 2 }, dir: up, width: w, length: d, risers: n, firstRiser: 0 }], landings: [] };
  }
}
