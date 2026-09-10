import type { Floor } from '$lib/models/types';

/** Content currently drawn by all four plan exporters (PNG, PDF, SVG and DXF). */
export function hasPlanExportContent(floor: Floor): boolean {
  return floor.walls.length > 0 || floor.furniture.length > 0
    || !!floor.columns?.length
    || !!floor.measurements?.length
    || !!floor.annotations?.some(a => Math.hypot(a.x2 - a.x1, a.y2 - a.y1) >= 1)
    || !!floor.textAnnotations?.some(note => note.text.trim().length > 0);
}
