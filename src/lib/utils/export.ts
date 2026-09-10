import { canvasPNG } from './canvasPNG';
import { planOpening } from './planOpening';
import { wallPlanBounds, wallPlanDimension } from './wallPlanGeometry';
import type { Project, Floor } from '$lib/models/types';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { resolveRooms, getRoomPolygon, roomLabelPosition } from '$lib/utils/roomDetection';
import { drawDoorOnWall, drawWindowOnWall, drawEntourageItems } from '$lib/utils/canvasRenderer';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import { projectSettings, formatArea } from '$lib/stores/settings';
import { get } from 'svelte/store';
import jsPDF from 'jspdf';

/** Escape text for safe SVG embedding */
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Extend plan bounds so door swing arcs (radius up to door width) aren't clipped.
 */
function extendBoundsForOpenings(
  floor: Floor,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
) {
  for (const d of floor.doors) {
    const wall = floor.walls.find(w => w.id === d.wallId);
    if (!wall) continue;
    const frame = planOpening(wall, d.position, d.width);
    if (!frame) continue;
    const px = frame.wall.start.x + (frame.wall.end.x - frame.wall.start.x) * frame.position;
    const py = frame.wall.start.y + (frame.wall.end.y - frame.wall.start.y) * frame.position;
    bounds.minX = Math.min(bounds.minX, px - d.width);
    bounds.minY = Math.min(bounds.minY, py - d.width);
    bounds.maxX = Math.max(bounds.maxX, px + d.width);
    bounds.maxY = Math.max(bounds.maxY, py + d.width);
  }
}

/** Include label ink, not just its anchor, before framing a plan export. */
function extendBoundsForRoomLabels(floor: Floor, bounds: { minX: number; minY: number; maxX: number; maxY: number }) {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return;
  for (const room of resolveRooms(floor)) {
    const poly = getRoomPolygon(room, floor.walls);
    if (poly.length < 3) continue;
    const anchor = roomLabelPosition(room, poly);
    ctx.font = 'bold 13px sans-serif';
    const nameWidth = ctx.measureText(room.name).width;
    ctx.font = '11px sans-serif';
    const width = Math.max(nameWidth, ctx.measureText(formatArea(room.area, get(projectSettings).units)).width);
    bounds.minX = Math.min(bounds.minX, anchor.x - width / 2);
    bounds.maxX = Math.max(bounds.maxX, anchor.x + width / 2);
    bounds.minY = Math.min(bounds.minY, anchor.y - 13);
    bounds.maxY = Math.max(bounds.maxY, anchor.y + 18);
  }
}

/**
 * Draw all doors and windows onto an export canvas using the shared
 * full-fidelity renderer. The CanvasState below maps world→canvas as
 * `wx - minX + pad`, matching the export drawing convention.
 */
function drawOpeningsOnCanvas(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  minX: number,
  minY: number,
  pad: number,
) {
  const cs: CanvasState = { ctx, width: pad * 2, height: pad * 2, zoom: 1, camX: minX, camY: minY };
  for (const opening of [...floor.doors, ...floor.windows]) {
    const source = floor.walls.find(w => w.id === opening.wallId);
    if (!source) continue;
    const frame = planOpening(source, opening.position, opening.width);
    if (!frame) continue;
    if (frame.curve) {
      const { start, control, end } = frame.curve;
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = source.thickness + 2; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(start.x-minX+pad, start.y-minY+pad);
      ctx.quadraticCurveTo(control.x-minX+pad, control.y-minY+pad, end.x-minX+pad, end.y-minY+pad);
      ctx.stroke(); ctx.restore();
    }
    const symbol = { ...opening, position: frame.position, width: frame.width };
    if (floor.doors.includes(opening as typeof floor.doors[number])) drawDoorOnWall(cs, frame.wall, symbol as typeof floor.doors[number]);
    else drawWindowOnWall(cs, frame.wall, symbol as typeof floor.windows[number]);
  }
}

/**
 * Export the full floor plan as a high-resolution PNG.
 * Renders all walls/rooms/doors/furniture onto an offscreen canvas
 * so the export isn't limited to the current viewport.
 */
