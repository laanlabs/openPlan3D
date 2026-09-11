import type { Point, Wall } from '$lib/models/types';

// Isolate polynomial roots between derivative roots, where each interval is
// monotonic. The highest degree here is three (quadratic curve distance).
function roots(coefficients: number[], lo: number, hi: number): number[] {
  const scale = Math.max(...coefficients.map(Math.abs));
  if (!scale) return [];
  const c = coefficients.map(value => value / scale);
  while (c.length > 1 && Math.abs(c[0]) < 1e-14) c.shift();
  if (c.length === 1) return [];
  const evaluate = (t: number) => c.reduce((value, coefficient) => value * t + coefficient, 0);
  const derivative = c.slice(0, -1).map((value, index) => value * (c.length - 1 - index));
  const knots = [lo, ...roots(derivative, lo, hi), hi];
  const result = knots.filter(t => Math.abs(evaluate(t)) < 1e-12);
  for (let i = 1; i < knots.length; i++) {
    let a = knots[i - 1], b = knots[i], fa = evaluate(a);
    if (fa * evaluate(b) >= 0) continue;
    for (let step = 0; step < 60; step++) {
      const middle = (a + b) / 2, fm = evaluate(middle);
      if (fa * fm <= 0) b = middle;
      else { a = middle; fa = fm; }
    }
    result.push((a + b) / 2);
  }
  return [...new Set(result)].sort((a, b) => a - b);
}

/** Closest valid opening center on the actual wall path, keeping the existing
 * 5% endpoint margin and 100cm drop radius. Curves use quadratic parameters. */
export function openingDropTarget(point: Point, walls: Wall[], radius = 100): { wallId: string; position: number } | null {
  let bestDistance = radius, result: { wallId: string; position: number } | null = null;
  for (const wall of walls) {
    const control = wall.curvePoint ?? { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 };
    const a = { x: wall.start.x - 2 * control.x + wall.end.x, y: wall.start.y - 2 * control.y + wall.end.y };
    const b = { x: 2 * (control.x - wall.start.x), y: 2 * (control.y - wall.start.y) };
    const d = { x: wall.start.x - point.x, y: wall.start.y - point.y };
    if (![a.x, a.y, b.x, b.y, d.x, d.y].every(Number.isFinite) || Math.hypot(a.x, a.y, b.x, b.y) < 1) continue;
    const dot = (u: Point, v: Point) => u.x * v.x + u.y * v.y;
    const candidates = [.05, .95, ...roots([2 * dot(a, a), 3 * dot(a, b), dot(b, b) + 2 * dot(a, d), dot(b, d)], .05, .95)];
    for (const t of candidates) {
      const distance = Math.hypot(a.x * t * t + b.x * t + d.x, a.y * t * t + b.y * t + d.y);
      if (distance < bestDistance) { bestDistance = distance; result = { wallId: wall.id, position: t }; }
    }
  }
  return result;
}
