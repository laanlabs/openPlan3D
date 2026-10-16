/**
 * Canvas interaction utilities: coordinate conversion, snap logic, and shared types.
 * Extracted from FloorPlanCanvas.svelte.
 */
import type { Point, Wall } from '$lib/models/types';

/** Shared canvas state passed to rendering / hit-test functions */
export interface CanvasState {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  zoom: number;
  camX: number;
  camY: number;
}

export const GRID = 20;
export const SNAP = 10;
export const MAGNETIC_SNAP = 15;
export const WALL_SNAP_DIST = 12;

export function screenToWorld(cs: CanvasState, sx: number, sy: number): Point {
  return { x: (sx - cs.width / 2) / cs.zoom + cs.camX, y: (sy - cs.height / 2) / cs.zoom + cs.camY };
}

export function worldToScreen(cs: CanvasState, wx: number, wy: number): { x: number; y: number } {
  return { x: (wx - cs.camX) * cs.zoom + cs.width / 2, y: (wy - cs.camY) * cs.zoom + cs.height / 2 };
}

export function snap(v: number, enabled: boolean, snapToGrid: boolean, gridSize: number): number {
  if (!enabled) return v;
  const step = snapToGrid ? gridSize : SNAP;
  return Math.round(v / step) * step;
}

export function magneticSnap(
  p: Point,
  walls: Wall[],
  snapFn: (v: number) => number,
  zoom: number,
  excludeWallIds?: Set<string>
): Point & { snappedToEndpoint?: boolean } {
  let best: Point & { snappedToEndpoint?: boolean } = { x: snapFn(p.x), y: snapFn(p.y) };
  let bestDist = MAGNETIC_SNAP / zoom;
  for (const w of walls) {
    if (excludeWallIds && excludeWallIds.has(w.id)) continue;
    for (const ep of [w.start, w.end]) {
      const d = Math.hypot(p.x - ep.x, p.y - ep.y);
      if (d < bestDist) {
        bestDist = d;
        best = { x: ep.x, y: ep.y, snappedToEndpoint: true };
      }
    }
  }
  return best;
}

export function angleSnap(start: Point, end: Point, enabled: boolean): Point {
  if (!enabled) return end;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 5) return end;
  const angle = Math.atan2(dy, dx);
  const snapAngles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
  const ANGLE_THRESHOLD = Math.PI / 18;
  for (const sa of snapAngles) {
    if (Math.abs(angle - sa) < ANGLE_THRESHOLD) {
      return { x: start.x + len * Math.cos(sa), y: start.y + len * Math.sin(sa) };
    }
  }
  return end;
}

/** Unit vectors of the 45° snap rays, exact on the axes so on-axis points stay untouched. */
const SNAP_RAYS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [Math.SQRT1_2, Math.SQRT1_2], [0, 1], [-Math.SQRT1_2, Math.SQRT1_2],
  [-1, 0], [-Math.SQRT1_2, -Math.SQRT1_2], [0, -1], [Math.SQRT1_2, -Math.SQRT1_2],
];

/**
 * Angle snap with a distance tolerance, for dragging wall endpoints (issue #104).
 * Moves `end` onto the nearest 45° ray from `start` only when it lies within
 * `maxDeviation` world units of that ray, keeping its projected length along the
 * ray rather than the hypotenuse. The correction is bounded by `maxDeviation`
 * whatever the wall length, unlike angleSnap's 10° threshold, which let a 5 m
 * wall jump by ~87 cm. Pass Infinity to force the nearest ray (Shift).
 */
export function angleSnapWithin(start: Point, end: Point, maxDeviation: number): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.hypot(dx, dy) < 5) return end;
  const [cos, sin] = SNAP_RAYS[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
  const deviation = Math.abs(dy * cos - dx * sin);
  if (deviation === 0 || deviation > maxDeviation) return end;
  const along = dx * cos + dy * sin;
  return { x: start.x + along * cos, y: start.y + along * sin };
}

