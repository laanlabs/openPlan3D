import { formatArea } from '$lib/stores/settings';
import { roomLabelPosition } from './roomDetection';
import type { Room, Point } from '$lib/models/types';
import type { Floor } from '$lib/models/types';
import { wallPlanBounds } from './wallPlanGeometry';
import { furniturePlanBounds } from './furniturePlanBounds';
import { textAnnotationBounds } from './textAnnotationLayout';
import { dimensionPlanGeometry } from './dimensionPlanGeometry';

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

/** Content that can be displayed, even before a tracing image finishes loading. */
export function hasPlanContent(floor: Floor): boolean {
  return !!floor.backgroundImage || [floor.walls, floor.furniture, floor.stairs,
    floor.columns, floor.entourage, floor.measurements, floor.annotations,
    floor.textAnnotations].some(items => !!items?.length);
}

/** Finite plan geometry used by Fit, including floors without walls. */
export function planContentBounds(floor: Floor, options: {
  context: CanvasRenderingContext2D;
  entourageAspect: (id: string) => number;
  roomLabels?: { room: Room; polygon: Point[] }[];
  units?: 'metric' | 'imperial';
  zoom?: number;
  backgroundSize?: { width: number; height: number };
}): Bounds | null {
  let bounds: Bounds | null = null;
  function point(x: number, y: number) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (!bounds) bounds = { minX: x, maxX: x, minY: y, maxY: y };
    else {
      bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
    }
  }
  function add(b: Bounds) { point(b.minX, b.minY); point(b.maxX, b.maxY); }
  function rectangle(x: number, y: number, width: number, height: number, rotation: number) {
    const a = rotation * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    const dx = (Math.abs(width) * c + Math.abs(height) * s) / 2;
    const dy = (Math.abs(width) * s + Math.abs(height) * c) / 2;
    point(x - dx, y - dy); point(x + dx, y + dy);
  }
  for (const wall of floor.walls) add(wallPlanBounds(wall));
  for (const item of floor.furniture) add(furniturePlanBounds(item));
  for (const stair of floor.stairs ?? []) {
    const w = stair.stairType === 'spiral' ? Math.min(stair.width, stair.depth) : stair.width;
    const d = stair.stairType === 'spiral' ? w : stair.depth;
    rectangle(stair.position.x, stair.position.y, w, d, stair.rotation);
  }
  for (const col of floor.columns ?? []) rectangle(col.position.x, col.position.y, col.diameter, col.diameter, col.shape === 'square' ? col.rotation : 0);
  for (const item of floor.entourage ?? []) rectangle(item.position.x, item.position.y, item.width, item.width * options.entourageAspect(item.defId), item.rotation);
  for (const m of floor.measurements ?? []) { point(m.x1, m.y1); point(m.x2, m.y2); }
  for (const a of floor.annotations ?? []) {
    point(a.x1, a.y1); point(a.x2, a.y2);
    const g = dimensionPlanGeometry(a);
    if (g) { point(g.start.x, g.start.y); point(g.end.x, g.end.y); }
  }
  options.context.save();
  try {
    for (const note of floor.textAnnotations ?? []) add(textAnnotationBounds(note, options.context));
    for (const { room, polygon } of options.roomLabels ?? []) {
      if (polygon.length < 3) continue;
      const anchor = roomLabelPosition(room, polygon), ctx = options.context;
      const scale = options.zoom ?? 1;
      const fontSize = Math.max(11, 13 * scale);
      ctx.font = `${fontSize}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const m = ctx.measureText(`${room.name} (${formatArea(room.area, options.units ?? 'metric')})`);
      point(anchor.x - (m.actualBoundingBoxLeft ?? m.width / 2) / scale, anchor.y - (m.actualBoundingBoxAscent ?? fontSize) / scale);
      point(anchor.x + (m.actualBoundingBoxRight ?? m.width / 2) / scale, anchor.y + (m.actualBoundingBoxDescent ?? fontSize) / scale);
    }
  } finally { options.context.restore(); }
  if (floor.backgroundImage && options.backgroundSize) {
    const bg = floor.backgroundImage;
    rectangle(bg.position.x, bg.position.y, options.backgroundSize.width * bg.scale, options.backgroundSize.height * bg.scale, bg.rotation);
  }
  return bounds;
}
