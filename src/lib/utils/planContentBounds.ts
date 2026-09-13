import { openingPlanBounds } from './openingPlanBounds';
import { roomHoles } from './roomNesting';
import { entouragePlanBounds } from './entouragePlanBounds';
import { stairPlanBounds } from './stairPlanGeometry';
import { formatArea, formatLength } from '$lib/stores/settings';
import { wallLength, wallPointAt, wallTangentAt, wallEdgeInsets } from './canvasRenderer';
import { roomCentroid, roomLabelPosition } from './roomDetection';
import type { Room, Point } from '$lib/models/types';
import type { Floor, Wall } from '$lib/models/types';
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
  openingWalls?: Wall[];
  entourageAspect: (id: string) => number;
  measurementsVisible?: boolean;
  dimensionsVisible?: boolean;
  textAnnotationsVisible?: boolean;
  automaticDimensions?: { external: boolean; internal: boolean; edge: boolean };
  dimensionRooms?: { room: Room; polygon: Point[] }[];
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
  for (const [kind, openings] of [['door',floor.doors ?? []],['window',floor.windows ?? []]] as const) {
    for (const opening of openings) {
      const wall = (options.openingWalls ?? floor.walls).find(item => item.id === opening.wallId);
      if (wall) add(openingPlanBounds(wall,opening,kind,options.zoom ?? 1));
    }
  }
  for (const item of floor.furniture) add(furniturePlanBounds(item));
  for (const stair of floor.stairs ?? []) add(stairPlanBounds(stair));
  for (const col of floor.columns ?? []) rectangle(col.position.x, col.position.y, col.diameter, col.diameter, col.shape === 'square' ? col.rotation : 0);
  for (const item of floor.entourage ?? []) add(entouragePlanBounds(item, options.entourageAspect(item.defId)));
  options.context.save();
  try {
    const ctx = options.context, scale = options.zoom ?? 1;
    function caption(text: string, x: number, y: number, font: string, size: number, bottom = false) {
      ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = bottom ? 'bottom' : 'middle';
      const m = ctx.measureText(text);
      point(x - (m.actualBoundingBoxLeft ?? m.width / 2) / scale, y - (m.actualBoundingBoxAscent ?? size) / scale);
      point(x + (m.actualBoundingBoxRight ?? m.width / 2) / scale, y + (m.actualBoundingBoxDescent ?? (bottom ? 0 : size)) / scale);
    }
    for (const stair of floor.stairs ?? []) {
      const type = stair.stairType || 'straight', spiral = type === 'spiral';
      const label = (stair.direction === 'up' ? 'UP' : 'DN') + (!spiral && type !== 'straight' ? ` (${type})` : '');
      const localY = spiral ? Math.min(stair.width, stair.depth) / 2 + 12 : 0;
      const angle = stair.rotation * Math.PI / 180;
      add(textAnnotationBounds({ id: stair.id, text: label, fontSize: 10, color: '#374151', rotation: stair.rotation,
        x: stair.position.x - localY * Math.sin(angle), y: stair.position.y + localY * Math.cos(angle) }, ctx, scale));
      if (spiral) {
        const r = Math.min(stair.width, stair.depth) / 2 + 6 / scale;
        rectangle(stair.position.x, stair.position.y, r * 2, r * 2, 0);
      }
    }
    if (options.automaticDimensions?.external) for (const wall of floor.walls) {
      const length = wallLength(wall);
      if (length < 10) continue;
      const tangent = wallTangentAt(wall, .5), normal = { x: -tangent.y, y: tangent.x };
      const halfThickness = Math.max(wall.thickness * scale, 4) / (2 * scale);
      const size = Math.max(10, 11 * scale);
      if (wall.curvePoint) {
        const middle = wallPointAt(wall, .5), offset = halfThickness + 16 / scale;
        caption(formatLength(length, options.units ?? 'metric'), middle.x + normal.x * offset,
          middle.y + normal.y * offset, `${size}px sans-serif`, size);
        continue;
      }
      const inset = options.automaticDimensions.edge ? wallEdgeInsets(wall, floor.walls) : { start: 0, end: 0 };
      const start = { x: wall.start.x + tangent.x * inset.start, y: wall.start.y + tangent.y * inset.start };
      const end = { x: wall.end.x - tangent.x * inset.end, y: wall.end.y - tangent.y * inset.end };
      const text = formatLength(Math.max(0, length - inset.start - inset.end), options.units ?? 'metric');
      const offset = halfThickness + 20 / scale, tick = Math.max(4, 5 * scale) / scale;
      // Rendering may flip the dimension side near the viewport edge. Include both
      // sides so Fit does not depend on the camera it is replacing.
      for (const side of [-1, 1]) {
        const middle = { x: (start.x + end.x) / 2 + normal.x * offset * side,
          y: (start.y + end.y) / 2 + normal.y * offset * side };
        caption(text, middle.x, middle.y, `${size}px sans-serif`, size);
        const gap = (ctx.measureText(text).width / 2 + 4) / scale;
        for (const dir of [-1, 1]) point(middle.x + tangent.x * gap * dir, middle.y + tangent.y * gap * dir);
        for (const p of [start, end]) {
          const x = p.x + normal.x * offset * side, y = p.y + normal.y * offset * side;
          for (const dir of [-1, 1]) point(x + (tangent.x + normal.x * side) * tick * dir,
            y + (tangent.y + normal.y * side) * tick * dir);
          point(x + normal.x * 4 / scale * side, y + normal.y * 4 / scale * side);
        }
      }
    }
    if (options.automaticDimensions?.internal) for (const { polygon } of options.dimensionRooms ?? []) {
      if (polygon.length < 3) continue;
      const width = Math.max(...polygon.map(p => p.x)) - Math.min(...polygon.map(p => p.x));
      const depth = Math.max(...polygon.map(p => p.y)) - Math.min(...polygon.map(p => p.y));
      if (width <= 10 || depth <= 10) continue;
      const center = roomCentroid(polygon), size = Math.max(9, 10 * scale);
      caption(`${formatLength(width, options.units ?? 'metric')} × ${formatLength(depth, options.units ?? 'metric')}`,
        center.x, center.y + (Math.max(11, 13 * scale) + 2) / scale, `${size}px sans-serif`, size);
    }
    if (options.measurementsVisible !== false) for (const m of floor.measurements ?? []) {
      for (const [x, y] of [[m.x1, m.y1], [m.x2, m.y2]]) rectangle(x, y, 6 / scale, 6 / scale, 0);
      caption(formatLength(Math.hypot(m.x2 - m.x1, m.y2 - m.y1), options.units ?? 'metric'),
        (m.x1 + m.x2) / 2, (m.y1 + m.y2) / 2 - 6 / scale, 'bold 12px sans-serif', 12, true);
    }
    if (options.dimensionsVisible !== false) for (const a of floor.annotations ?? []) {
      const g = dimensionPlanGeometry(a);
      if (!g) continue;
      point(a.x1, a.y1); point(a.x2, a.y2);
      const arrowExtent = (Math.max(6, 7 * scale) + Math.max(2.5, 3 * scale)) / scale;
      for (const p of [g.start, g.end]) rectangle(p.x, p.y, Math.max(4, arrowExtent) * 2, Math.max(4, arrowExtent) * 2, 0);
      const size = Math.max(10, 11 * scale);
      caption(a.label || formatLength(g.length, options.units ?? 'metric'), g.center.x, g.center.y, `${size}px sans-serif`, size);
    }
    if (options.textAnnotationsVisible !== false) for (const note of floor.textAnnotations ?? []) add(textAnnotationBounds(note, options.context, options.zoom ?? 1));
    const labels=options.roomLabels ?? [], holes=roomHoles(labels.map(r=>r.polygon));
    for (const [index, { room, polygon }] of labels.entries()) {
      if (polygon.length < 3) continue;
      const anchor = roomLabelPosition(room, polygon, holes[index]), ctx = options.context;
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
