import { stairContainsLocalPoint } from './stairPlanGeometry';
import { roomHoles } from './roomNesting';
/**
 * Hit-testing utilities for the floor plan canvas.
 * All functions are pure — they take data and return results.
 * Extracted from FloorPlanCanvas.svelte.
 */
import type { Point, Wall, Door, Window as Win, FurnitureItem, Stair, Column, Floor, Measurement, Annotation, TextAnnotation, EntourageItem } from '$lib/models/types';
import type { Room } from '$lib/models/types';
import { getFurnitureSize } from '$lib/utils/furnitureCatalog';
import { getRoomPolygon, roomLabelPosition } from '$lib/utils/roomDetection';
import { wallPointAt, wallTangentAt } from '$lib/utils/canvasRenderer';
import type { HandleType } from '$lib/utils/canvasInteraction';

export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if ((poly[i].y > p.y) !== (poly[j].y > p.y) &&
        p.x < (poly[j].x - poly[i].x) * (p.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointToSegmentDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function positionOnWall(p: Point, w: Wall): number {
  if (w.curvePoint) {
    let bestT = 0.5, bestDist = Infinity;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const pt = wallPointAt(w, t);
      const d = Math.hypot(p.x - pt.x, p.y - pt.y);
      if (d < bestDist) { bestDist = d; bestT = t; }
    }
    return Math.max(0.1, Math.min(0.9, bestT));
  }
  const dx = w.end.x - w.start.x, dy = w.end.y - w.start.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return 0.5;
  return Math.max(0.1, Math.min(0.9, ((p.x - w.start.x) * dx + (p.y - w.start.y) * dy) / len2));
}

export function findWallAt(p: Point, walls: Wall[], zoom: number): Wall | null {
  const threshold = 15 / zoom;
  for (const w of walls) {
    if (w.curvePoint) {
      for (let i = 0; i <= 20; i++) {
        const pt = wallPointAt(w, i / 20);
        if (Math.hypot(p.x - pt.x, p.y - pt.y) < threshold + w.thickness / 2) return w;
      }
    } else {
      if (pointToSegmentDist(p, w.start, w.end) < threshold) return w;
    }
  }
  return null;
}

export function findHandleAt(
  p: Point,
  selectedId: string | null,
  furniture: FurnitureItem[],
  zoom: number
): HandleType | null {
  if (!selectedId) return null;
  const fi = furniture.find(f => f.id === selectedId);
  if (!fi) return null;
  const dx = p.x - fi.position.x;
  const dy = p.y - fi.position.y;
  const angle = -(fi.rotation * Math.PI) / 180;
  const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
  const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
  const size = getFurnitureSize(fi);
  const hw = size.width / 2;
  const hd = size.depth / 2;
  const ht = 8 / zoom;

  const rotHandleDist = 18 / zoom;
  if (Math.abs(rx) < ht && Math.abs(ry - (-hd - rotHandleDist)) < ht) return 'rotate';

  if (Math.abs(rx - (-hw)) < ht && Math.abs(ry - (-hd)) < ht) return 'resize-tl';
  if (Math.abs(rx - hw) < ht && Math.abs(ry - (-hd)) < ht) return 'resize-tr';
  if (Math.abs(rx - (-hw)) < ht && Math.abs(ry - hd) < ht) return 'resize-bl';
  if (Math.abs(rx - hw) < ht && Math.abs(ry - hd) < ht) return 'resize-br';

  // Edge midpoint handles
  if (Math.abs(rx) < ht && Math.abs(ry - (-hd)) < ht) return 'resize-t';
  if (Math.abs(rx) < ht && Math.abs(ry - hd) < ht) return 'resize-b';
  if (Math.abs(rx - (-hw)) < ht && Math.abs(ry) < ht) return 'resize-l';
  if (Math.abs(rx - hw) < ht && Math.abs(ry) < ht) return 'resize-r';

  return null;
}

export function findFurnitureAt(p: Point, furniture: FurnitureItem[]): FurnitureItem | null {
  for (const fi of [...furniture].reverse()) {
    const dx = p.x - fi.position.x;
    const dy = p.y - fi.position.y;
    const angle = -(fi.rotation * Math.PI) / 180;
    const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
    const size = getFurnitureSize(fi);
    const hw = size.width / 2;
    const hd = size.depth / 2;
    if (Math.abs(rx) < hw && Math.abs(ry) < hd) return fi;
  }
  return null;
}

export function findColumnAt(p: Point, columns: Column[] | undefined): Column | null {
  if (!columns) return null;
  for (const col of [...columns].reverse()) {
    const dx = p.x - col.position.x;
    const dy = p.y - col.position.y;
    if (col.shape === 'round') {
      if (Math.hypot(dx, dy) < col.diameter / 2) return col;
    } else {
      const angle = -(col.rotation * Math.PI) / 180;
      const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
      if (Math.abs(rx) < col.diameter / 2 && Math.abs(ry) < col.diameter / 2) return col;
    }
  }
  return null;
}

export function findStairAt(p: Point, stairs: Stair[] | undefined): Stair | null {
  if (!stairs) return null;
  for (const stair of [...stairs].reverse()) {
    const dx = p.x - stair.position.x;
    const dy = p.y - stair.position.y;
    const angle = -(stair.rotation * Math.PI) / 180;
    const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
    if (stairContainsLocalPoint(stair, rx, ry)) return stair;
  }
  return null;
}

/** Match the wall-aligned gap drawn by the opening renderer, with a 5px pick margin. */
function hitsOpening(p: Point, opening: Door | Win, wall: Wall, zoom: number): boolean {
  if (!Number.isFinite(zoom) || zoom <= 0 || !Number.isFinite(opening.width) || opening.width <= 0) return false;
  const center = wallPointAt(wall, opening.position);
  const tangent = wallTangentAt(wall, opening.position);
  if (Math.hypot(tangent.x, tangent.y) < 0.5) return false;
  const dx = p.x - center.x, dy = p.y - center.y;
  const along = dx * tangent.x + dy * tangent.y;
  const across = -dx * tangent.y + dy * tangent.x;
  const margin = 5 / zoom;
  return Math.abs(along) <= opening.width / 2 + margin
    && Math.abs(across) <= Math.max(wall.thickness, 4 / zoom) / 2 + margin;
}

export function findDoorAt(p: Point, doors: Door[], walls: Wall[], zoom: number): Door | null {
  for (const d of [...doors].reverse()) {
    const wall = walls.find(w => w.id === d.wallId);
    if (!wall) continue;
    if (hitsOpening(p, d, wall, zoom)) return d;
  }
  return null;
}

export function findWindowAt(p: Point, windows: Win[], walls: Wall[], zoom: number): Win | null {
  for (const w of [...windows].reverse()) {
    const wall = walls.find(wl => wl.id === w.wallId);
    if (!wall) continue;
    if (hitsOpening(p, w, wall, zoom)) return w;
  }
  return null;
}

export function findRoomAt(p: Point, rooms: Room[], walls: Wall[], polygons?: ReadonlyMap<string, Point[]>): Room | null {
  let selected: Room | null = null;
  let smallest = Infinity;
  for (const room of rooms) {
    const poly = polygons?.get(room.id) ?? getRoomPolygon(room, walls);
    if (!pointInPolygon(p, poly)) continue;
    const area = footprintArea(poly);
    if (area < smallest) { selected = room; smallest = area; }
  }
  return selected;
}

// Use the enclosing footprint, not net room.area: an outer ring may have less
// floor area than its child after subtracting nested rooms.
function footprintArea(poly: Point[]): number {
  if (poly.length < 3) return Infinity;
  const origin = poly[0];
  return Math.abs(poly.reduce((sum,p,i) => {
    const q=poly[(i+1)%poly.length];
    return sum+(p.x-origin.x)*(q.y-origin.y)-(q.x-origin.x)*(p.y-origin.y);
  },0));
}

/** Closest label wins; coincident label anchors prefer the innermost room. */
export function findRoomLabelAt(p: Point, rooms: Room[], walls: Wall[], zoom: number,
  polygons?: ReadonlyMap<string, Point[]>): Room | null {
  let selected: Room | null = null, nearest = Infinity, smallest = Infinity;
  const rings=rooms.map(room=>polygons?.get(room.id) ?? getRoomPolygon(room,walls));
  const holes=roomHoles(rings);
  for (const [index, room] of rooms.entries()) {
    const poly=rings[index];
    if (poly.length<3) continue;
    const anchor=roomLabelPosition(room,poly,holes[index]), dx=p.x-anchor.x, dy=p.y-anchor.y;
    if (Math.abs(dx)>=80/zoom || Math.abs(dy)>=40/zoom) continue;
    const distance=dx*dx+dy*dy, area=footprintArea(poly);
    if (distance<nearest || (distance===nearest && area<smallest)) {
      selected=room;nearest=distance;smallest=area;
    }
  }
  return selected;
}

export function hitTestMeasurement(wp: Point, floor: Floor, zoom: number): string | null {
  if (!floor.measurements) return null;
  const threshold = 8 / zoom;
  for (const m of floor.measurements) {
    const dx = m.x2 - m.x1, dy = m.y2 - m.y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    let t = ((wp.x - m.x1) * dx + (wp.y - m.y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = m.x1 + t * dx, py = m.y1 + t * dy;
    const dist = Math.hypot(wp.x - px, wp.y - py);
    if (dist < threshold) return m.id;
  }
  return null;
}

export function hitTestAnnotation(wp: Point, floor: Floor, zoom: number): string | null {
  if (!floor.annotations) return null;
  const threshold = 10 / zoom;
  for (const a of floor.annotations) {
    const offset = a.offset ?? 40;
    const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;
    const d1x = a.x1 + nx * offset, d1y = a.y1 + ny * offset;
    const d2x = a.x2 + nx * offset, d2y = a.y2 + ny * offset;
    const ddx = d2x - d1x, ddy = d2y - d1y;
    const len2 = ddx * ddx + ddy * ddy;
    if (len2 === 0) continue;
    let t = ((wp.x - d1x) * ddx + (wp.y - d1y) * ddy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = d1x + t * ddx, py = d1y + t * ddy;
    const dist = Math.hypot(wp.x - px, wp.y - py);
    if (dist < threshold) return a.id;
    for (const [lx1, ly1, lx2, ly2] of [[a.x1, a.y1, d1x, d1y], [a.x2, a.y2, d2x, d2y]]) {
      const ldx = lx2 - lx1, ldy = ly2 - ly1;
      const llen2 = ldx * ldx + ldy * ldy;
      if (llen2 === 0) continue;
      let lt = ((wp.x - lx1) * ldx + (wp.y - ly1) * ldy) / llen2;
      lt = Math.max(0, Math.min(1, lt));
      const lpx = lx1 + lt * ldx, lpy = ly1 + lt * ldy;
      if (Math.hypot(wp.x - lpx, wp.y - lpy) < threshold) return a.id;
    }
  }
  return null;
}

export function hitTestTextAnnotation(wp: Point, floor: Floor, ctx: CanvasRenderingContext2D, zoom: number): string | null {
  if (!floor.textAnnotations) return null;
  for (let i = floor.textAnnotations.length - 1; i >= 0; i--) {
    const ta = floor.textAnnotations[i];
    let dx = wp.x - ta.x;
    let dy = wp.y - ta.y;
    if (ta.rotation) {
      const angle = -ta.rotation * Math.PI / 180;
      const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
      dx = rx; dy = ry;
    }
    ctx.font = `${ta.fontSize}px sans-serif`;
    const lines = ta.text.split('\n');
    const lineHeight = ta.fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    let maxW = 0;
    for (const line of lines) {
      const w = ctx.measureText(line).width / zoom;
      if (w > maxW) maxW = w;
    }
    const pad = 8 / zoom;
    if (Math.abs(dx) < maxW / 2 + pad && Math.abs(dy) < totalHeight / 2 + pad) return ta.id;
  }
  return null;
}

/** Hit-test entourage items (topmost first). aspectOf resolves defId -> height/width. */
export function findEntourageAt(
  p: Point,
  items: EntourageItem[] | undefined,
  aspectOf: (defId: string) => number,
): EntourageItem | null {
  if (!items) return null;
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    const w = it.width;
    const h = w * aspectOf(it.defId);
    // Transform the point into the item's local (unrotated) frame
    const a = (-(it.rotation || 0) * Math.PI) / 180;
    const dx = p.x - it.position.x;
    const dy = p.y - it.position.y;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2) return it;
  }
  return null;
}
