import { getEntourageImage } from './entourageImages';
import { roomHoles, traceRoomRings } from './roomNesting';
import { stairLocalBounds } from './stairPlanGeometry';
import { dimensionPlanGeometry } from './dimensionPlanGeometry';
/**
 * Canvas rendering functions for the floor plan editor.
 * All functions are pure — they take canvas context + data and render.
 * Extracted from FloorPlanCanvas.svelte.
 */
import type { Point, Wall, Door, Window as Win, FurnitureItem, Stair, Column, Floor, Annotation } from '$lib/models/types';
import type { Room } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import type { ProjectSettings } from '$lib/stores/settings';
import { formatLength, formatArea } from '$lib/stores/settings';
import { getCatalogItem, getFurnitureSize } from '$lib/utils/furnitureCatalog';
import { drawFurnitureIcon } from '$lib/utils/furnitureIcons';
import { getRoomPolygon, roomCentroid, roomLabelPosition } from '$lib/utils/roomDetection';
import { getWallTextureCanvas, getFloorTextureCanvas } from '$lib/utils/textureGenerator';
import { getEntourageDef } from '$lib/utils/entourageCatalog';
import type { EntourageItem, CustomEntourageDef } from '$lib/models/types';

// ── Wall geometry helpers ────────────────────────────────────────────

export function wallLength(w: Wall): number {
  if (w.curvePoint) {
    let len = 0;
    const N = 20;
    let px = w.start.x, py = w.start.y;
    for (let i = 1; i <= N; i++) {
      const t = i / N;
      const mt = 1 - t;
      const nx = mt * mt * w.start.x + 2 * mt * t * w.curvePoint.x + t * t * w.end.x;
      const ny = mt * mt * w.start.y + 2 * mt * t * w.curvePoint.y + t * t * w.end.y;
      len += Math.hypot(nx - px, ny - py);
      px = nx; py = ny;
    }
    return len;
  }
  return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
}

export function wallPointAt(w: Wall, t: number): Point {
  if (w.curvePoint) {
    const mt = 1 - t;
    return {
      x: mt * mt * w.start.x + 2 * mt * t * w.curvePoint.x + t * t * w.end.x,
      y: mt * mt * w.start.y + 2 * mt * t * w.curvePoint.y + t * t * w.end.y,
    };
  }
  return {
    x: w.start.x + (w.end.x - w.start.x) * t,
    y: w.start.y + (w.end.y - w.start.y) * t,
  };
}

