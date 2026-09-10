import { expect, it } from 'vitest';
import { drawStair } from '$lib/utils/canvasRenderer';
import type { Stair } from '$lib/models/types';
function render(type: Stair['stairType'], direction: Stair['direction']) {
  let path: number[][] = [];
  const triangles: number[][][] = [], arcs: number[][] = [], labels: string[] = [];
  const ctx = { save() {}, restore() {}, translate() {}, rotate() {}, fillRect() {}, strokeRect() {}, stroke() {}, closePath() {},
    beginPath() { path = []; }, moveTo(x: number,y: number) { path.push([x,y]); }, lineTo(x: number,y: number) { path.push([x,y]); },
    fill() { if (path.length === 3) triangles.push(path); }, fillText(text: string) { labels.push(text); },
    arc(x: number,y: number,r: number,a: number,b: number,ccw = false) { arcs.push([x,y,r,a,b,Number(ccw)]); }
  } as unknown as CanvasRenderingContext2D;
  drawStair({ ctx, width: 500, height: 500, zoom: 1, camX: 0, camY: 0 }, {
    id: 's', position: { x: 0,y: 0 }, rotation: 0,width: 100,depth: 300,riserCount: 14,stairType: type,direction,
  }, false);
  return { triangles, arcs, labels };
}
for (const type of ['straight', 'l-shaped', 'u-shaped'] as const) it(`${type} reverses every arrowhead when direction changes`, () => {
  const up = render(type,'up'), down = render(type,'down');
  expect(up.triangles.length).toBe(type === 'u-shaped' ? 2 : 1);
  expect(down.triangles.length).toBe(up.triangles.length);
  up.triangles.forEach((t,i) => {
    const u = t[0][1] - (t[1][1]+t[2][1])/2;
    const d = down.triangles[i];
    const v = d[0][1] - (d[1][1]+d[2][1])/2;
    expect(u*v).toBeLessThan(0);
  });
  expect(up.labels[0]).toContain('UP'); expect(down.labels[0]).toContain('DN');
});
it('spiral reverses its arc and points the head in the travel direction', () => {
  for (const direction of ['up','down'] as const) {
    const { arcs, triangles } = render('spiral',direction);
    const arc = arcs.at(-1)!, head = triangles[0];
    expect(arc[5]).toBe(direction === 'up' ? 0 : 1);
    const tangent = arc[4] + (direction === 'up' ? 1 : -1) * Math.PI/2;
    const vx = head[0][0] - (head[1][0]+head[2][0])/2;
    const vy = head[0][1] - (head[1][1]+head[2][1])/2;
    expect(vx*Math.cos(tangent)+vy*Math.sin(tangent)).toBeGreaterThan(0);
    expect(head[0][0]).toBeCloseTo(arc[2]*Math.cos(arc[4]));
    expect(head[0][1]).toBeCloseTo(arc[2]*Math.sin(arc[4]));
  }
});