export async function exportAsPNG(canvas: HTMLCanvasElement | null, project?: Project) {
  const name = project?.name || 'floorplan';

  if (project) {
    const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
    if (floor && floor.walls.length > 0) {
      // Compute bounds of all geometry
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const w of floor.walls) {
        for (const b of [wallPlanBounds(w)]) {
          minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
          maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
        }
      }
      for (const fi of floor.furniture) {
        minX = Math.min(minX, fi.position.x - 50);
        minY = Math.min(minY, fi.position.y - 50);
        maxX = Math.max(maxX, fi.position.x + 50);
        maxY = Math.max(maxY, fi.position.y + 50);
      }
      const bounds = { minX, minY, maxX, maxY };
      extendBoundsForOpenings(floor, bounds);
      extendBoundsForRoomLabels(floor, bounds);
      ({ minX, minY, maxX, maxY } = bounds);
      const pad = 80;
      const w = maxX - minX + pad * 2;
      const h = maxY - minY + pad * 2;
      // Prefer 2x resolution, bounded to 4096 pixels per side.
      const scale = Math.min(2, 4096 / Math.max(w, h));
      const offscreen = document.createElement('canvas');
      offscreen.width = w * scale;
      offscreen.height = h * scale;
      const ctx = offscreen.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, w, h);

      // Draw room fills
      const ROOM_COLORS = ['#bfdbfe', '#fde68a', '#bbf7d0', '#fecaca', '#ddd6fe', '#a5f3fc', '#fed7aa'];
      const rooms = resolveRooms(floor);
      for (let ri = 0; ri < rooms.length; ri++) {
        const room = rooms[ri];
        const poly = getRoomPolygon(room, floor.walls);
        if (poly.length < 3) continue;
        ctx.fillStyle = ROOM_COLORS[ri % ROOM_COLORS.length];
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(poly[0].x - minX + pad, poly[0].y - minY + pad);
        for (let i = 1; i < poly.length; i++) {
          ctx.lineTo(poly[i].x - minX + pad, poly[i].y - minY + pad);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        // Room label
        const c = roomLabelPosition(room, poly);
        ctx.fillStyle = '#444';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(room.name, c.x - minX + pad, c.y - minY + pad);
        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.fillText(formatArea(room.area, get(projectSettings).units), c.x - minX + pad, c.y - minY + pad + 14);
      }

      // Draw walls
      ctx.strokeStyle = '#333';
      ctx.lineCap = 'round';
      for (const wall of floor.walls) {
        ctx.lineWidth = wall.thickness;
        ctx.beginPath();
        ctx.moveTo(wall.start.x - minX + pad, wall.start.y - minY + pad);
        if (wall.curvePoint) ctx.quadraticCurveTo(wall.curvePoint.x - minX + pad, wall.curvePoint.y - minY + pad, wall.end.x - minX + pad, wall.end.y - minY + pad);
        else ctx.lineTo(wall.end.x - minX + pad, wall.end.y - minY + pad);
        ctx.stroke();
        // Dimension label
        const { length: len, point: midpoint } = wallPlanDimension(wall);
        const mx = midpoint.x - minX + pad;
        const my = midpoint.y - minY + pad;
        ctx.fillStyle = '#666';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${len} cm`, mx, my);
      }

      // Entourage symbols (images may need a prior on-canvas render to be cached)
      if (floor.entourage?.length) {
        drawEntourageItems({ ctx, width: pad * 2, height: pad * 2, zoom: 1, camX: minX, camY: minY }, floor, null, project.customEntourage);
      }

      // Draw doors and windows (shared full-fidelity renderer)
      drawOpeningsOnCanvas(ctx, floor, minX, minY, pad);

      // Draw furniture
      for (const fi of floor.furniture) {
        const fx = fi.position.x - minX + pad;
        const fy = fi.position.y - minY + pad;
        const cat = getCatalogItem(fi.catalogId);
        const fw = fi.width ?? (cat ? cat.width : 30);
        const fd = fi.depth ?? (cat ? cat.depth : 30);
        const color = fi.color ?? (cat ? cat.color : '#a0c4e8');
        const rot = (fi.rotation || 0) * Math.PI / 180;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = color;
        ctx.fillRect(-fw / 2, -fd / 2, fw, fd);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-fw / 2, -fd / 2, fw, fd);
        ctx.globalAlpha = 1;
        if (cat) {
          ctx.fillStyle = '#333';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(cat.name, 0, 4);
        }
        ctx.restore();
      }

      // Title
      ctx.fillStyle = '#222';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${name} — ${floor.name}`, 20, 24);

      download(await canvasPNG(offscreen), `${name}.png`);
      return true;
    }
  }

  // Project exports never substitute an unrelated viewport for an empty floor.
  if (project) return false;
  if (!canvas) throw new Error('No viewport available');
  download(await canvasPNG(canvas), `${name}-2d.png`);
  return true;
}

export { downloadProjectJSON as exportAsJSON } from './projectBackup';

