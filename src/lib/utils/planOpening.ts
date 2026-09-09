import type { Wall, Point } from '$lib/models/types';
import { wallPathProfile } from './wallProfiles';

/** Clip physical opening width along the viewer's path, then place the rigid
 * plan symbol between the actual jamb points. Source objects remain untouched. */
export function planOpening(wall: Wall, position: number, width: number) {
  if (!Number.isFinite(position) || !Number.isFinite(width) || width <= 0) return null;
  if (!wall.curvePoint) return { wall, position, width, curve: null };
  const path = wallPathProfile(wall), center = path.distanceAt(position);
  const left = Math.max(0, center - width / 2), right = Math.min(path.length, center + width / 2);
  if (right <= left) return null;
  const parameter = (distance: number) => {
    const i = path.spans.findIndex(s => distance <= s.to);
    const index = i < 0 ? path.spans.length - 1 : i, span = path.spans[index];
    return (index + (span.length ? (distance - span.from) / span.length : 0)) / path.spans.length;
  };
  const point = (t: number): Point => ({
    x: (1-t)**2*wall.start.x + 2*(1-t)*t*wall.curvePoint!.x + t*t*wall.end.x,
    y: (1-t)**2*wall.start.y + 2*(1-t)*t*wall.curvePoint!.y + t*t*wall.end.y,
  });
  const t0 = parameter(left), t1 = parameter(right), start = point(t0), end = point(t1);
  const control = { x: start.x + (t1-t0)*((1-t0)*(wall.curvePoint.x-wall.start.x)+t0*(wall.end.x-wall.curvePoint.x)),
    y: start.y + (t1-t0)*((1-t0)*(wall.curvePoint.y-wall.start.y)+t0*(wall.end.y-wall.curvePoint.y)) };
  const chord = Math.hypot(end.x-start.x, end.y-start.y);
  if (chord <= 1e-9) return null;
  return { wall: { ...wall, start, end, curvePoint: undefined }, position: .5, width: chord, curve: { start, control, end } };
}

/** Subtract opening intervals before drawing CAD wall outlines. */
export function planWallSpans(wall: Wall, openings: { position: number; width: number }[]) {
  const path = wallPathProfile(wall);
  const holes = openings.filter(o => Number.isFinite(o.position) && Number.isFinite(o.width) && o.width > 0).map(o => {
    const center = path.distanceAt(o.position);
    return { left: Math.max(0, center-o.width/2), right: Math.min(path.length, center+o.width/2) };
  }).filter(h => h.right > h.left);
  return path.spans.flatMap(span => {
    if (span.length <= 0) return [];
    const cuts = holes.filter(h => h.left < span.to && h.right > span.from);
    const edges = [...new Set([span.from, span.to, ...cuts.flatMap(h => [Math.max(span.from,h.left),Math.min(span.to,h.right)])])].sort((a,b)=>a-b);
    const point = (distance: number) => {
      const t = (distance-span.from)/span.length;
      return { x: span.start.x+(span.end.x-span.start.x)*t, y: span.start.y+(span.end.y-span.start.y)*t };
    };
    return edges.slice(1).flatMap((right,i) => {
      const left=edges[i];
      return cuts.some(h => h.left < right && h.right > left) ? [] : [{ start:point(left),end:point(right) }];
    });
  });
}