export function wallTangentAt(w: Wall, t: number): Point {
  if (w.curvePoint) {
    const mt = 1 - t;
    const dx = 2 * mt * (w.curvePoint.x - w.start.x) + 2 * t * (w.end.x - w.curvePoint.x);
    const dy = 2 * mt * (w.curvePoint.y - w.start.y) + 2 * t * (w.end.y - w.curvePoint.y);
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }
  const dx = w.end.x - w.start.x;
  const dy = w.end.y - w.start.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function wallThicknessScreen(w: Wall, zoom: number): number {
  return Math.max(w.thickness * zoom, 4);
}

/**
 * Half-thickness insets at each end of a wall caused by abutting
 * (non-collinear) neighbor walls. Used for edge-to-edge ("clear span")
 * dimensions: centerline length minus these insets is the distance
 * between the neighbors' inner faces.
 */
export function wallEdgeInsets(w: Wall, allWalls: Wall[]): { start: number; end: number } {
  const EP = 5;
  const wdx = w.end.x - w.start.x, wdy = w.end.y - w.start.y;
  const wl = Math.hypot(wdx, wdy) || 1;
  const insetAt = (pt: Point): number => {
    let inset = 0;
    for (const other of allWalls) {
      if (other.id === w.id) continue;
      const touchesStart = Math.abs(other.start.x - pt.x) < EP && Math.abs(other.start.y - pt.y) < EP;
      const touchesEnd = Math.abs(other.end.x - pt.x) < EP && Math.abs(other.end.y - pt.y) < EP;
      if (!touchesStart && !touchesEnd) continue;
      // Collinear continuations don't narrow the span — only crossing walls do
      const odx = other.end.x - other.start.x, ody = other.end.y - other.start.y;
      const ol = Math.hypot(odx, ody) || 1;
      const cross = Math.abs((wdx / wl) * (ody / ol) - (wdy / wl) * (odx / ol));
      if (cross < 0.1) continue;
      inset = Math.max(inset, other.thickness / 2);
    }
    return inset;
  };
  return { start: insetAt(w.start), end: insetAt(w.end) };
}

// ── Coordinate conversion (local helpers using CanvasState) ─────────

function wts(cs: CanvasState, wx: number, wy: number): { x: number; y: number } {
  return { x: (wx - cs.camX) * cs.zoom + cs.width / 2, y: (wy - cs.camY) * cs.zoom + cs.height / 2 };
}

// ── Grid ─────────────────────────────────────────────────────────────

export function drawGrid(
  cs: CanvasState,
  showGrid: boolean,
  snapToGrid: boolean,
  gridSize: number,
): void {
  if (!cs.ctx || !showGrid) return;
  const { ctx, width, height, zoom, camX, camY } = cs;
  const GRID = 20;
  const step = (snapToGrid ? gridSize : GRID) * zoom;
  if (step < 4) return;

  ctx.strokeStyle = '#e8eaed';
  ctx.lineWidth = 0.5;
  const offX = (width / 2 - camX * zoom) % step;
  const offY = (height / 2 - camY * zoom) % step;
  for (let x = offX; x < width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = offY; y < height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  const majorStep = 100 * zoom;
  if (majorStep >= 20) {
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 0.8;
    const mOffX = (width / 2 - camX * zoom) % majorStep;
    const mOffY = (height / 2 - camY * zoom) % majorStep;
    for (let x = mOffX; x < width; x += majorStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = mOffY; y < height; y += majorStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }
}

// ── Wall drawing ─────────────────────────────────────────────────────

export function drawWall(
  cs: CanvasState,
  w: Wall,
  selected: boolean,
  showDimensions: boolean,
  dimSettings: ProjectSettings,
  allWalls?: Wall[],
): void {
  const { ctx, zoom, width, height } = cs;
  const s = wts(cs, w.start.x, w.start.y);
  const e = wts(cs, w.end.x, w.end.y);
  const thickness = wallThicknessScreen(w, zoom);

  if (w.curvePoint) {
    const cp = wts(cs, w.curvePoint.x, w.curvePoint.y);
    const SEGS = 24;
    const outerPts: { x: number; y: number }[] = [];
    const innerPts: { x: number; y: number }[] = [];

    for (let i = 0; i <= SEGS; i++) {
      const t = i / SEGS;
      const mt = 1 - t;
      const px = mt * mt * s.x + 2 * mt * t * cp.x + t * t * e.x;
      const py = mt * mt * s.y + 2 * mt * t * cp.y + t * t * e.y;
      const tdx = 2 * mt * (cp.x - s.x) + 2 * t * (e.x - cp.x);
      const tdy = 2 * mt * (cp.y - s.y) + 2 * t * (e.y - cp.y);
      const tlen = Math.hypot(tdx, tdy) || 1;
      const nx = (-tdy / tlen) * thickness / 2;
      const ny = (tdx / tlen) * thickness / 2;
      outerPts.push({ x: px + nx, y: py + ny });
      innerPts.push({ x: px - nx, y: py - ny });
    }

    ctx.fillStyle = selected ? '#93c5fd' : '#404040';
    ctx.strokeStyle = selected ? '#3b82f6' : '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(outerPts[0].x, outerPts[0].y);
    for (let i = 1; i < outerPts.length; i++) ctx.lineTo(outerPts[i].x, outerPts[i].y);
    for (let i = innerPts.length - 1; i >= 0; i--) ctx.lineTo(innerPts[i].x, innerPts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const wlen = wallLength(w);
    if (wlen >= 10 && showDimensions && dimSettings.showExternalDimensions) {
      const midPt = wallPointAt(w, 0.5);
      const midS = wts(cs, midPt.x, midPt.y);
      const midTan = wallTangentAt(w, 0.5);
      const offsetDist = thickness / 2 + 16;
      ctx.fillStyle = dimSettings.dimensionLineColor;
      const fontSize = Math.max(10, 11 * zoom);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatLength(wlen, dimSettings.units), midS.x - midTan.y * offsetDist, midS.y + midTan.x * offsetDist);
    }

    if (selected) {
      const handleSize = 5;
      for (const pt of [s, e]) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, handleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      const sz = 6;
      ctx.beginPath();
      ctx.moveTo(cp.x, cp.y - sz);
      ctx.lineTo(cp.x + sz, cp.y);
      ctx.lineTo(cp.x, cp.y + sz);
      ctx.lineTo(cp.x - sz, cp.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#d9770680';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(cp.x, cp.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    return;
  }

  // Straight wall
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;

  const nx = (-dy / len) * thickness / 2;
  const ny = (dx / len) * thickness / 2;

  ctx.fillStyle = selected ? '#93c5fd' : '#404040';
  ctx.strokeStyle = selected ? '#3b82f6' : '#333333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(s.x + nx, s.y + ny);
  ctx.lineTo(e.x + nx, e.y + ny);
  ctx.lineTo(e.x - nx, e.y - ny);
  ctx.lineTo(s.x - nx, s.y - ny);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wall texture pattern overlay
  if (w.texture) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(s.x + nx, s.y + ny);
    ctx.lineTo(e.x + nx, e.y + ny);
    ctx.lineTo(e.x - nx, e.y - ny);
    ctx.lineTo(s.x - nx, s.y - ny);
    ctx.closePath();
    ctx.clip();

    const texCanvas = getWallTextureCanvas(w.texture, w.color);
    if (texCanvas) {
      const scale = zoom * 0.25;
      ctx.globalAlpha = 0.6;
      const angle = Math.atan2(dy, dx);
      const cxp = (s.x + e.x) / 2;
      const cyp = (s.y + e.y) / 2;
      ctx.translate(cxp, cyp);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      const pat = ctx.createPattern(texCanvas, 'repeat');
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(-len / 2 / scale, -thickness / 2 / scale, len / scale, thickness / scale);
      }
    }
    ctx.restore();
  }

  // Dimension line with arrowheads
  if (!showDimensions || !dimSettings.showExternalDimensions) return;
  const wlen = wallLength(w);
  if (wlen < 10) return;

  // Edge-to-edge (clear span) mode: shorten the measured span by the
  // half-thickness of abutting walls at each end (issue #11).
  let dimLen = wlen;
  let insetS = 0, insetE = 0;
  if (dimSettings.wallMeasureMode === 'edge' && allWalls && !w.curvePoint) {
    const ins = wallEdgeInsets(w, allWalls);
    insetS = ins.start;
    insetE = ins.end;
    dimLen = Math.max(0, wlen - insetS - insetE);
  }
  const ux1 = dx / len, uy1 = dy / len;
  const sd = { x: s.x + ux1 * insetS * zoom, y: s.y + uy1 * insetS * zoom };
  const ed = { x: e.x - ux1 * insetE * zoom, y: e.y - uy1 * insetE * zoom };

  const mx = (sd.x + ed.x) / 2;
  const my = (sd.y + ed.y) / 2;
  const offsetDist = thickness / 2 + 20;
  const nnx = (-dy / len);
  const nny = (dx / len);

  let dimSide = 1;
  const testX = mx + nnx * offsetDist;
  const testY = my + nny * offsetDist;
  if (testX < 10 || testX > width - 10 || testY < 10 || testY > height - 10) dimSide = -1;

  const dOffX = nnx * offsetDist * dimSide;
  const dOffY = nny * offsetDist * dimSide;

  if (dimSettings.showExtensionLines) {
    const extLen = offsetDist + 4;
    ctx.strokeStyle = dimSettings.dimensionLineColor + '80';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(sd.x + nnx * (thickness / 2 + 2) * dimSide, sd.y + nny * (thickness / 2 + 2) * dimSide);
    ctx.lineTo(sd.x + nnx * extLen * dimSide, sd.y + nny * extLen * dimSide);
    ctx.moveTo(ed.x + nnx * (thickness / 2 + 2) * dimSide, ed.y + nny * (thickness / 2 + 2) * dimSide);
    ctx.lineTo(ed.x + nnx * extLen * dimSide, ed.y + nny * extLen * dimSide);
    ctx.stroke();
  }

  const ds = { x: sd.x + dOffX, y: sd.y + dOffY };
  const de = { x: ed.x + dOffX, y: ed.y + dOffY };
  const dimMx = (ds.x + de.x) / 2;
  const dimMy = (ds.y + de.y) / 2;

  ctx.fillStyle = dimSettings.dimensionLineColor;
  const fontSize = Math.max(10, 11 * zoom);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const dimLabel = formatLength(dimLen, dimSettings.units);
  const textW = ctx.measureText(dimLabel).width;

  const ux2 = dx / len, uy2 = dy / len;
  const halfGap = textW / 2 + 4;
  ctx.strokeStyle = dimSettings.dimensionLineColor;
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(ds.x, ds.y);
  ctx.lineTo(dimMx - ux2 * halfGap, dimMy - uy2 * halfGap);
  ctx.moveTo(dimMx + ux2 * halfGap, dimMy + uy2 * halfGap);
  ctx.lineTo(de.x, de.y);
  ctx.stroke();

  const tickSize = Math.max(4, 5 * zoom);
  ctx.strokeStyle = dimSettings.dimensionLineColor;
  ctx.lineWidth = 1;
  for (const pt of [ds, de]) {
    ctx.beginPath();
    ctx.moveTo(pt.x - (ux2 + nnx * dimSide) * tickSize, pt.y - (uy2 + nny * dimSide) * tickSize);
    ctx.lineTo(pt.x + (ux2 + nnx * dimSide) * tickSize, pt.y + (uy2 + nny * dimSide) * tickSize);
    ctx.stroke();
  }

  ctx.fillStyle = dimSettings.dimensionLineColor;
  ctx.fillText(dimLabel, dimMx, dimMy);

  if (selected) {
    const handleSize = 5;
    for (const pt of [s, e]) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, handleSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const midX = (s.x + e.x) / 2;
    const midY = (s.y + e.y) / 2;
    const sz = 5;
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(midX - sz, midY - sz, sz * 2, sz * 2);
    ctx.strokeRect(midX - sz, midY - sz, sz * 2, sz * 2);
    const perpX = -(dy / len) * 12;
    const perpY = (dx / len) * 12;
    ctx.strokeStyle = '#3b82f680';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(midX - perpX, midY - perpY);
    ctx.lineTo(midX + perpX, midY + perpY);
    ctx.stroke();
    const arrowSz = 3;
    for (const sign of [1, -1]) {
      const ax = midX + perpX * sign;
      const ay = midY + perpY * sign;
      const adx = perpX / 12 * arrowSz * sign;
      const ady = perpY / 12 * arrowSz * sign;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - adx + ady * 0.5, ay - ady - adx * 0.5);
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - adx - ady * 0.5, ay - ady + adx * 0.5);
      ctx.stroke();
    }
  }
}

// ── Door drawing ─────────────────────────────────────────────────────

export function drawDoorOnWall(cs: CanvasState, wall: Wall, door: Door): void {
  const { ctx, zoom } = cs;
  const t = door.position;
  const wpt = wallPointAt(wall, t);
  const s = wts(cs, wpt.x, wpt.y);

  const tan = wallTangentAt(wall, t);
  const ux = tan.x, uy = tan.y;
  const nx = -uy, ny = ux;

  const halfDoor = (door.width / 2) * zoom;
  const thickness = wallThicknessScreen(wall, zoom);
  const wallAngle = Math.atan2(uy, ux);
  const swingDir = door.swingDirection === 'left' ? 1 : -1;
  const sideFlip = (door.flipSide ?? false) ? -1 : 1;

  // Clear wall area for door gap
  ctx.fillStyle = '#fafafa';
  const gux = ux * halfDoor;
  const guy = uy * halfDoor;
  const gnx = nx * (thickness / 2 + 1);
  const gny = ny * (thickness / 2 + 1);
  ctx.beginPath();
  ctx.moveTo(s.x - gux + gnx, s.y - guy + gny);
  ctx.lineTo(s.x + gux + gnx, s.y + guy + gny);
  ctx.lineTo(s.x + gux - gnx, s.y + guy - gny);
  ctx.lineTo(s.x - gux - gnx, s.y - guy - gny);
  ctx.closePath();
  ctx.fill();

  // Door jamb ticks
  const jamb = thickness / 2 + 2;
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1.5;
  for (const sign of [-1, 1]) {
    const jx = s.x + ux * halfDoor * sign;
    const jy = s.y + uy * halfDoor * sign;
    ctx.beginPath();
    ctx.moveTo(jx + nx * jamb, jy + ny * jamb);
    ctx.lineTo(jx - nx * jamb, jy - ny * jamb);
    ctx.stroke();
  }

  const doorType = door.type || 'single';

  if (doorType === 'single' || doorType === 'pocket') {
    const r = door.width * zoom;
    const hingeX = s.x + ux * halfDoor * swingDir;
    const hingeY = s.y + uy * halfDoor * swingDir;
    const startAngle = wallAngle + (swingDir === 1 ? Math.PI : 0);
    const endAngle = startAngle + (-swingDir) * sideFlip * (Math.PI / 2);

    if (doorType === 'pocket') {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hingeX, hingeY);
      ctx.lineTo(hingeX + ux * halfDoor * 2 * swingDir, hingeY + uy * halfDoor * 2 * swingDir);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hingeX, hingeY, r, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle));
      ctx.stroke();
    }

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(hingeX, hingeY);
    const panelAngle = doorType === 'pocket' ? startAngle : endAngle;
    ctx.lineTo(hingeX + r * Math.cos(panelAngle), hingeY + r * Math.sin(panelAngle));
    ctx.stroke();

    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(hingeX, hingeY, 2.5, 0, Math.PI * 2);
    ctx.fill();

  } else if (doorType === 'double' || doorType === 'french') {
    const r = halfDoor;
    for (const side of [-1, 1] as const) {
      const hx = s.x + ux * halfDoor * side;
      const hy = s.y + uy * halfDoor * side;
      const arcSwing = side === -1 ? swingDir : -swingDir;
      const sa = wallAngle + Math.PI * (side === 1 ? 1 : 0);
      const ea = sa + arcSwing * sideFlip * (Math.PI / 2);

      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hx, hy, r, Math.min(sa, ea), Math.max(sa, ea));
      ctx.stroke();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#444';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + r * Math.cos(ea), hy + r * Math.sin(ea));
      ctx.stroke();

      ctx.fillStyle = '#444';
      ctx.beginPath();
      ctx.arc(hx, hy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (doorType === 'french') {
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 0.5;
    }

  } else if (doorType === 'sliding') {
    const panelW = halfDoor * 0.9;
    const offset = thickness * 0.15 * sideFlip;
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * halfDoor, s.y - uy * halfDoor);
    ctx.lineTo(s.x + ux * panelW * 0.1, s.y + uy * panelW * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - ux * panelW * 0.1 + nx * offset, s.y - uy * panelW * 0.1 + ny * offset);
    ctx.lineTo(s.x + ux * halfDoor + nx * offset, s.y + uy * halfDoor + ny * offset);
    ctx.stroke();
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    const arrowY2 = ny * (thickness * 0.4);
    const arrowX2 = nx * (thickness * 0.4);
    const ax = s.x - arrowX2;
    const ay = s.y - arrowY2;
    ctx.beginPath();
    ctx.moveTo(ax - ux * halfDoor * 0.5, ay - uy * halfDoor * 0.5);
    ctx.lineTo(ax + ux * halfDoor * 0.5, ay + uy * halfDoor * 0.5);
    ctx.stroke();
    const ahx = ax + ux * halfDoor * 0.5;
    const ahy = ay + uy * halfDoor * 0.5;
    ctx.beginPath();
    ctx.moveTo(ahx - ux * 6 + nx * 4, ahy - uy * 6 + ny * 4);
    ctx.lineTo(ahx, ahy);
    ctx.lineTo(ahx - ux * 6 - nx * 4, ahy - uy * 6 - ny * 4);
    ctx.stroke();

  } else if (doorType === 'bifold') {
    const panelCount = 4;
    const panelW = (door.width / panelCount) * zoom;
    const foldAngle = Math.PI / 6;
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    let px = s.x - ux * halfDoor;
    let py = s.y - uy * halfDoor;
    for (let i = 0; i < panelCount; i++) {
      const angle = wallAngle + (i % 2 === 0 ? foldAngle * swingDir : -foldAngle * swingDir * 0.3);
      const ex = px + panelW * Math.cos(angle);
      const ey = py + panelW * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
      px = ex;
      py = ey;
    }

  } else if (doorType === 'opening') {
    // Plain doorway (no door): dashed threshold lines along both wall faces
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    for (const side of [-1, 1]) {
      const ox = nx * (thickness / 2) * side;
      const oy = ny * (thickness / 2) * side;
      ctx.beginPath();
      ctx.moveTo(s.x - ux * halfDoor + ox, s.y - uy * halfDoor + oy);
      ctx.lineTo(s.x + ux * halfDoor + ox, s.y + uy * halfDoor + oy);
      ctx.stroke();
    }
    ctx.setLineDash([]);

  } else if (doorType === 'garage') {
    // Overhead/sectional garage door: panel line across the opening with
    // section ticks, plus dashed overhead-track lines into the garage.
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * halfDoor, s.y - uy * halfDoor);
    ctx.lineTo(s.x + ux * halfDoor, s.y + uy * halfDoor);
    ctx.stroke();
    ctx.lineWidth = 1;
    const segs = 4;
    for (let i = 1; i < segs; i++) {
      const t2 = -1 + (2 * i) / segs;
      const tx = s.x + ux * halfDoor * t2;
      const ty = s.y + uy * halfDoor * t2;
      ctx.beginPath();
      ctx.moveTo(tx + nx * 3, ty + ny * 3);
      ctx.lineTo(tx - nx * 3, ty - ny * 3);
      ctx.stroke();
    }
    const trackDir = (door.flipSide ?? false) ? -1 : 1;
    const trackLen = halfDoor * 0.8;
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#999';
    for (const side of [-1, 1]) {
      const bx = s.x + ux * halfDoor * 0.7 * side;
      const by = s.y + uy * halfDoor * 0.7 * side;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + nx * trackLen * trackDir, by + ny * trackLen * trackDir);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
}

