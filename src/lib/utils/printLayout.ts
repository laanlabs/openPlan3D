import type { CustomEntourageDef, Floor, FurnitureItem, Point, Project } from '$lib/models/types';
import { furnitureCaptionBounds } from './furnitureCaption';
import { getFurnitureSize } from './furnitureCatalog';
import { wallPointAt, entourageAspect } from './canvasRenderer';
import { planContentBounds } from './planContentBounds';
import { getRoomPolygon, resolveRooms } from './roomDetection';

export type PrintOptions = { pageSize: 'a4' | 'letter'; orientation: 'landscape' | 'portrait'; scale: 'fit' | 25 | 50 | 100 | 200 };
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

/** Conservative geometry bounds include wall thickness, curves and rotated objects. */
export function printBounds(floor: Floor, customEntourage?: CustomEntourageDef[]): Bounds | null {
  const points: Point[] = [];
  const box = (p: Point, width: number, depth = width, angle = 0) => {
    const r = angle * Math.PI / 180;
    for (const x of [-width / 2, width / 2]) for (const y of [-depth / 2, depth / 2]) {
      points.push({ x: p.x + x * Math.cos(r) - y * Math.sin(r), y: p.y + x * Math.sin(r) + y * Math.cos(r) });
    }
  };
  for (const wall of floor.walls) {
    for (const p of [wall.start, wall.end, ...(wall.curvePoint ? [wall.curvePoint] : [])]) box(p, wall.thickness);
  }
  for (const opening of [...floor.doors, ...floor.windows]) {
    const wall = floor.walls.find(w => w.id === opening.wallId);
    if (wall) box(wallPointAt(wall, opening.position), opening.width * 2);
  }
  for (const item of floor.furniture) {
    const size = getFurnitureSize(item);
    box(item.position, size.width, size.depth, item.rotation);
  }
  for (const item of floor.stairs ?? []) box(item.position, item.width, item.depth, item.rotation);
  for (const item of floor.columns ?? []) box(item.position, item.diameter, item.diameter, item.rotation);
  for (const item of floor.entourage ?? []) box(item.position, item.width, item.width * entourageAspect(item.defId, customEntourage), item.rotation);
  for (const item of floor.measurements ?? []) points.push({ x: item.x1, y: item.y1 }, { x: item.x2, y: item.y2 });
  for (const item of floor.annotations ?? []) {
    box({ x: item.x1, y: item.y1 }, Math.abs(item.offset ?? 40) * 2);
    box({ x: item.x2, y: item.y2 }, Math.abs(item.offset ?? 40) * 2);
  }
  for (const item of floor.textAnnotations ?? []) box({ x: item.x, y: item.y }, item.fontSize * Math.max(item.text.length, 1), item.fontSize * 2, item.rotation);
  const valid = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!valid.length) return null;
  return { minX: Math.min(...valid.map(p => p.x)), minY: Math.min(...valid.map(p => p.y)), maxX: Math.max(...valid.map(p => p.x)), maxY: Math.max(...valid.map(p => p.y)) };
}

/** What the page draws in text, measured on its canvas: labels keep a pixel size on paper, so their extent depends on the scale. */
export type PrintInk = {
  context: CanvasRenderingContext2D; pixelsPerMm: number; roomLabels: boolean; roomDimensions: boolean; units: 'metric' | 'imperial';
  /** The caption a furniture item is drawn with (a custom model's own name); undefined uses the catalog name. */
  furnitureCaption?: (item: FurnitureItem) => string | undefined;
};

/**
 * Lay the floor out on the page with room labels, notes, furniture captions and stair, measurement and
 * dimension captions inside the drawing area, not only the geometry, so Fit and the overflow check do
 * not crop them. Captions keep their size on paper, so their extent in plan centimetres grows as the
 * scale shrinks: Fit is measured again at each scale until it settles.
 */
export function printPageLayout(floor: Floor, customEntourage: CustomEntourageDef[] | undefined, options: PrintOptions, ink?: PrintInk) {
  const geometry = printBounds(floor, customEntourage);
  if (!geometry) return null;
  let layout = calculatePrintLayout(geometry, options);
  if (!ink) return layout;
  const rooms = ink.roomLabels || ink.roomDimensions ? resolveRooms(floor).map(room => ({ room, polygon: getRoomPolygon(room, floor.walls) })) : [];
  for (let pass = 0; pass < 8; pass++) {
    const zoom = layout.mmPerCm * ink.pixelsPerMm;
    const text = planContentBounds(floor, { context: ink.context, zoom, units: ink.units,
      entourageAspect: id => entourageAspect(id, customEntourage) || 1,
      roomLabels: ink.roomLabels ? rooms : undefined,
      automaticDimensions: { external: false, internal: ink.roomDimensions, edge: false },
      dimensionRooms: ink.roomDimensions ? rooms : undefined });
    const bounds = text ? { minX: Math.min(geometry.minX, text.minX), minY: Math.min(geometry.minY, text.minY),
      maxX: Math.max(geometry.maxX, text.maxX), maxY: Math.max(geometry.maxY, text.maxY) } : { ...geometry };
    for (const item of floor.furniture) {
      const b = furnitureCaptionBounds(item, ink.furnitureCaption?.(item), ink.context, zoom);
      if (!b) continue;
      bounds.minX = Math.min(bounds.minX, b.minX); bounds.minY = Math.min(bounds.minY, b.minY);
      bounds.maxX = Math.max(bounds.maxX, b.maxX); bounds.maxY = Math.max(bounds.maxY, b.maxY);
    }
    const next = calculatePrintLayout(bounds, options);
    // Done once the scale the captions were measured at is the scale the page uses.
    const settled = Math.abs(next.mmPerCm - layout.mmPerCm) <= layout.mmPerCm * 1e-5;
    layout = next;
    if (settled) break;
  }
  return layout;
}

export function calculatePrintLayout(bounds: Bounds, options: PrintOptions) {
  const portrait = options.pageSize === 'a4' ? [210, 297] : [215.9, 279.4];
  const [pageWidth, pageHeight] = options.orientation === 'portrait' ? portrait : [...portrait].reverse();
  const area = { x: 12, y: 30, width: pageWidth - 24, height: pageHeight - 52 };
  const width = Math.max(bounds.maxX - bounds.minX, 1), height = Math.max(bounds.maxY - bounds.minY, 1);
  // World coordinates are centimetres. 1cm = 10mm on a full-size drawing.
  const mmPerCm = options.scale === 'fit' ? Math.min(area.width / width, area.height / height) : 10 / options.scale;
  return {
    pageWidth, pageHeight, area, mmPerCm,
    fits: width * mmPerCm <= area.width + 1e-6 && height * mmPerCm <= area.height + 1e-6,
    center: { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 },
    scaleLabel: options.scale === 'fit' ? 'Fit to page' : `1:${options.scale}`,
  };
}

export function activePrintFloor(project: Project) {
  return project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
}
