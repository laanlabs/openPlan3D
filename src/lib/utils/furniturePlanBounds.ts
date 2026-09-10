import type { FurnitureItem } from '$lib/models/types';
import { getCatalogItem } from './furnitureCatalog';

/** Bounds of the rectangular plan symbol, including its 0.5 cm outline. */
export function furniturePlanBounds(item: FurnitureItem) {
  const catalog = getCatalogItem(item.catalogId);
  const width = item.width ?? catalog?.width ?? 30;
  const depth = item.depth ?? catalog?.depth ?? 30;
  const angle = (item.rotation || 0) * Math.PI / 180;
  const cosine = Math.abs(Math.cos(angle)), sine = Math.abs(Math.sin(angle));
  const halfWidth = Math.abs(width) / 2 + .25, halfDepth = Math.abs(depth) / 2 + .25;
  const dx = cosine * halfWidth + sine * halfDepth, dy = sine * halfWidth + cosine * halfDepth;
  return { minX: item.position.x - dx, maxX: item.position.x + dx,
    minY: item.position.y - dy, maxY: item.position.y + dy };
}