// ── Window drawing ───────────────────────────────────────────────────

export function drawWindowOnWall(cs: CanvasState, wall: Wall, win: Win): void {
  const { ctx, zoom } = cs;
  const t = win.position;
  const wpt = wallPointAt(wall, t);
  const s = wts(cs, wpt.x, wpt.y);

  const tan = wallTangentAt(wall, t);
  const ux = tan.x, uy = tan.y;
  const nx = -uy, ny = ux;

  const hw = (win.width / 2) * zoom;
  const thickness = wallThicknessScreen(wall, zoom);

  // Clear wall area
  ctx.fillStyle = '#fafafa';
  const gux = ux * hw;
  const guy = uy * hw;
  const gnx = nx * (thickness / 2 + 1);
  const gny = ny * (thickness / 2 + 1);
  ctx.beginPath();
  ctx.moveTo(s.x - gux + gnx, s.y - guy + gny);
  ctx.lineTo(s.x + gux + gnx, s.y + guy + gny);
  ctx.lineTo(s.x + gux - gnx, s.y + guy - gny);
  ctx.lineTo(s.x - gux - gnx, s.y - guy - gny);
  ctx.closePath();
  ctx.fill();

  const winType = win.type || 'standard';
  const gap = Math.max(2, thickness * 0.25);

  if (winType === 'bay') {
    const bayDepth = gap * 3;
    const sideW = hw * 0.3;
    const centerW = hw - sideW;

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;

    const lOuter = { x: s.x - ux * hw, y: s.y - uy * hw };
    const lInner = { x: s.x - ux * centerW + nx * bayDepth, y: s.y - uy * centerW + ny * bayDepth };
    ctx.beginPath(); ctx.moveTo(lOuter.x, lOuter.y); ctx.lineTo(lInner.x, lInner.y); ctx.stroke();

    const rInner = { x: s.x + ux * centerW + nx * bayDepth, y: s.y + uy * centerW + ny * bayDepth };
    ctx.beginPath(); ctx.moveTo(lInner.x, lInner.y); ctx.lineTo(rInner.x, rInner.y); ctx.stroke();

    const rOuter = { x: s.x + ux * hw, y: s.y + uy * hw };
    ctx.beginPath(); ctx.moveTo(rInner.x, rInner.y); ctx.lineTo(rOuter.x, rOuter.y); ctx.stroke();

    ctx.strokeStyle = '#99c';
    ctx.lineWidth = 1;
    const inset = 0.3;
    ctx.beginPath();
    ctx.moveTo(lOuter.x + (lInner.x - lOuter.x) * inset, lOuter.y + (lInner.y - lOuter.y) * inset);
    ctx.lineTo(lInner.x - (lInner.x - lOuter.x) * inset, lInner.y - (lInner.y - lOuter.y) * inset);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lInner.x + (rInner.x - lInner.x) * 0.05, lInner.y + (rInner.y - lInner.y) * 0.05);
    ctx.lineTo(rInner.x - (rInner.x - lInner.x) * 0.05, rInner.y - (rInner.y - lInner.y) * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rInner.x + (rOuter.x - rInner.x) * inset, rInner.y + (rOuter.y - rInner.y) * inset);
    ctx.lineTo(rOuter.x - (rOuter.x - rInner.x) * inset, rOuter.y - (rOuter.y - rInner.y) * inset);
    ctx.stroke();

  } else if (winType === 'sliding') {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    const offset = gap * 0.4;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * offset, s.y - uy * hw + ny * offset);
    ctx.lineTo(s.x + ux * hw * 0.1 + nx * offset, s.y + uy * hw * 0.1 + ny * offset);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw * 0.1 - nx * offset, s.y - uy * hw * 0.1 - ny * offset);
    ctx.lineTo(s.x + ux * hw - nx * offset, s.y + uy * hw - ny * offset);
    ctx.stroke();
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s.x + ux * hw * side + nx * gap, s.y + uy * hw * side + ny * gap);
      ctx.lineTo(s.x + ux * hw * side - nx * gap, s.y + uy * hw * side - ny * gap);
      ctx.stroke();
    }
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    const aOff = gap * 1.5;
    const ax1 = s.x - ux * hw * 0.3 + nx * aOff;
    const ay1 = s.y - uy * hw * 0.3 + ny * aOff;
    const ax2 = s.x + ux * hw * 0.3 + nx * aOff;
    const ay2 = s.y + uy * hw * 0.3 + ny * aOff;
    ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax2 - ux * 5 + nx * 3, ay2 - uy * 5 + ny * 3);
    ctx.lineTo(ax2, ay2);
    ctx.lineTo(ax2 - ux * 5 - nx * 3, ay2 - uy * 5 - ny * 3);
    ctx.stroke();

  } else if (winType === 'fixed') {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw - nx * gap, s.y + uy * hw - ny * gap);
    ctx.lineTo(s.x - ux * hw - nx * gap, s.y - uy * hw - ny * gap);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = '#aab';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw - nx * gap, s.y + uy * hw - ny * gap);
    ctx.moveTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.lineTo(s.x - ux * hw - nx * gap, s.y - uy * hw - ny * gap);
    ctx.stroke();

  } else if (winType === 'casement') {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw - nx * gap, s.y - uy * hw - ny * gap);
    ctx.lineTo(s.x + ux * hw - nx * gap, s.y + uy * hw - ny * gap);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw, s.y - uy * hw);
    ctx.lineTo(s.x + ux * hw, s.y + uy * hw);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x - ux * hw - nx * gap, s.y - uy * hw - ny * gap);
    ctx.moveTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw - nx * gap, s.y + uy * hw - ny * gap);
    ctx.stroke();
    ctx.strokeStyle = '#88a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x + nx * gap * 2.5, s.y + ny * gap * 2.5);
    ctx.lineTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.stroke();

  } else {
    // Standard
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw - nx * gap, s.y - uy * hw - ny * gap);
    ctx.lineTo(s.x + ux * hw - nx * gap, s.y + uy * hw - ny * gap);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw, s.y - uy * hw);
    ctx.lineTo(s.x + ux * hw, s.y + uy * hw);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x - ux * hw - nx * gap, s.y - uy * hw - ny * gap);
    ctx.moveTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw - nx * gap, s.y + uy * hw - ny * gap);
    ctx.stroke();
  }
}

