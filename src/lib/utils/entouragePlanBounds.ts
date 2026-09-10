import type { EntourageItem } from '$lib/models/types';

/** Bounds of the rotated symbol rectangle, with its resolved height/width ratio. */
export function entouragePlanBounds(item: EntourageItem, aspect: number) {
  const angle = (item.rotation || 0) * Math.PI / 180;
  const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
  const width = Math.abs(item.width), height = width * Math.abs(aspect || 1);
  const dx = (width * c + height * s) / 2, dy = (width * s + height * c) / 2;
  return { minX: item.position.x - dx, maxX: item.position.x + dx,
    minY: item.position.y - dy, maxY: item.position.y + dy };
}
