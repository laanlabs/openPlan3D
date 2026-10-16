import type { FurnitureItem } from '$lib/models/types';
import { getCatalogItem, getFurnitureSize } from './furnitureCatalog';

/**
 * Where drawFurnitureItem and the SVG export put a furniture caption at `zoom` drawing units per cm:
 * centred `y` units below the item's centre in its rotated frame, in a `size`-unit sans-serif font.
 * Null when the symbol is too small to carry one.
 */
export function furnitureCaptionLayout(item: FurnitureItem, zoom = 1) {
  const { width, depth } = getFurnitureSize(item);
  const w = width * zoom, d = depth * zoom;
  if (!(Math.min(w, d) > 20)) return null;
  const fontSize = Math.max(8, Math.min(12, Math.min(w, d) * 0.2));
  return { size: fontSize * 0.7, y: d / 2 + fontSize * 0.8 };
}

/**
 * Plan bounds of that caption's ink, measured with `ctx` in the caption's font. `caption` falls back
 * as in drawFurnitureItem. A custom model's name, which defaults to its file name, can be far wider
 * than the symbol, so exports frame the caption as well.
 */
export function furnitureCaptionBounds(item: FurnitureItem, caption: string | undefined, ctx: CanvasRenderingContext2D, zoom = 1) {
  const layout = furnitureCaptionLayout(item, zoom);
  if (!layout) return null;
  ctx.font = `${layout.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const m = ctx.measureText(caption ?? getCatalogItem(item.catalogId)?.name ?? 'Unknown furniture');
  const left = -(m.actualBoundingBoxLeft ?? m.width / 2), right = m.actualBoundingBoxRight ?? m.width / 2;
  const top = layout.y - (m.actualBoundingBoxAscent ?? layout.size), bottom = layout.y + (m.actualBoundingBoxDescent ?? layout.size);
  const angle = (item.rotation || 0) * Math.PI / 180, cosine = Math.cos(angle), sine = Math.sin(angle);
  const points = [left, right].flatMap(x => [top, bottom].map(y => ({
    x: item.position.x + (x * cosine - y * sine) / zoom, y: item.position.y + (x * sine + y * cosine) / zoom })));
  return { minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
    minY: Math.min(...points.map(p => p.y)), maxY: Math.max(...points.map(p => p.y)) };
}