// ── Door/Window distance dimensions ──────────────────────────────────

export function drawDoorDistanceDimensions(cs: CanvasState, wall: Wall, door: Door, dimSettings: ProjectSettings): void {
  const { ctx, zoom } = cs;
  const wLength = wallLength(wall);
  if (wLength < 10) return;

  const distFromA = wLength * door.position;
  const distFromB = wLength * (1 - door.position);

  const doorCenter = wallPointAt(wall, door.position);
  const dcScreen = wts(cs, doorCenter.x, doorCenter.y);
  const wallStartScreen = wts(cs, wall.start.x, wall.start.y);
  const wallEndScreen = wts(cs, wall.end.x, wall.end.y);

  if (dimSettings.showExtensionLines) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(dcScreen.x, dcScreen.y); ctx.lineTo(wallStartScreen.x, wallStartScreen.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dcScreen.x, dcScreen.y); ctx.lineTo(wallEndScreen.x, wallEndScreen.y); ctx.stroke();
    ctx.setLineDash([]);
  }

  const fontSize = Math.max(10, 11 * zoom);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const [midPoint, dist] of [
    [{ x: (dcScreen.x + wallStartScreen.x) / 2, y: (dcScreen.y + wallStartScreen.y) / 2 }, distFromA],
    [{ x: (dcScreen.x + wallEndScreen.x) / 2, y: (dcScreen.y + wallEndScreen.y) / 2 }, distFromB],
  ] as [{ x: number; y: number }, number][]) {
    const labelText = formatLength(dist, dimSettings.units);
    const textWidth = ctx.measureText(labelText).width;
    const pillWidth = textWidth + 12;
    const pillHeight = fontSize + 6;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(midPoint.x - pillWidth / 2, midPoint.y - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, midPoint.x, midPoint.y);
  }
}

export function drawWindowDistanceDimensions(cs: CanvasState, wall: Wall, window: Win, dimSettings: ProjectSettings): void {
  const { ctx, zoom } = cs;
  const wLength = wallLength(wall);
  if (wLength < 10) return;

  const distFromA = wLength * window.position;
  const distFromB = wLength * (1 - window.position);

  const windowCenter = wallPointAt(wall, window.position);
  const wcScreen = wts(cs, windowCenter.x, windowCenter.y);
  const wallStartScreen = wts(cs, wall.start.x, wall.start.y);
  const wallEndScreen = wts(cs, wall.end.x, wall.end.y);

  if (dimSettings.showExtensionLines) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(wcScreen.x, wcScreen.y); ctx.lineTo(wallStartScreen.x, wallStartScreen.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wcScreen.x, wcScreen.y); ctx.lineTo(wallEndScreen.x, wallEndScreen.y); ctx.stroke();
    ctx.setLineDash([]);
  }

  const fontSize = Math.max(10, 11 * zoom);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const [midPoint, dist] of [
    [{ x: (wcScreen.x + wallStartScreen.x) / 2, y: (wcScreen.y + wallStartScreen.y) / 2 }, distFromA],
    [{ x: (wcScreen.x + wallEndScreen.x) / 2, y: (wcScreen.y + wallEndScreen.y) / 2 }, distFromB],
  ] as [{ x: number; y: number }, number][]) {
    const labelText = formatLength(dist, dimSettings.units);
    const textWidth = ctx.measureText(labelText).width;
    const pillWidth = textWidth + 12;
    const pillHeight = fontSize + 6;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(midPoint.x - pillWidth / 2, midPoint.y - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, midPoint.x, midPoint.y);
  }
}

// ── Furniture drawing ────────────────────────────────────────────────