export interface FurnitureResizeInput {
  position: Point;
  rotation: number;
  width: number;
  depth: number;
  scale: { x: number; y: number };
  handle: Exclude<HandleType, 'rotate'>;
  pointer: Point;
  preserveAspectRatio: boolean;
  minSize?: number;
}

export interface FurnitureResizeResult {
  position: Point;
  scale: { x: number; y: number };
}

/**
 * Resize a furniture rectangle from a handle while keeping the opposite edge
 * or corner fixed. All geometry is calculated in the item's local coordinates,
 * so the same rule works for rotated furniture.
 */
export function resizeFurnitureFromHandle(input: FurnitureResizeInput): FurnitureResizeResult {
  const minSize = input.minSize ?? 10;
  const originalScaleX = Math.abs(input.scale.x) || 1;
  const originalScaleY = Math.abs(input.scale.y) || 1;
  const originalWidth = input.width * originalScaleX;
  const originalDepth = input.depth * originalScaleY;
  const halfWidth = originalWidth / 2;
  const halfDepth = originalDepth / 2;
  const angle = -(input.rotation * Math.PI) / 180;
  const dx = input.pointer.x - input.position.x;
  const dy = input.pointer.y - input.position.y;
  const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
  const horizontal = !['resize-t', 'resize-b'].includes(input.handle);
  const vertical = !['resize-l', 'resize-r'].includes(input.handle);
  const direction = input.handle.slice('resize-'.length);
  const handleSignX = direction.includes('l') ? -1 : 1;
  const handleSignY = direction.includes('t') ? -1 : 1;
  const anchorX = horizontal ? -handleSignX * halfWidth : 0;
  const anchorY = vertical ? -handleSignY * halfDepth : 0;

  // Clamp at the opposite edge instead of growing again when the pointer crosses it.
  let newWidth = horizontal ? Math.max(minSize, handleSignX * (localX - anchorX)) : originalWidth;
  let newDepth = vertical ? Math.max(minSize, handleSignY * (localY - anchorY)) : originalDepth;

  if (input.preserveAspectRatio && horizontal && vertical) {
    const originalRatio = originalWidth / originalDepth;
    if (newWidth / newDepth > originalRatio) newDepth = newWidth / originalRatio;
    else newWidth = newDepth * originalRatio;
  }

  const edgeX = horizontal ? anchorX + handleSignX * newWidth : 0;
  const edgeY = vertical ? anchorY + handleSignY * newDepth : 0;
  const centerX = (anchorX + edgeX) / 2;
  const centerY = (anchorY + edgeY) / 2;
  const worldAngle = -angle;

  return {
    position: {
      x: input.position.x + centerX * Math.cos(worldAngle) - centerY * Math.sin(worldAngle),
      y: input.position.y + centerX * Math.sin(worldAngle) + centerY * Math.cos(worldAngle),
    },
    scale: {
      x: (input.scale.x < 0 ? -1 : 1) * newWidth / input.width,
      y: (input.scale.y < 0 ? -1 : 1) * newDepth / input.depth,
    },
  };
}

export function findConnectedEndpoints(pt: Point, excludeWallId: string, walls: Wall[]): { wallId: string; endpoint: 'start' | 'end' }[] {
  const tolerance = 2;
  const results: { wallId: string; endpoint: 'start' | 'end' }[] = [];
  for (const w of walls) {
    if (w.id === excludeWallId) continue;
    if (Math.hypot(w.start.x - pt.x, w.start.y - pt.y) < tolerance) {
      results.push({ wallId: w.id, endpoint: 'start' });
    }
    if (Math.hypot(w.end.x - pt.x, w.end.y - pt.y) < tolerance) {
      results.push({ wallId: w.id, endpoint: 'end' });
    }
  }
  return results;
}

/** Resize handle types for furniture */
export type HandleType = 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'resize-t' | 'resize-b' | 'resize-l' | 'resize-r' | 'rotate';