export function exportAsSVG(project: Project) {
  const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
  if (!floor || floor.walls.length === 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of floor.walls) {
    for (const b of [wallPlanBounds(w)]) {
      minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
    }
  }
  const svgBounds = { minX, minY, maxX, maxY };
  extendBoundsForOpenings(floor, svgBounds);
  extendBoundsForRoomLabels(floor, svgBounds);
  ({ minX, minY, maxX, maxY } = svgBounds);
  const pad = 50;
  const vw = maxX - minX + pad * 2;
  const vh = maxY - minY + pad * 2;

  let paths = '';

  // Room fills
  const ROOM_COLORS_SVG = ['#bfdbfe', '#fde68a', '#bbf7d0', '#fecaca', '#ddd6fe', '#a5f3fc', '#fed7aa'];
  const rooms = resolveRooms(floor);
  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri];
    const poly = getRoomPolygon(room, floor.walls);
    if (poly.length < 3) continue;
    const pts = poly.map(p => `${p.x - minX + pad},${p.y - minY + pad}`).join(' ');
    const color = ROOM_COLORS_SVG[ri % ROOM_COLORS_SVG.length];
    paths += `  <polygon points="${pts}" fill="${color}" fill-opacity="0.4" stroke="none"/>\n`;
    const c = roomLabelPosition(room, poly);
    const cx = c.x - minX + pad;
    const cy = c.y - minY + pad;
    paths += `  <text x="${cx}" y="${cy}" text-anchor="middle" font-size="12" fill="#444" font-family="sans-serif" font-weight="bold">${escapeXml(room.name)}</text>\n`;
    paths += `  <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="#888" font-family="sans-serif">${formatArea(room.area, get(projectSettings).units)}</text>\n`;
  }

  for (const w of floor.walls) {
    const x1 = w.start.x - minX + pad;
    const y1 = w.start.y - minY + pad;
    const x2 = w.end.x - minX + pad;
    const y2 = w.end.y - minY + pad;
    if (w.curvePoint) paths += `  <path d="M ${x1} ${y1} Q ${w.curvePoint.x - minX + pad} ${w.curvePoint.y - minY + pad} ${x2} ${y2}" fill="none" stroke="#333" stroke-width="${w.thickness}" stroke-linecap="round"/>\n`;
    else paths += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="${w.thickness}" stroke-linecap="round"/>\n`;
    // dimension label
    const { length: len, point: midpoint } = wallPlanDimension(w);
    const mx = midpoint.x - minX + pad;
    const my = midpoint.y - minY + pad;
    paths += `  <text x="${mx}" y="${my}" text-anchor="middle" font-size="11" fill="#666" font-family="sans-serif">${len} cm</text>\n`;
  }

  // Doors: wall gap + jambs + type-specific glyph (swing arc / panels)
  const n2 = (v: number) => v.toFixed(2);
  for (const original of floor.doors) {
    const source = floor.walls.find(w => w.id === original.wallId);
    if (!source) continue;
    const frame = planOpening(source, original.position, original.width);
    if (!frame) continue;
    const wall = frame.wall, d = { ...original, position: frame.position, width: frame.width };
    if (frame.curve) {
      const { start, control, end } = frame.curve;
      paths += `  <path d="M ${start.x-minX+pad} ${start.y-minY+pad} Q ${control.x-minX+pad} ${control.y-minY+pad} ${end.x-minX+pad} ${end.y-minY+pad}" fill="none" stroke="white" stroke-width="${source.thickness+2}" stroke-linecap="butt"/>\n`;
    }
    const wdx = wall.end.x - wall.start.x;
    const wdy = wall.end.y - wall.start.y;
    const wlen = Math.hypot(wdx, wdy) || 1;
    const ux = wdx / wlen, uy = wdy / wlen;
    const nx = -uy, ny = ux;
    const px = wall.start.x + wdx * d.position - minX + pad;
    const py = wall.start.y + wdy * d.position - minY + pad;
    const hw = d.width / 2;
    const th = Math.max(wall.thickness, 4) / 2 + 1;
    const wallAngle = Math.atan2(uy, ux);
    const swingDir = d.swingDirection === 'left' ? 1 : -1;
    const sideFlip = (d.flipSide ?? false) ? -1 : 1;

    // Clear the wall gap
    const gapPts = [
      [px - ux * hw + nx * th, py - uy * hw + ny * th],
      [px + ux * hw + nx * th, py + uy * hw + ny * th],
      [px + ux * hw - nx * th, py + uy * hw - ny * th],
      [px - ux * hw - nx * th, py - uy * hw - ny * th],
    ].map(([x, y]) => `${n2(x)},${n2(y)}`).join(' ');
    paths += `  <polygon points="${gapPts}" fill="white"/>\n`;

    // Jamb ticks
    for (const sign of [-1, 1]) {
      const jx = px + ux * hw * sign;
      const jy = py + uy * hw * sign;
      paths += `  <line x1="${n2(jx + nx * (th + 1))}" y1="${n2(jy + ny * (th + 1))}" x2="${n2(jx - nx * (th + 1))}" y2="${n2(jy - ny * (th + 1))}" stroke="#444" stroke-width="1.5"/>\n`;
    }

    const doorType = d.type || 'single';
    const svgArc = (hx: number, hy: number, r: number, a0: number, a1: number) => {
      const x0 = hx + r * Math.cos(a0), y0 = hy + r * Math.sin(a0);
      const x1 = hx + r * Math.cos(a1), y1 = hy + r * Math.sin(a1);
      return {
        path: `M ${n2(x0)} ${n2(y0)} A ${n2(r)} ${n2(r)} 0 0 ${a1 > a0 ? 1 : 0} ${n2(x1)} ${n2(y1)}`,
        ex: x1, ey: y1,
      };
    };

    if (doorType === 'single' || doorType === 'pocket') {
      const r = d.width;
      const hx = px + ux * hw * swingDir;
      const hy = py + uy * hw * swingDir;
      const sa = wallAngle + (swingDir === 1 ? Math.PI : 0);
      const ea = sa + (-swingDir) * sideFlip * (Math.PI / 2);
      if (doorType === 'pocket') {
        paths += `  <line x1="${n2(hx)}" y1="${n2(hy)}" x2="${n2(hx + ux * d.width * swingDir)}" y2="${n2(hy + uy * d.width * swingDir)}" stroke="#999" stroke-width="2" stroke-dasharray="4,3"/>\n`;
      } else {
        const arc = svgArc(hx, hy, r, sa, ea);
        paths += `  <path d="${arc.path}" fill="none" stroke="#666" stroke-width="1"/>\n`;
      }
      const panelAngle = doorType === 'pocket' ? sa : ea;
      paths += `  <line x1="${n2(hx)}" y1="${n2(hy)}" x2="${n2(hx + r * Math.cos(panelAngle))}" y2="${n2(hy + r * Math.sin(panelAngle))}" stroke="#444" stroke-width="2.5"/>\n`;
      paths += `  <circle cx="${n2(hx)}" cy="${n2(hy)}" r="2.5" fill="#444"/>\n`;
    } else if (doorType === 'double' || doorType === 'french') {
      const r = hw;
      for (const side of [-1, 1] as const) {
        const hx = px + ux * hw * side;
        const hy = py + uy * hw * side;
        const arcSwing = side === -1 ? swingDir : -swingDir;
        const sa = wallAngle + Math.PI * (side === 1 ? 1 : 0);
        const ea = sa + arcSwing * sideFlip * (Math.PI / 2);
        const arc = svgArc(hx, hy, r, sa, ea);
        paths += `  <path d="${arc.path}" fill="none" stroke="#666" stroke-width="1"/>\n`;
        paths += `  <line x1="${n2(hx)}" y1="${n2(hy)}" x2="${n2(hx + r * Math.cos(ea))}" y2="${n2(hy + r * Math.sin(ea))}" stroke="#444" stroke-width="2.5"/>\n`;
        paths += `  <circle cx="${n2(hx)}" cy="${n2(hy)}" r="2" fill="#444"/>\n`;
      }
    } else if (doorType === 'sliding') {
      const panelW = hw * 0.9;
      const offset = Math.max(wall.thickness, 4) * 0.15 * sideFlip;
      paths += `  <line x1="${n2(px - ux * hw)}" y1="${n2(py - uy * hw)}" x2="${n2(px + ux * panelW * 0.1)}" y2="${n2(py + uy * panelW * 0.1)}" stroke="#444" stroke-width="2"/>\n`;
      paths += `  <line x1="${n2(px - ux * panelW * 0.1 + nx * offset)}" y1="${n2(py - uy * panelW * 0.1 + ny * offset)}" x2="${n2(px + ux * hw + nx * offset)}" y2="${n2(py + uy * hw + ny * offset)}" stroke="#444" stroke-width="2"/>\n`;
    } else if (doorType === 'bifold') {
      const panelCount = 4;
      const panelW = d.width / panelCount;
      const foldAngle = Math.PI / 6;
      let bx = px - ux * hw;
      let by = py - uy * hw;
      let poly = `${n2(bx)},${n2(by)}`;
      for (let i = 0; i < panelCount; i++) {
        const angle = wallAngle + (i % 2 === 0 ? foldAngle * swingDir : -foldAngle * swingDir * 0.3);
        bx += panelW * Math.cos(angle);
        by += panelW * Math.sin(angle);
        poly += ` ${n2(bx)},${n2(by)}`;
      }
      paths += `  <polyline points="${poly}" fill="none" stroke="#444" stroke-width="2"/>\n`;
    } else if (doorType === 'garage') {
      // Overhead garage door: panel line across the opening
      paths += `  <line x1="${n2(px - ux * hw)}" y1="${n2(py - uy * hw)}" x2="${n2(px + ux * hw)}" y2="${n2(py + uy * hw)}" stroke="#444" stroke-width="2.5"/>\n`;
    } else if (doorType === 'opening') {
      // Plain doorway: dashed threshold lines along both wall faces
      for (const side of [-1, 1]) {
        const ox = nx * (th - 1) * side, oy = ny * (th - 1) * side;
        paths += `  <line x1="${n2(px - ux * hw + ox)}" y1="${n2(py - uy * hw + oy)}" x2="${n2(px + ux * hw + ox)}" y2="${n2(py + uy * hw + oy)}" stroke="#999" stroke-width="1" stroke-dasharray="5,4"/>\n`;
      }
    }
  }

  // Windows: wall gap + double-line glyph
  for (const original of floor.windows) {
    const source = floor.walls.find(w => w.id === original.wallId);
    if (!source) continue;
    const frame = planOpening(source, original.position, original.width);
    if (!frame) continue;
    const wall = frame.wall, win = { ...original, position: frame.position, width: frame.width };
    if (frame.curve) {
      const { start, control, end } = frame.curve;
      paths += `  <path d="M ${start.x-minX+pad} ${start.y-minY+pad} Q ${control.x-minX+pad} ${control.y-minY+pad} ${end.x-minX+pad} ${end.y-minY+pad}" fill="none" stroke="white" stroke-width="${source.thickness+2}" stroke-linecap="butt"/>\n`;
    }
    const wdx = wall.end.x - wall.start.x;
    const wdy = wall.end.y - wall.start.y;
    const wlen = Math.hypot(wdx, wdy) || 1;
    const ux = wdx / wlen, uy = wdy / wlen;
    const nx = -uy, ny = ux;
    const px = wall.start.x + wdx * win.position - minX + pad;
    const py = wall.start.y + wdy * win.position - minY + pad;
    const hw = win.width / 2;
    const th = Math.max(wall.thickness, 4) / 2 + 1;
    const gap = Math.max(2, Math.max(wall.thickness, 4) * 0.25);

    const gapPts = [
      [px - ux * hw + nx * th, py - uy * hw + ny * th],
      [px + ux * hw + nx * th, py + uy * hw + ny * th],
      [px + ux * hw - nx * th, py + uy * hw - ny * th],
      [px - ux * hw - nx * th, py - uy * hw - ny * th],
    ].map(([x, y]) => `${n2(x)},${n2(y)}`).join(' ');
    paths += `  <polygon points="${gapPts}" fill="white"/>\n`;

    // Frame lines (double line) + end caps
    for (const s of [-1, 1]) {
      paths += `  <line x1="${n2(px - ux * hw + nx * gap * s)}" y1="${n2(py - uy * hw + ny * gap * s)}" x2="${n2(px + ux * hw + nx * gap * s)}" y2="${n2(py + uy * hw + ny * gap * s)}" stroke="#555" stroke-width="1.5"/>\n`;
      paths += `  <line x1="${n2(px + ux * hw * s + nx * gap)}" y1="${n2(py + uy * hw * s + ny * gap)}" x2="${n2(px + ux * hw * s - nx * gap)}" y2="${n2(py + uy * hw * s - ny * gap)}" stroke="#555" stroke-width="1.5"/>\n`;
    }
  }

  // Furniture rectangles (actual dimensions from catalog)
  for (const fi of floor.furniture) {
    const fx = fi.position.x - minX + pad;
    const fy = fi.position.y - minY + pad;
    const cat = getCatalogItem(fi.catalogId);
    const fw = fi.width ?? (cat ? cat.width : 30);
    const fd = fi.depth ?? (cat ? cat.depth : 30);
    const color = fi.color ?? (cat ? cat.color : '#a0c4e8');
    const rot = fi.rotation || 0;
    paths += `  <g transform="translate(${fx},${fy}) rotate(${rot})">\n`;
    paths += `    <rect x="${-fw / 2}" y="${-fd / 2}" width="${fw}" height="${fd}" fill="${color}" stroke="#555" stroke-width="0.5" rx="2" opacity="0.7"/>\n`;
    if (cat) {
      paths += `    <text x="0" y="4" text-anchor="middle" font-size="9" fill="#333" font-family="sans-serif">${escapeXml(cat.name)}</text>\n`;
    }
    paths += `  </g>\n`;
  }

  // Measurements
  if (floor.measurements) {
    for (const m of floor.measurements) {
      const x1 = m.x1 - minX + pad, y1 = m.y1 - minY + pad;
      const x2 = m.x2 - minX + pad, y2 = m.y2 - minY + pad;
      paths += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ef4444" stroke-width="1" stroke-dasharray="6,3" stroke-linecap="round"/>\n`;
      const dist = Math.round(Math.hypot(m.x2 - m.x1, m.y2 - m.y1));
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      paths += `  <text x="${mx}" y="${my - 6}" text-anchor="middle" font-size="10" fill="#ef4444" font-family="sans-serif" font-weight="bold">${dist} cm</text>\n`;
    }
  }

  // Annotations (dimension callouts)
  if (floor.annotations) {
    for (const a of floor.annotations) {
      const ax1 = a.x1 - minX + pad, ay1 = a.y1 - minY + pad;
      const ax2 = a.x2 - minX + pad, ay2 = a.y2 - minY + pad;
      const dx = ax2 - ax1, dy = ay2 - ay1;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;
      const ux = dx / len, uy = dy / len;
      const nx = -uy, ny = ux;
      const offset = a.offset || 40;
      const d1x = ax1 + nx * offset, d1y = ay1 + ny * offset;
      const d2x = ax2 + nx * offset, d2y = ay2 + ny * offset;
      // Leader lines
      paths += `  <line x1="${ax1}" y1="${ay1}" x2="${d1x}" y2="${d1y}" stroke="#6366f1" stroke-width="0.75"/>\n`;
      paths += `  <line x1="${ax2}" y1="${ay2}" x2="${d2x}" y2="${d2y}" stroke="#6366f1" stroke-width="0.75"/>\n`;
      // Dimension line
      paths += `  <line x1="${d1x}" y1="${d1y}" x2="${d2x}" y2="${d2y}" stroke="#6366f1" stroke-width="1"/>\n`;
      // Arrowheads
      const arrowLen = 7, arrowW = 3;
      for (const [px, py, dir] of [[d1x, d1y, 1], [d2x, d2y, -1]] as [number, number, number][]) {
        const adx = ux * arrowLen * dir, ady = uy * arrowLen * dir;
        const apx = -uy * arrowW, apy = ux * arrowW;
        paths += `  <polygon points="${px},${py} ${px + adx + apx},${py + ady + apy} ${px + adx - apx},${py + ady - apy}" fill="#6366f1"/>\n`;
      }
      // Label
      const dist = Math.round(Math.hypot(a.x2 - a.x1, a.y2 - a.y1));
      const label = a.label || `${dist} cm`;
      const mx = (d1x + d2x) / 2, my = (d1y + d2y) / 2;
      paths += `  <text x="${mx}" y="${my - 4}" text-anchor="middle" font-size="10" fill="#6366f1" font-family="sans-serif">${escapeXml(label)}</text>\n`;
    }
  }

  // Text annotations
  if (floor.textAnnotations) {
    for (const ta of floor.textAnnotations) {
      const tx = ta.x - minX + pad;
      const ty = ta.y - minY + pad;
      const transform = ta.rotation ? ` transform="rotate(${ta.rotation} ${tx} ${ty})"` : '';
      paths += `  <text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" font-size="${ta.fontSize}" fill="${escapeXml(ta.color)}" font-family="sans-serif"${transform}>${escapeXml(ta.text)}</text>\n`;
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}">
  <rect width="100%" height="100%" fill="white"/>
${paths}</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  download(blob, `${project.name || 'floorplan'}.svg`);
}

