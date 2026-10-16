import type { Door, Point, Wall } from '$lib/models/types';

/** Plan-view door glyph parts in plan coordinates (y down, like the editor canvas).
 * A swing arc runs from `from` to `to` (screen radians); the DXF exporter flips both.
 * `leaf` is the door panel, `panel` a sliding/bifold panel run, `track` the pocket cavity
 * and `threshold` the open-doorway face lines (both dashed); `hinge` is a screen marker. */
export type DoorSymbolPart =
  | { role: 'swing'; cx: number; cy: number; r: number; from: number; to: number }
  | { role: 'leaf' | 'panel' | 'track' | 'threshold'; points: Point[] }
  | { role: 'hinge'; x: number; y: number; r: number };

/** Shared by the SVG and DXF exporters so the symbol matches drawDoorOnWall and cannot drift.
 * `wall` must be straight: pass the frame from planOpening(). */
export function doorSymbol(wall: Wall, door: Pick<Door, 'position' | 'width' | 'type' | 'swingDirection' | 'flipSide'>): DoorSymbolPart[] {
  const wdx = wall.end.x - wall.start.x, wdy = wall.end.y - wall.start.y;
  const wlen = Math.hypot(wdx, wdy) || 1;
  const ux = wdx / wlen, uy = wdy / wlen, nx = -uy, ny = ux;
  const px = wall.start.x + wdx * door.position, py = wall.start.y + wdy * door.position;
  const hw = door.width / 2, thickness = Math.max(wall.thickness, 4);
  const wallAngle = Math.atan2(uy, ux);
  const swingDir = door.swingDirection === 'left' ? 1 : -1;
  const sideFlip = (door.flipSide ?? false) ? -1 : 1;
  const type = door.type || 'single';
  const parts: DoorSymbolPart[] = [];
  const line = (role: 'leaf' | 'panel' | 'track' | 'threshold', x1: number, y1: number, x2: number, y2: number) =>
    parts.push({ role, points: [{ x: x1, y: y1 }, { x: x2, y: y2 }] });

  if (type === 'single' || type === 'pocket') {
    const r = door.width, hx = px + ux * hw * swingDir, hy = py + uy * hw * swingDir;
    const sa = wallAngle + (swingDir === 1 ? Math.PI : 0), ea = sa + (-swingDir) * sideFlip * (Math.PI / 2);
    if (type === 'pocket') line('track', hx, hy, hx + ux * door.width * swingDir, hy + uy * door.width * swingDir);
    else parts.push({ role: 'swing', cx: hx, cy: hy, r, from: sa, to: ea });
    const panelAngle = type === 'pocket' ? sa : ea;
    line('leaf', hx, hy, hx + r * Math.cos(panelAngle), hy + r * Math.sin(panelAngle));
    parts.push({ role: 'hinge', x: hx, y: hy, r: 2.5 });
  } else if (type === 'double' || type === 'french') {
    const r = hw;
    for (const side of [-1, 1] as const) {
      const hx = px + ux * hw * side, hy = py + uy * hw * side;
      const arcSwing = side === -1 ? swingDir : -swingDir;
      const sa = wallAngle + Math.PI * (side === 1 ? 1 : 0), ea = sa + arcSwing * sideFlip * (Math.PI / 2);
      parts.push({ role: 'swing', cx: hx, cy: hy, r, from: sa, to: ea });
      line('leaf', hx, hy, hx + r * Math.cos(ea), hy + r * Math.sin(ea));
      parts.push({ role: 'hinge', x: hx, y: hy, r: 2 });
    }
  } else if (type === 'sliding') {
    const panelW = hw * 0.9, offset = thickness * 0.15 * sideFlip;
    line('panel', px - ux * hw, py - uy * hw, px + ux * panelW * 0.1, py + uy * panelW * 0.1);
    line('panel', px - ux * panelW * 0.1 + nx * offset, py - uy * panelW * 0.1 + ny * offset, px + ux * hw + nx * offset, py + uy * hw + ny * offset);
  } else if (type === 'bifold') {
    const panelCount = 4, panelW = door.width / panelCount, foldAngle = Math.PI / 6;
    const points: Point[] = [{ x: px - ux * hw, y: py - uy * hw }];
    for (let i = 0; i < panelCount; i++) {
      const angle = wallAngle + (i % 2 === 0 ? foldAngle * swingDir : -foldAngle * swingDir * 0.3), last = points[points.length - 1];
      points.push({ x: last.x + panelW * Math.cos(angle), y: last.y + panelW * Math.sin(angle) });
    }
    parts.push({ role: 'panel', points });
  } else if (type === 'garage') {
    line('leaf', px - ux * hw, py - uy * hw, px + ux * hw, py + uy * hw);
  } else if (type === 'opening') {
    for (const side of [-1, 1]) {
      const ox = nx * (thickness / 2) * side, oy = ny * (thickness / 2) * side;
      line('threshold', px - ux * hw + ox, py - uy * hw + oy, px + ux * hw + ox, py + uy * hw + oy);
    }
  }
  return parts;
}