export function drawFurnitureItem(cs: CanvasState, item: FurnitureItem, selected: boolean): void {
  const { ctx, zoom } = cs;
  const cat = getCatalogItem(item.catalogId);
  const s = wts(cs, item.position.x, item.position.y);
  const sx = item.scale?.x ?? 1;
  const sy = item.scale?.y ?? 1;
  const size = getFurnitureSize(item);
  const w = size.width * zoom;
  const d = size.depth * zoom;
  const angle = (item.rotation * Math.PI) / 180;

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(angle);
  ctx.scale(Math.sign(sx) || 1, Math.sign(sy) || 1);

  const itemColor = item.color ?? cat?.color ?? '#888888';
  const strokeColor = selected ? '#3b82f6' : itemColor;
  ctx.lineWidth = selected ? 2 : 1;
  drawFurnitureIcon(ctx, item.catalogId, w, d, itemColor, strokeColor);

  const fontSize = Math.max(8, Math.min(12, Math.min(w, d) * 0.2));
  if (Math.min(w, d) > 20) {
    ctx.save();
    // Mirror the symbol, while keeping its caption readable.
    ctx.scale(Math.sign(sx) || 1, Math.sign(sy) || 1);
    ctx.fillStyle = '#374151';
    ctx.font = `${fontSize * 0.7}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cat?.name ?? 'Unknown furniture', 0, d / 2 + fontSize * 0.8);
    ctx.restore();
  }

  if (selected) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-w / 2 - 2, -d / 2 - 2, w + 4, d + 4);
    ctx.setLineDash([]);

    const hs = 5;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    // Corner handles
    for (const [hx, hy] of [[-w/2, -d/2], [w/2, -d/2], [-w/2, d/2], [w/2, d/2]]) {
      ctx.fillRect(hx - hs, hy - hs, hs * 2, hs * 2);
      ctx.strokeRect(hx - hs, hy - hs, hs * 2, hs * 2);
    }

    // Edge midpoint handles
    const ehs = 4; // slightly smaller
    for (const [hx, hy] of [[0, -d/2], [0, d/2], [-w/2, 0], [w/2, 0]]) {
      ctx.fillRect(hx - ehs, hy - ehs, ehs * 2, ehs * 2);
      ctx.strokeRect(hx - ehs, hy - ehs, ehs * 2, ehs * 2);
    }

    const rotY = -d / 2 - 18;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -d / 2 - 2);
    ctx.lineTo(0, rotY + 5);
    ctx.stroke();
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(0, rotY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, rotY, 3, -Math.PI * 0.8, Math.PI * 0.4);
    ctx.stroke();
    const arrowAngle2 = Math.PI * 0.4;
    const ax = Math.cos(arrowAngle2) * 3;
    const ay = Math.sin(arrowAngle2) * 3;
    ctx.beginPath();
    ctx.moveTo(ax + 1.5, rotY + ay - 1);
    ctx.lineTo(ax, rotY + ay);
    ctx.lineTo(ax - 1, rotY + ay - 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ── Stair drawing ────────────────────────────────────────────────────

export function drawStair(cs: CanvasState, stair: Stair, selected: boolean): void {
  const { ctx, zoom } = cs;
  const s = wts(cs, stair.position.x, stair.position.y);
  const w = stair.width * zoom;
  const d = stair.depth * zoom;
  const angle = (stair.rotation * Math.PI) / 180;
  const type = stair.stairType || 'straight';

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(angle);

  const fillCol = selected ? '#bfdbfe80' : '#e5e7eb80';
  const strokeCol = selected ? '#3b82f6' : '#555';
  const treadCol = selected ? '#3b82f6' : '#888';

  function drawStairArrowLocal(direction: 'up' | 'down') {
    ctx.fillStyle = selected ? '#3b82f6' : '#555';
    ctx.strokeStyle = selected ? '#3b82f6' : '#555';
    ctx.lineWidth = 1.5;
    const arrowY = direction === 'up' ? -d / 2 + d * 0.15 : d / 2 - d * 0.15;
    const arrowDir = direction === 'up' ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(0, arrowY - arrowDir * d * 0.3);
    ctx.lineTo(0, arrowY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, arrowY);
    ctx.lineTo(-w * 0.1, arrowY - arrowDir * d * 0.08);
    ctx.lineTo(w * 0.1, arrowY - arrowDir * d * 0.08);
    ctx.closePath();
    ctx.fill();
  }

  function drawStairLabelLocal() {
    ctx.fillStyle = '#374151';
    ctx.font = `${Math.max(8, 10 * zoom)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const sType = stair.stairType || 'straight';
    const typeLabel = sType === 'straight' ? '' : ` (${sType})`;
    ctx.fillText((stair.direction === 'up' ? 'UP' : 'DN') + typeLabel, 0, 0);
  }

  if (type === 'straight') {
    ctx.fillStyle = fillCol;
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(-w / 2, -d / 2, w, d);
    ctx.strokeRect(-w / 2, -d / 2, w, d);
    ctx.strokeStyle = treadCol;
    ctx.lineWidth = 0.5;
    const treadSpacing = d / stair.riserCount;
    for (let i = 1; i < stair.riserCount; i++) {
      const y = -d / 2 + i * treadSpacing;
      ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); ctx.stroke();
    }
    drawStairArrowLocal(stair.direction);
    drawStairLabelLocal();

  } else if (type === 'l-shaped') {
    const halfRisers = Math.floor(stair.riserCount / 2);
    const run1D = d / 2;
    const run2W = d / 2;
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(-w / 2, 0, w, run1D); ctx.strokeRect(-w / 2, 0, w, run1D);
    ctx.strokeStyle = treadCol; ctx.lineWidth = 0.5;
    const t1 = run1D / halfRisers;
    for (let i = 1; i < halfRisers; i++) { const y = i * t1; ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); ctx.stroke(); }
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(-w / 2, -w / 2, w, w / 2); ctx.strokeRect(-w / 2, -w / 2, w, w / 2);
    const run2Risers = stair.riserCount - halfRisers;
    ctx.fillRect(w / 2, -w / 2, run2W, w); ctx.strokeRect(w / 2, -w / 2, run2W, w);
    ctx.strokeStyle = treadCol; ctx.lineWidth = 0.5;
    const t2 = run2W / run2Risers;
    for (let i = 1; i < run2Risers; i++) { const x = w / 2 + i * t2; ctx.beginPath(); ctx.moveTo(x, -w / 2); ctx.lineTo(x, w / 2); ctx.stroke(); }
    ctx.fillStyle = selected ? '#3b82f6' : '#555'; ctx.strokeStyle = selected ? '#3b82f6' : '#555'; ctx.lineWidth = 1.5;
    const up = stair.direction === 'up';
    const tailY = run1D * (up ? .7 : .4), tipY = run1D * (up ? .4 : .7);
    const baseY = tipY + run1D * (up ? .08 : -.08);
    ctx.beginPath(); ctx.moveTo(0, tailY); ctx.lineTo(0, tipY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, tipY); ctx.lineTo(-w * .08, baseY); ctx.lineTo(w * .08, baseY); ctx.closePath(); ctx.fill();
    drawStairLabelLocal();

  } else if (type === 'u-shaped') {
    const halfRisers = Math.floor(stair.riserCount / 2);
    const runW = (w - w * 0.15) / 2;
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(-w / 2, -d / 2, runW, d); ctx.strokeRect(-w / 2, -d / 2, runW, d);
    ctx.strokeStyle = treadCol; ctx.lineWidth = 0.5;
    const tU = d / halfRisers;
    for (let i = 1; i < halfRisers; i++) { const y = -d / 2 + i * tU; ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(-w / 2 + runW, y); ctx.stroke(); }
    const run2Risers = stair.riserCount - halfRisers;
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(w / 2 - runW, -d / 2, runW, d); ctx.strokeRect(w / 2 - runW, -d / 2, runW, d);
    ctx.strokeStyle = treadCol; ctx.lineWidth = 0.5;
    const tU2 = d / run2Risers;
    for (let i = 1; i < run2Risers; i++) { const y = -d / 2 + i * tU2; ctx.beginPath(); ctx.moveTo(w / 2 - runW, y); ctx.lineTo(w / 2, y); ctx.stroke(); }
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(-w / 2, -d / 2 - w * 0.1, w, w * 0.1); ctx.strokeRect(-w / 2, -d / 2 - w * 0.1, w, w * 0.1);
    ctx.fillStyle = selected ? '#3b82f6' : '#555'; ctx.strokeStyle = selected ? '#3b82f6' : '#555'; ctx.lineWidth = 1.5;
    const sign = stair.direction === 'up' ? 1 : -1;
    for (const [x, direction] of [[-w / 2 + runW / 2, -sign], [w / 2 - runW / 2, sign]]) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, direction * d * .2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, direction * d * .2);
      ctx.lineTo(x - runW * .15, direction * d * .14); ctx.lineTo(x + runW * .15, direction * d * .14);
      ctx.closePath(); ctx.fill();
    }
    drawStairLabelLocal();

  } else if (type === 'spiral') {
    const r = Math.min(w, d) / 2;
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = selected ? 2 : 1;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const postR = r * 0.12;
    ctx.fillStyle = strokeCol; ctx.beginPath(); ctx.arc(0, 0, postR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = treadCol; ctx.lineWidth = 0.5;
    const totalAngle = Math.PI * 1.75;
    const startAngle = -Math.PI / 2;
    for (let i = 0; i <= stair.riserCount; i++) {
      const a = startAngle + (i / stair.riserCount) * totalAngle;
      ctx.beginPath(); ctx.moveTo(postR * Math.cos(a), postR * Math.sin(a)); ctx.lineTo(r * Math.cos(a), r * Math.sin(a)); ctx.stroke();
    }
    ctx.strokeStyle = selected ? '#3b82f6' : '#555'; ctx.fillStyle = selected ? '#3b82f6' : '#555'; ctx.lineWidth = 1.5;
    const arrowR = r * 0.7;
    const up = stair.direction === 'up';
    const aStart = startAngle + totalAngle * (up ? .15 : .85);
    const aEnd = startAngle + totalAngle * (up ? .85 : .15);
    ctx.beginPath(); ctx.arc(0, 0, arrowR, aStart, aEnd, !up); ctx.stroke();
    const ax2 = arrowR * Math.cos(aEnd);
    const ay2 = arrowR * Math.sin(aEnd);
    const tangent = aEnd + (up ? 1 : -1) * Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(ax2, ay2);
    ctx.lineTo(ax2 - 6 * Math.cos(tangent + 0.4), ay2 - 6 * Math.sin(tangent + 0.4));
    ctx.lineTo(ax2 - 6 * Math.cos(tangent - 0.4), ay2 - 6 * Math.sin(tangent - 0.4));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#374151'; ctx.font = `${Math.max(8, 10 * zoom)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(stair.direction === 'up' ? 'UP' : 'DN', 0, r + 12 * zoom);
  }

  if (selected) {
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    const b = stairLocalBounds(stair);
    ctx.strokeRect(b.minX * zoom - 2, b.minY * zoom - 2, (b.maxX - b.minX) * zoom + 4, (b.maxY - b.minY) * zoom + 4);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// ── Column drawing ───────────────────────────────────────────────────

export function drawColumn(cs: CanvasState, col: Column, selected: boolean): void {
  const { ctx, zoom } = cs;
  const s = wts(cs, col.position.x, col.position.y);
  const r = (col.diameter / 2) * zoom;

  ctx.save();
  ctx.translate(s.x, s.y);

  if (col.shape === 'round') {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = selected ? '#bfdbfe' : col.color; ctx.fill();
    ctx.strokeStyle = selected ? '#3b82f6' : '#555'; ctx.lineWidth = selected ? 2 : 1; ctx.stroke();
    ctx.strokeStyle = selected ? '#3b82f680' : '#88888880'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(r, r); ctx.moveTo(-r, r); ctx.lineTo(r, -r); ctx.stroke();
  } else {
    const angle = (col.rotation * Math.PI) / 180;
    ctx.rotate(angle);
    const side = col.diameter * zoom;
    ctx.fillStyle = selected ? '#bfdbfe' : col.color;
    ctx.fillRect(-side / 2, -side / 2, side, side);
    ctx.strokeStyle = selected ? '#3b82f6' : '#555'; ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(-side / 2, -side / 2, side, side);
    ctx.strokeStyle = selected ? '#3b82f680' : '#88888880'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-side / 2, -side / 2); ctx.lineTo(side / 2, side / 2); ctx.moveTo(-side / 2, side / 2); ctx.lineTo(side / 2, -side / 2); ctx.stroke();
  }

  if (selected) {
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    if (col.shape === 'round') {
      ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.stroke();
    } else {
      const side = col.diameter * zoom;
      ctx.strokeRect(-side / 2 - 4, -side / 2 - 4, side + 8, side + 8);
    }
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// ── Guide lines ──────────────────────────────────────────────────────

export function drawGuides(cs: CanvasState, floor: Floor, selectedGuideId: string | null, RULER_SIZE: number): void {
  if (!cs.ctx) return;
  const { ctx, width, height } = cs;
  const guides = floor.guides ?? [];
  const R = RULER_SIZE;
  for (const g of guides) {
    const selected = g.id === selectedGuideId;
    const color = g.orientation === 'horizontal' ? '#00bcd4' : '#e040fb';
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = selected ? 1.5 : 1;
    ctx.setLineDash([6, 4]); ctx.globalAlpha = selected ? 1.0 : 0.7;
    ctx.beginPath();
    if (g.orientation === 'horizontal') {
      const sy = wts(cs, 0, g.position).y;
      ctx.moveTo(R, sy); ctx.lineTo(width, sy);
    } else {
      const sx = wts(cs, g.position, 0).x;
      ctx.moveTo(sx, R); ctx.lineTo(sx, height);
    }
    ctx.stroke(); ctx.setLineDash([]);

    ctx.font = '10px sans-serif'; ctx.fillStyle = color; ctx.globalAlpha = 1;
    const label = formatLength(g.position, 'metric');
    if (g.orientation === 'horizontal') {
      const sy = wts(cs, 0, g.position).y;
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(label, R + 4, sy - 2);
    } else {
      const sx = wts(cs, g.position, 0).x;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(label, sx + 4, R + 2);
    }
    ctx.restore();
  }
}

// ── Persisted measurements ───────────────────────────────────────────

export function drawPersistedMeasurements(cs: CanvasState, floor: Floor, selectedMeasurementId: string | null, dimSettings: ProjectSettings): void {
  if (!floor.measurements) return;
  const { ctx } = cs;
  for (const m of floor.measurements) {
    const s = wts(cs, m.x1, m.y1);
    const e = wts(cs, m.x2, m.y2);
    const selected = m.id === selectedMeasurementId;
    ctx.strokeStyle = selected ? '#3b82f6' : '#ef4444';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.setLineDash([6, 3]);
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    ctx.setLineDash([]);

    for (const p of [s, e]) {
      ctx.fillStyle = selected ? '#3b82f6' : '#ef4444';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    }

    const dist = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
    const mx = (s.x + e.x) / 2;
    const my = (s.y + e.y) / 2;
    ctx.fillStyle = selected ? '#3b82f6' : '#ef4444';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(formatLength(dist, dimSettings.units), mx, my - 6);
  }
}

// ── Text annotations ─────────────────────────────────────────────────

export function drawTextAnnotations(cs: CanvasState, floor: Floor, selectedTextAnnotationId: string | null, currentSelectedId: string | null): void {
  if (!floor.textAnnotations) return;
  const { ctx, zoom } = cs;
  for (const ta of floor.textAnnotations) {
    const selected = ta.id === selectedTextAnnotationId || ta.id === currentSelectedId;
    const s = wts(cs, ta.x, ta.y);
    const fontSize = Math.max(8, ta.fontSize * zoom);
    ctx.save();
    ctx.translate(s.x, s.y);
    if (ta.rotation) ctx.rotate(ta.rotation * Math.PI / 180);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = ta.color || '#1e293b';
    const lines = ta.text.split('\n');
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 0, -totalHeight / 2 + lineHeight / 2 + i * lineHeight);
    }
    if (selected) {
      let maxW = 0;
      for (const line of lines) { const w = ctx.measureText(line).width; if (w > maxW) maxW = w; }
      const pad = 4;
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.strokeRect(-maxW / 2 - pad, -totalHeight / 2 - pad, maxW + pad * 2, totalHeight + pad * 2);
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
}

// ── Dimension annotations ────────────────────────────────────────────

export function drawAnnotation(cs: CanvasState, a: Annotation, selected: boolean, dimSettings: ProjectSettings): void {
  const { ctx, zoom } = cs;
  const offset = a.offset ?? 40;
  const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;

  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;

  const d1x = a.x1 + nx * offset, d1y = a.y1 + ny * offset;
  const d2x = a.x2 + nx * offset, d2y = a.y2 + ny * offset;

  const s1 = wts(cs, a.x1, a.y1);
  const s2 = wts(cs, a.x2, a.y2);
  const sd1 = wts(cs, d1x, d1y);
  const sd2 = wts(cs, d2x, d2y);

  const color = selected ? '#3b82f6' : '#6366f1';

  ctx.strokeStyle = color; ctx.lineWidth = 0.75;
  const extBeyond = 4 * zoom;
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y); ctx.lineTo(sd1.x + nx * extBeyond, sd1.y + ny * extBeyond);
  ctx.moveTo(s2.x, s2.y); ctx.lineTo(sd2.x + nx * extBeyond, sd2.y + ny * extBeyond);
  ctx.stroke();

  const dimMx = (sd1.x + sd2.x) / 2;
  const dimMy = (sd1.y + sd2.y) / 2;

  const dist = Math.hypot(a.x2 - a.x1, a.y2 - a.y1);
  const label = a.label || formatLength(dist, dimSettings.units);
  const fontSize = Math.max(10, 11 * zoom);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const textW = ctx.measureText(label).width;
  const halfGap = Math.min(textW / 2 + 4, Math.hypot(sd2.x-sd1.x,sd2.y-sd1.y)/2);

  ctx.strokeStyle = color; ctx.lineWidth = selected ? 1.5 : 1;
  const sux = (sd2.x - sd1.x) / Math.hypot(sd2.x - sd1.x, sd2.y - sd1.y) || 0;
  const suy = (sd2.y - sd1.y) / Math.hypot(sd2.x - sd1.x, sd2.y - sd1.y) || 0;
  ctx.beginPath();
  ctx.moveTo(sd1.x, sd1.y); ctx.lineTo(dimMx - sux * halfGap, dimMy - suy * halfGap);
  ctx.moveTo(dimMx + sux * halfGap, dimMy + suy * halfGap); ctx.lineTo(sd2.x, sd2.y);
  ctx.stroke();

  const arrowLen = Math.max(6, 7 * zoom);
  const arrowW = Math.max(2.5, 3 * zoom);
  ctx.fillStyle = color;
  for (const [px, py, dir] of [[sd1.x, sd1.y, 1], [sd2.x, sd2.y, -1]] as [number, number, number][]) {
    const adx = sux * arrowLen * dir;
    const ady = suy * arrowLen * dir;
    const apx = -suy * arrowW;
    const apy = sux * arrowW;
    ctx.beginPath(); ctx.moveTo(px, py);
    ctx.lineTo(px + adx + apx, py + ady + apy);
    ctx.lineTo(px + adx - apx, py + ady - apy);
    ctx.closePath(); ctx.fill();
  }

  ctx.fillStyle = color;
  ctx.fillText(label, dimMx, dimMy);

  if (selected) {
    for (const p of [s1, s2]) {
      ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

export function drawAnnotations(cs: CanvasState, floor: Floor, selectedAnnotationId: string | null, dimSettings: ProjectSettings): void {
  if (!floor.annotations) return;
  for (const a of floor.annotations) {
    drawAnnotation(cs, a, a.id === selectedAnnotationId, dimSettings);
  }
}

// ── Rooms ────────────────────────────────────────────────────────────

const ROOM_FILLS_BY_TYPE: Record<string, string> = {
  'Living Room': 'rgba(96, 165, 250, 0.08)',
  'Bedroom': 'rgba(167, 139, 250, 0.08)',
  'Kitchen': 'rgba(251, 191, 36, 0.08)',
  'Bathroom': 'rgba(45, 212, 191, 0.08)',
  'Dining Room': 'rgba(251, 146, 60, 0.08)',
  'Office': 'rgba(52, 211, 153, 0.08)',
  'Hallway': 'rgba(156, 163, 175, 0.06)',
  'Closet': 'rgba(244, 114, 182, 0.06)',
  'Laundry': 'rgba(129, 140, 248, 0.08)',
  'Garage': 'rgba(163, 163, 163, 0.08)',
};
const ROOM_FILLS_DEFAULT = [
  'rgba(167, 139, 250, 0.07)', 'rgba(96, 165, 250, 0.07)', 'rgba(52, 211, 153, 0.07)',
  'rgba(251, 191, 36, 0.07)', 'rgba(248, 113, 113, 0.07)', 'rgba(244, 114, 182, 0.07)',
  'rgba(45, 212, 191, 0.07)', 'rgba(251, 146, 60, 0.07)',
];

export function getRoomFill(room: Room, index: number): string {
  // Solid-color floors (floorTexture 'none') show the room color much more
  // strongly since there is no texture painted on top.
  const solid = room.floorTexture === 'none';
  if (room.color) {
    const hex = room.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${solid ? 0.45 : 0.12})`;
  }
  return ROOM_FILLS_BY_TYPE[room.name] ?? ROOM_FILLS_DEFAULT[index % ROOM_FILLS_DEFAULT.length];
}

type FloorPatternType = 'wood' | 'tile' | 'stone' | 'none';
const ROOM_FLOOR_PATTERN: Record<string, FloorPatternType> = {
  'Living Room': 'wood', 'Bedroom': 'wood', 'Office': 'wood', 'Dining Room': 'wood', 'Hallway': 'wood',
  'Kitchen': 'tile', 'Bathroom': 'tile', 'Laundry': 'tile',
  'Garage': 'stone', 'Closet': 'none',
};

export function drawRoomFloorPattern(cs: CanvasState, room: Room, screenPoly: Point[], holes: Point[][] = []): void {
  const { ctx, zoom } = cs;
  // Solid-color floor: no texture, no fallback pattern — the fill from
  // getRoomFill is the floor.
  if (room.floorTexture === 'none') return;
  if (room.floorTexture) {
    const texCanvas = getFloorTextureCanvas(room.floorTexture);
    if (texCanvas) {
      ctx.save();
      traceRoomRings(ctx, screenPoly, holes); ctx.clip('evenodd');
      ctx.globalAlpha = 0.5;
      const scale = zoom * 0.15;
      ctx.scale(scale, scale);
      const pat = ctx.createPattern(texCanvas, 'repeat');
      if (pat) {
        ctx.fillStyle = pat;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of screenPoly) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }
        ctx.fillRect(minX / scale - 10, minY / scale - 10, (maxX - minX) / scale + 20, (maxY - minY) / scale + 20);
      }
      ctx.restore();
      return;
    }
  }

  const pattern = ROOM_FLOOR_PATTERN[room.name] ?? 'wood';
  if (pattern === 'none' || zoom < 0.3) return;

  ctx.save();
  traceRoomRings(ctx, screenPoly, holes); ctx.clip('evenodd');

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of screenPoly) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }

  const alpha = Math.min(0.12, 0.04 + zoom * 0.02);
  ctx.strokeStyle = `rgba(120, 120, 120, ${alpha})`;
  ctx.lineWidth = 0.5;

  if (pattern === 'wood') {
    const spacing = 15 * zoom;
    if (spacing > 3) {
      for (let y = minY; y <= maxY; y += spacing) { ctx.beginPath(); ctx.moveTo(minX, y); ctx.lineTo(maxX, y); ctx.stroke(); }
      const jointSpacing = 60 * zoom;
      if (jointSpacing > 8) {
        let row = 0;
        for (let y = minY; y <= maxY; y += spacing) {
          const offset = (row % 2) * jointSpacing * 0.5;
          for (let x = minX + offset; x <= maxX; x += jointSpacing) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + spacing); ctx.stroke(); }
          row++;
        }
      }
    }
  } else if (pattern === 'tile') {
    const tileSize = 30 * zoom;
    if (tileSize > 5) {
      for (let x = minX; x <= maxX; x += tileSize) { ctx.beginPath(); ctx.moveTo(x, minY); ctx.lineTo(x, maxY); ctx.stroke(); }
      for (let y = minY; y <= maxY; y += tileSize) { ctx.beginPath(); ctx.moveTo(minX, y); ctx.lineTo(maxX, y); ctx.stroke(); }
    }
  } else if (pattern === 'stone') {
    const spacing = 25 * zoom;
    if (spacing > 5) {
      const w = maxX - minX, h = maxY - minY;
      for (let d = -h; d <= w; d += spacing) { ctx.beginPath(); ctx.moveTo(minX + d, minY); ctx.lineTo(minX + d + h, maxY); ctx.stroke(); }
    }
  }

  ctx.restore();
}

export function drawRooms(
  cs: CanvasState,
  floor: Floor,
  detectedRooms: Room[],
  currentSelectedRoomId: string | null,
  showRoomLabels: boolean,
  showDimensions: boolean,
  dimSettings: ProjectSettings,
  polygons?: ReadonlyMap<string, Point[]>,
): void {
  const { ctx, zoom } = cs;
  const roomPolygons = detectedRooms.map(room => polygons?.get(room.id) ?? getRoomPolygon(room, floor.walls));
  const holes = roomHoles(roomPolygons);
  for (let ri = 0; ri < detectedRooms.length; ri++) {
    const room = detectedRooms[ri];
    const poly = roomPolygons[ri];
    if (poly.length < 3) continue;
    const screenPoly = poly.map(p => wts(cs, p.x, p.y));
    const screenHoles = holes[ri].map(ring => ring.map(p => wts(cs, p.x, p.y)));
    ctx.fillStyle = getRoomFill(room, ri);
    traceRoomRings(ctx, screenPoly, screenHoles); ctx.fill('evenodd');

    drawRoomFloorPattern(cs, room, screenPoly, screenHoles);

    const isSelected = currentSelectedRoomId === room.id;
    if (isSelected) {
      traceRoomRings(ctx, screenPoly, screenHoles);
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([]);
    }

    const centroid = roomCentroid(poly);
    const sc = wts(cs, centroid.x, centroid.y);
    const fontSize = Math.max(11, 13 * zoom);
    if (showRoomLabels) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const anchor = roomLabelPosition(room, poly);
      const label = wts(cs, anchor.x, anchor.y);
      ctx.fillText(`${room.name} (${formatArea(room.area, dimSettings.units)})`, label.x, label.y);
    }

    if (showDimensions && dimSettings.showInternalDimensions && poly.length >= 3) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const pt of poly) { if (pt.x < minX) minX = pt.x; if (pt.x > maxX) maxX = pt.x; if (pt.y < minY) minY = pt.y; if (pt.y > maxY) maxY = pt.y; }
      const roomW = (maxX - minX) / 100;
      const roomD = (maxY - minY) / 100;
      if (roomW > 0.1 && roomD > 0.1) {
        const dimFontSize = Math.max(9, 10 * zoom);
        ctx.fillStyle = '#b0b8c4'; ctx.font = `${dimFontSize}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${formatLength(roomW * 100, dimSettings.units)} × ${formatLength(roomD * 100, dimSettings.units)}`, sc.x, sc.y + fontSize + 2);
      }
    }
  }
}

// ── Wall joints ──────────────────────────────────────────────────────

export function drawWallJoints(cs: CanvasState, floor: Floor, selId: string | null): void {
  const { ctx, zoom } = cs;
  const epMap = new Map<string, { x: number; y: number; thickness: number; selected: boolean }[]>();
  for (const w of floor.walls) {
    const sel = w.id === selId;
    for (const ep of [w.start, w.end]) {
      const key = `${Math.round(ep.x)},${Math.round(ep.y)}`;
      if (!epMap.has(key)) epMap.set(key, []);
      epMap.get(key)!.push({ x: ep.x, y: ep.y, thickness: w.thickness, selected: sel });
    }
  }
  for (const [, entries] of epMap) {
    if (entries.length < 2) continue;
    const anySelected = entries.some(e => e.selected);
    const maxThickness = Math.max(...entries.map(e => e.thickness));
    const s = wts(cs, entries[0].x, entries[0].y);
    const r = Math.max(maxThickness * zoom, 4) / 2 + 0.5;
    ctx.fillStyle = anySelected ? '#93c5fd' : '#404040';
    ctx.strokeStyle = anySelected ? '#3b82f6' : '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

// ── Snap points ──────────────────────────────────────────────────────

export function drawSnapPoints(cs: CanvasState, floor: Floor, showGrid: boolean): void {
  if (!showGrid) return;
  const { ctx } = cs;
  ctx.fillStyle = '#3b82f640';
  const seen = new Set<string>();
  for (const w of floor.walls) {
    for (const ep of [w.start, w.end]) {
      const key = `${ep.x},${ep.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const s = wts(cs, ep.x, ep.y);
      ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ── Minimap ──────────────────────────────────────────────────────────

export function drawMinimap(
  cs: CanvasState,
  minimapCanvas: HTMLCanvasElement,
  floor: Floor,
  getWorldBBox: () => { minX: number; minY: number; maxX: number; maxY: number } | null,
  visibility: { measurements?: boolean; annotations?: boolean; textAnnotations?: boolean } = {},
): void {
  const mctx = minimapCanvas.getContext('2d');
  if (!mctx) return;
  const mw = minimapCanvas.width;
  const mh = minimapCanvas.height;
  mctx.clearRect(0, 0, mw, mh);

  const bbox = getWorldBBox();
  if (!bbox) return;

  mctx.fillStyle = '#f0f1f3'; mctx.fillRect(0, 0, mw, mh);

  const bw = bbox.maxX - bbox.minX;
  const bh = bbox.maxY - bbox.minY;
  if (bw < 1 || bh < 1) return;
  const scale = Math.min((mw - 8) / bw, (mh - 8) / bh);
  const ox = (mw - bw * scale) / 2;
  const oy = (mh - bh * scale) / 2;

  function toMini(wx: number, wy: number) {
    return { x: ox + (wx - bbox!.minX) * scale, y: oy + (wy - bbox!.minY) * scale };
  }

  mctx.strokeStyle = '#555';
  mctx.lineWidth = Math.max(1, 2 * scale);
  for (const w of floor.walls) {
    const s = toMini(w.start.x, w.start.y);
    const e = toMini(w.end.x, w.end.y);
    mctx.beginPath();
    if (w.curvePoint) {
      const cp = toMini(w.curvePoint.x, w.curvePoint.y);
      mctx.moveTo(s.x, s.y); mctx.quadraticCurveTo(cp.x, cp.y, e.x, e.y);
    } else {
      mctx.moveTo(s.x, s.y); mctx.lineTo(e.x, e.y);
    }
    mctx.stroke();
  }

  for (const fi of floor.furniture) {
    const cat = getCatalogItem(fi.catalogId);
    const p = toMini(fi.position.x, fi.position.y);
    const size = getFurnitureSize(fi);
    const fw = Math.max(2, size.width * scale);
    const fd = Math.max(2, size.depth * scale);
    mctx.fillStyle = fi.color ?? cat?.color ?? '#94a3b8';
    mctx.save();
    mctx.translate(p.x, p.y);
    mctx.rotate((fi.rotation * Math.PI) / 180);
    mctx.fillRect(-fw / 2, -fd / 2, fw, fd);
    mctx.restore();
  }

  // Small navigation markers remain legible when full symbols would be subpixel.
  const marker = (x: number, y: number, color: string) => {
    const p = toMini(x, y);
    mctx.fillStyle = color; mctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    const a = toMini(x1, y1), b = toMini(x2, y2);
    mctx.strokeStyle = '#64748b'; mctx.lineWidth = 1;
    mctx.beginPath(); mctx.moveTo(a.x, a.y); mctx.lineTo(b.x, b.y); mctx.stroke();
  }
  for (const item of floor.stairs ?? []) marker(item.position.x, item.position.y, '#64748b');
  for (const item of floor.columns ?? []) marker(item.position.x, item.position.y, item.color || '#64748b');
  for (const item of floor.entourage ?? []) marker(item.position.x, item.position.y, '#16a34a');
  if (visibility.textAnnotations !== false) for (const item of floor.textAnnotations ?? []) marker(item.x, item.y, item.color || '#1e293b');
  if (visibility.measurements !== false) for (const item of floor.measurements ?? []) line(item.x1, item.y1, item.x2, item.y2);
  if (visibility.annotations !== false) for (const item of floor.annotations ?? []) {
    line(item.x1, item.y1, item.x2, item.y2);
    const g = dimensionPlanGeometry(item);
    if (g) line(g.start.x, g.start.y, g.end.x, g.end.y);
  }
  if (floor.backgroundImage) marker(floor.backgroundImage.position.x, floor.backgroundImage.position.y, '#a855f7');

  const { width, height, zoom, camX, camY } = cs;
  const vpTL = { x: (0 - width / 2) / zoom + camX, y: (0 - height / 2) / zoom + camY };
  const vpBR = { x: (width - width / 2) / zoom + camX, y: (height - height / 2) / zoom + camY };
  const vtl = toMini(vpTL.x, vpTL.y);
  const vbr = toMini(vpBR.x, vpBR.y);
  mctx.strokeStyle = '#3b82f6'; mctx.lineWidth = 1.5;
  mctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
  const vw = vbr.x - vtl.x;
  const vh = vbr.y - vtl.y;
  mctx.fillRect(vtl.x, vtl.y, vw, vh);
  mctx.strokeRect(vtl.x, vtl.y, vw, vh);

  mctx.strokeStyle = '#cbd5e1'; mctx.lineWidth = 1; mctx.strokeRect(0, 0, mw, mh);
}

// ── Entourage drawing (2D presentation symbols) ─────────────────────

const entouragePathCache = new Map<string, Path2D[]>();
function getEntouragePaths(defId: string): Path2D[] | null {
  let cached = entouragePathCache.get(defId);
  if (cached) return cached;
  const def = getEntourageDef(defId);
  if (!def) return null;
  cached = def.paths.map((d) => new Path2D(d));
  entouragePathCache.set(defId, cached);
  return cached;
}

/** height/width aspect for a built-in or custom entourage def */
export function entourageAspect(defId: string, customDefs?: CustomEntourageDef[]): number {
  return getEntourageDef(defId)?.aspect ?? customDefs?.find((c) => c.id === defId)?.aspect ?? 1;
}

export function drawEntourageItem(
  cs: CanvasState,
  item: EntourageItem,
  customDefs: CustomEntourageDef[] | undefined,
  selected: boolean,
  onImageLoad?: () => void,
  preparedImages?: ReadonlyMap<string,HTMLImageElement>,
): void {
  const { ctx, zoom } = cs;
  const s = wts(cs, item.position.x, item.position.y);
  const def = getEntourageDef(item.defId);
  const custom = def ? undefined : customDefs?.find((c) => c.id === item.defId);
  if (!def && !custom) return;
  const aspect = def?.aspect ?? custom!.aspect;
  const wPx = item.width * zoom;
  const hPx = wPx * aspect;

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(((item.rotation || 0) * Math.PI) / 180);
  ctx.globalAlpha = item.opacity ?? 1;

  if (def) {
    const scale = wPx / 100;
    if (scale > 0.01) {
      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(-50, -50 * aspect);
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = Math.min(1.6 / scale, 4);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const path of getEntouragePaths(item.defId) ?? []) ctx.stroke(path);
      ctx.restore();
    }
  } else if (custom) {
    const img = preparedImages?.get(custom.id) ?? getEntourageImage(custom, onImageLoad);
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -wPx / 2, -hPx / 2, wPx, hPx);
    } else {
      ctx.strokeStyle = '#cbd5e1';
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(-wPx / 2, -hPx / 2, wPx, hPx);
      ctx.setLineDash([]);
    }
  }

  ctx.globalAlpha = 1;
  if (selected) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(-wPx / 2 - 4, -hPx / 2 - 4, wPx + 8, hPx + 8);
    ctx.setLineDash([]);
    // SE resize handle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.rect(wPx / 2 - 1, hPx / 2 - 1, 8, 8);
    ctx.fill();
    ctx.stroke();
    if (item.locked) {
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔒', 0, -hPx / 2 - 10);
    }
  }
  ctx.restore();
}

export function drawEntourageItems(
  cs: CanvasState,
  floor: Floor,
  selectedId: string | null,
  customDefs?: CustomEntourageDef[],
  onImageLoad?: () => void,
  preparedImages?: ReadonlyMap<string,HTMLImageElement>,
): void {
  if (!floor.entourage) return;
  for (const item of floor.entourage) {
    drawEntourageItem(cs, item, customDefs, item.id === selectedId, onImageLoad, preparedImages);
  }
}

export function drawEntourageGhost(
  cs: CanvasState,
  defId: string,
  customDefs: CustomEntourageDef[] | undefined,
  pos: Point,
  width: number,
): void {
  const { ctx } = cs;
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawEntourageItem(
    cs,
    { id: '__ghost__', defId, position: pos, width, rotation: 0 },
    customDefs,
    false,
  );
  ctx.restore();
}

// ── Floor-below ghost ────────────────────────────────────────────────

/** Envelope walls of the floor below; everything else there is a partition. */
const GHOST_OUTER_FILL = 'rgba(100, 116, 139, 0.30)';
const GHOST_INNER_FILL = 'rgba(100, 116, 139, 0.14)';

/** Screen-space outline of a wall's footprint band, following its curve if it has one. */
function wallBandPath(cs: CanvasState, w: Wall): { x: number; y: number }[] {
  const s = wts(cs, w.start.x, w.start.y);
  const e = wts(cs, w.end.x, w.end.y);
  const half = wallThicknessScreen(w, cs.zoom) / 2;

  if (w.curvePoint) {
    const cp = wts(cs, w.curvePoint.x, w.curvePoint.y);
    const SEGS = 24;
    const outer: { x: number; y: number }[] = [];
    const inner: { x: number; y: number }[] = [];
    for (let i = 0; i <= SEGS; i++) {
      const t = i / SEGS;
      const mt = 1 - t;
      const px = mt * mt * s.x + 2 * mt * t * cp.x + t * t * e.x;
      const py = mt * mt * s.y + 2 * mt * t * cp.y + t * t * e.y;
      const tdx = 2 * mt * (cp.x - s.x) + 2 * t * (e.x - cp.x);
      const tdy = 2 * mt * (cp.y - s.y) + 2 * t * (e.y - cp.y);
      const tlen = Math.hypot(tdx, tdy) || 1;
      const nx = (-tdy / tlen) * half;
      const ny = (tdx / tlen) * half;
      outer.push({ x: px + nx, y: py + ny });
      inner.push({ x: px - nx, y: py - ny });
    }
    return [...outer, ...inner.reverse()];
  }

  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * half;
  const ny = (dx / len) * half;
  return [
    { x: s.x + nx, y: s.y + ny },
    { x: e.x + nx, y: e.y + ny },
    { x: e.x - nx, y: e.y - ny },
    { x: s.x - nx, y: s.y - ny },
  ];
}

function tracePolygon(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

/**
 * Draw the storey below as a dim, non-interactive reference layer.
 *
 * Sits above this floor's room fills (which are opaque) but below its walls, so
 * the layout underneath shows through without competing with what you are
 * editing. Envelope walls are drawn a shade stronger than partitions — when you
 * are laying out an upper storey, the footprint you have to stay inside matters
 * more than which rooms happen to sit under it. Stairs come along because an
 * upper floor's stairwell opening has to land on the flight below.
 *
 * `outerWallIds` is passed in rather than derived here: envelope detection runs
 * room detection, which is far too costly to repeat on every animation frame.
 */
export function drawFloorBelowGhost(cs: CanvasState, floor: Floor, outerWallIds: Set<string>): void {
  const { ctx } = cs;
  ctx.save();

  for (const w of floor.walls) {
    ctx.fillStyle = outerWallIds.has(w.id) ? GHOST_OUTER_FILL : GHOST_INNER_FILL;
    tracePolygon(ctx, wallBandPath(cs, w));
    ctx.fill();
  }

  // Use the same footprints, treads and direction indicators as the edited floor.
  // Alpha keeps the reference subdued without replacing its geometry.
  ctx.globalAlpha *= .45;
  for (const stair of floor.stairs ?? []) drawStair(cs, stair, false);

  ctx.restore();
}