export function exportAs3DPNG(renderer: { domElement: HTMLCanvasElement }) {
  renderer.domElement.toBlob((blob: Blob | null) => {
    if (blob) download(blob, 'floorplan-3d.png');
  });
}

export function exportPDF(project: Project) {
  const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
  if (!floor || floor.walls.length === 0) return;

  const settings = get(projectSettings);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();   // ~297
  const ph = pdf.internal.pageSize.getHeight();   // ~210
  const margin = 10;
  const titleBlockH = 22;

  // ── helpers ──
  function drawPageBorder() {
    pdf.setDrawColor(40);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, margin, pw - margin * 2, ph - margin * 2);
    // inner border
    pdf.setLineWidth(0.15);
    pdf.rect(margin + 1, margin + 1, pw - margin * 2 - 2, ph - margin * 2 - 2);
  }

  function drawTitleBlock() {
    const tbY = ph - margin - titleBlockH;
    const tbW = pw - margin * 2;
    pdf.setDrawColor(40);
    pdf.setLineWidth(0.4);
    pdf.rect(margin, tbY, tbW, titleBlockH);
    // vertical dividers
    const col1 = margin + tbW * 0.45;
    const col2 = margin + tbW * 0.7;
    pdf.line(col1, tbY, col1, tbY + titleBlockH);
    pdf.line(col2, tbY, col2, tbY + titleBlockH);

    // Project name
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(project.name || 'Untitled Project', margin + 4, tbY + 9);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(floor.name, margin + 4, tbY + 15);
    if (project.description) {
      pdf.setFontSize(7);
      pdf.text(project.description.substring(0, 60), margin + 4, tbY + 19);
    }

    // Date / scale
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    pdf.setFontSize(8);
    pdf.text(`Date: ${today}`, col1 + 4, tbY + 9);
    pdf.text(`Units: ${settings.units}`, col1 + 4, tbY + 15);

    // Branding
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('openplan3d.com', col2 + 4, tbY + 9);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text('Created with Open 3D Floor Planner', col2 + 4, tbY + 15);
  }

  // ── Page 1: Floor Plan ──
  drawPageBorder();

  // Render floor plan onto an offscreen canvas then embed as image
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of floor.walls) {
    for (const b of [wallPlanBounds(w)]) {
      minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
    }
  }
  for (const fi of floor.furniture) {
    minX = Math.min(minX, fi.position.x - 60);
    minY = Math.min(minY, fi.position.y - 60);
    maxX = Math.max(maxX, fi.position.x + 60);
    maxY = Math.max(maxY, fi.position.y + 60);
  }
  const pdfBounds = { minX, minY, maxX, maxY };
  extendBoundsForOpenings(floor, pdfBounds);
  extendBoundsForRoomLabels(floor, pdfBounds);
  ({ minX, minY, maxX, maxY } = pdfBounds);

  const pad = 80;
  const planW = maxX - minX + pad * 2;
  const planH = maxY - minY + pad * 2;
  const scale = Math.min(2, 4096 / Math.max(planW, planH));
  const offscreen = document.createElement('canvas');
  offscreen.width = planW * scale;
  offscreen.height = planH * scale;
  const ctx = offscreen.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, planW, planH);

  // Room fills
  const ROOM_COLORS = ['#bfdbfe', '#fde68a', '#bbf7d0', '#fecaca', '#ddd6fe', '#a5f3fc', '#fed7aa'];
  const rooms = resolveRooms(floor);
  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri];
    const poly = getRoomPolygon(room, floor.walls);
    if (poly.length < 3) continue;
    ctx.fillStyle = ROOM_COLORS[ri % ROOM_COLORS.length];
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(poly[0].x - minX + pad, poly[0].y - minY + pad);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x - minX + pad, poly[i].y - minY + pad);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    const c = roomLabelPosition(room, poly);
    ctx.fillStyle = '#444';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(room.name, c.x - minX + pad, c.y - minY + pad);
    ctx.fillStyle = '#888';
    ctx.font = '11px sans-serif';
    ctx.fillText(formatArea(room.area, settings.units), c.x - minX + pad, c.y - minY + pad + 15);
  }

  // Walls
  ctx.strokeStyle = '#333';
  ctx.lineCap = 'round';
  for (const wall of floor.walls) {
    ctx.lineWidth = wall.thickness;
    ctx.beginPath();
    ctx.moveTo(wall.start.x - minX + pad, wall.start.y - minY + pad);
    if (wall.curvePoint) ctx.quadraticCurveTo(wall.curvePoint.x - minX + pad, wall.curvePoint.y - minY + pad, wall.end.x - minX + pad, wall.end.y - minY + pad);
        else ctx.lineTo(wall.end.x - minX + pad, wall.end.y - minY + pad);
    ctx.stroke();
    const { length: len, point: midpoint } = wallPlanDimension(wall);
    const mx = midpoint.x - minX + pad;
    const my = midpoint.y - minY + pad;
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${len} cm`, mx, my);
  }

  // Entourage symbols
  if (floor.entourage?.length) {
    drawEntourageItems({ ctx, width: pad * 2, height: pad * 2, zoom: 1, camX: minX, camY: minY }, floor, null, project.customEntourage);
  }

  // Doors and windows (shared full-fidelity renderer)
  drawOpeningsOnCanvas(ctx, floor, minX, minY, pad);

  // Furniture
  for (const fi of floor.furniture) {
    const fx = fi.position.x - minX + pad;
    const fy = fi.position.y - minY + pad;
    const cat = getCatalogItem(fi.catalogId);
    const fw = fi.width ?? (cat ? cat.width : 30);
    const fd = fi.depth ?? (cat ? cat.depth : 30);
    const color = fi.color ?? (cat ? cat.color : '#a0c4e8');
    const rot = (fi.rotation || 0) * Math.PI / 180;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = color;
    ctx.fillRect(-fw / 2, -fd / 2, fw, fd);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-fw / 2, -fd / 2, fw, fd);
    ctx.globalAlpha = 1;
    if (cat) {
      ctx.fillStyle = '#333';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cat.name, 0, 4);
    }
    ctx.restore();
  }

  // Embed rendered plan into PDF
  const imgData = offscreen.toDataURL('image/png');
  const drawAreaW = pw - margin * 2 - 4;
  const drawAreaH = ph - margin * 2 - titleBlockH - 6;
  const aspect = planW / planH;
  let imgW = drawAreaW;
  let imgH = drawAreaW / aspect;
  if (imgH > drawAreaH) { imgH = drawAreaH; imgW = drawAreaH * aspect; }
  const imgX = margin + 2 + (drawAreaW - imgW) / 2;
  const imgY = margin + 2 + (drawAreaH - imgH) / 2;
  pdf.addImage(imgData, 'PNG', imgX, imgY, imgW, imgH);

  drawTitleBlock();

  // Room schedule: repeat headings and reserve the title block on every page.
  if (rooms.length > 0) {
    const tX = margin + 6;
    const colWidths = [12, 70, 45, 55, 65];
    const headers = ['#', 'Room Name', 'Type', 'Area', 'Floor Texture'];
    const tableW = colWidths.reduce((a, b) => a + b, 0);
    const bottom = ph - margin - titleBlockH - 4;
    let tY = 0;
    const beginSchedulePage = () => {
      pdf.addPage('a4', 'landscape');
      drawPageBorder();
      drawTitleBlock();
      pdf.setTextColor(40);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Room Schedule', tX, margin + 12);
      tY = margin + 20;
      pdf.setFillColor(50, 50, 60);
      pdf.rect(tX, tY, tableW, 8, 'F');
      pdf.setTextColor(255);
      pdf.setFontSize(9);
      let x = tX;
      headers.forEach((header, i) => { pdf.text(header, x + 3, tY + 5.5); x += colWidths[i]; });
      tY += 8;
      pdf.setTextColor(40);
      pdf.setFont('helvetica', 'normal');
    };
    beginSchedulePage();
    let totalArea = 0;
    for (let ri = 0; ri < rooms.length; ri++) {
      const room = rooms[ri];
      totalArea += room.area;
      const values = [String(ri + 1), room.name, room.roomType || 'indoor',
        formatArea(room.area, settings.units), room.floorTexture || '-'];
      const cells: string[][] = values.map((value, i) => pdf.splitTextToSize(value, colWidths[i] - 6));
      const lineCount = Math.max(1, ...cells.map(cell => cell.length));
      let offset = 0;
      while (offset < lineCount) {
        // Four millimetres per line plus four millimetres of row padding.
        let capacity = Math.floor((bottom - tY - 4) / 4);
        const remaining = lineCount - offset;
        const fullPageCapacity = Math.floor((bottom - (margin + 28) - 4) / 4);
        if (capacity < 1 || (remaining > capacity && remaining <= fullPageCapacity)) {
          beginSchedulePage();
          capacity = fullPageCapacity;
        }
        const count = Math.min(remaining, capacity), height = count * 4 + 4;
        if (ri % 2 === 0) {
          pdf.setFillColor(245, 245, 250);
          pdf.rect(tX, tY, tableW, height, 'F');
        }
        pdf.setDrawColor(200);
        pdf.setLineWidth(0.15);
        pdf.rect(tX, tY, tableW, height);
        let x = tX;
        cells.forEach((cell, i) => {
          cell.slice(offset, offset + count).forEach((line, li) => pdf.text(line, x + 3, tY + 5 + li * 4));
          x += colWidths[i];
        });
        tY += height;
        offset += count;
      }
    }
    // Keep the total and summary together, clear of the footer.
    if (tY + 22 > bottom) beginSchedulePage();
    pdf.setFillColor(50, 50, 60);
    pdf.rect(tX, tY, tableW, 8, 'F');
    pdf.setTextColor(255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', tX + colWidths[0] + 3, tY + 5.5);
    pdf.text(formatArea(totalArea, settings.units), tX + colWidths[0] + colWidths[1] + colWidths[2] + 3, tY + 5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80);
    pdf.text(`${rooms.length} rooms  ·  ${floor.walls.length} walls  ·  ${floor.doors.length} doors  ·  ${floor.windows.length} windows  ·  ${floor.furniture.length} furniture items`, tX, tY + 18);
  }

  // Only the main scene renderer may supply the optional 3D page.
  // Probing arbitrary canvases can create contexts or select a thumbnail/2D view.
  const threeDCanvas = document.querySelector<HTMLCanvasElement>('canvas[data-plan3d-canvas="true"]');

  let omitted3D = Boolean(threeDCanvas);
  if (threeDCanvas && threeDCanvas.width > 10 && threeDCanvas.height > 10) {
    const completedPages = pdf.getNumberOfPages();
    try {
      const context = threeDCanvas.getContext('webgl2') || threeDCanvas.getContext('webgl');
      if (!context || context.isContextLost()) throw new Error('3D view unavailable');
      const img3d = threeDCanvas.toDataURL('image/png');
      if (img3d && img3d.length > 100) {
        pdf.addPage('a4', 'landscape');
        drawPageBorder();

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(40);
        pdf.text('3D Perspective View', margin + 6, margin + 12);

        const da3W = pw - margin * 2 - 4;
        const da3H = ph - margin * 2 - titleBlockH - 20;
        const a3 = threeDCanvas.width / threeDCanvas.height;
        let w3 = da3W;
        let h3 = da3W / a3;
        if (h3 > da3H) { h3 = da3H; w3 = da3H * a3; }
        const x3 = margin + 2 + (da3W - w3) / 2;
        const y3 = margin + 18 + (da3H - h3) / 2;
        pdf.addImage(img3d, 'PNG', x3, y3, w3, h3);

        drawTitleBlock();
        omitted3D = false;
      }
    } catch {
      // Image encoding may fail after addPage. Keep the completed plan/schedule
      // pages and remove any unfinished optional page before saving.
      while (pdf.getNumberOfPages() > completedPages) pdf.deletePage(pdf.getNumberOfPages());
    }
  }

  pdf.save(`${project.name || 'floorplan'}.pdf`);
  return { omitted3D };
}
