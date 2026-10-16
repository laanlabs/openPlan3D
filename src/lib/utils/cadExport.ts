import { drawEntourageDxf } from './entourageDxf';
import type { Locale } from '$lib/i18n';
import { furnitureName, customModelName } from '$lib/i18n/furnitureNames';
import { getEntourageDef } from './entourageCatalog';
import { canvasSymbolDxf } from './canvasSymbolDxf';
import { drawStair } from './canvasRenderer';
import { columnPlanCorners } from './columnPlanGeometry';
import { hasPlanExportContent } from './planExportContent';
import { cadText } from './exportText';
import { dimensionPlanGeometry } from './dimensionPlanGeometry';
import { textAnnotationLines } from './textAnnotationLayout';
import { doorSymbol } from './doorSymbol';
import { planOpening } from './planOpening';
import { planWallOutlines } from './planWallOutline';
import Drawing from 'dxf-writer';
import { drawFurnitureDxf } from './furnitureDxf';
import { wallDimensionLabel } from './wallDimensionLabel';
import type { Project } from '$lib/models/types';
import { getCatalogItem, getFurnitureSize } from '$lib/utils/furnitureCatalog';
import { resolveRooms, getRoomPolygon, roomLabelPosition } from '$lib/utils/roomDetection';
import { roomHoles } from './roomNesting';
import { projectSettings, formatArea, formatLength } from '$lib/stores/settings';
import { currentPlanExportVisibility } from '$lib/stores/planVisibility';
import { visibleActiveFloor, type PlanExportVisibility } from './exportVisibility';
import { get } from 'svelte/store';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// DXF layer colors (AutoCAD Color Index)
const LAYER_COLORS = {
  WALLS: 7,       // white/black
  DOORS: 30,      // brown
  WINDOWS: 5,     // blue
  FURNITURE: 3,   // green
  DIMENSIONS: 8,  // gray
  ROOMS: 4,       // cyan
};

/** Plan (screen) radians to DXF degrees in [0, 360). */
const cadDegrees = (radians: number) => ((radians * 180 / Math.PI) % 360 + 360) % 360;

/** What a CAD export did: true once the file is downloaded, otherwise why nothing was written. */
export type CadExportResult = true | 'empty' | 'unsupported';

/**
 * Returns true once a file is downloaded. Otherwise nothing is written: 'empty' when the active
 * floor has nothing to export, 'unsupported' when its only content is uploaded entourage images or
 * entourage at 0% opacity, which the SVG, PNG and PDF exports draw but CAD linework cannot.
 * Layers hidden in the 2D view are left out, as in PNG and SVG.
 */
export function exportDXF(project: Project, language: Locale = 'en', visibility: PlanExportVisibility = currentPlanExportVisibility()): CadExportResult {
  const floor = visibleActiveFloor(project, visibility);
  if (!floor) return 'empty';
  const entourage = floor.entourage ?? [];
  if (!hasPlanExportContent(floor) && !entourage.some(e=>getEntourageDef(e.defId) && e.opacity!==0)) {
    return entourage.some(e=>getEntourageDef(e.defId) || project.customEntourage?.some(def=>def.id===e.defId)) ? 'unsupported' : 'empty';
  }

  const d = new Drawing();
  d.setUnits('Centimeters');

  // Add layers
  d.addLayer('WALLS', LAYER_COLORS.WALLS, 'CONTINUOUS');
  d.addLayer('DOORS', LAYER_COLORS.DOORS, 'CONTINUOUS');
  d.addLayer('DOORS_HIDDEN', LAYER_COLORS.DOORS, 'DASHED'); // pocket cavities, doorway thresholds
  d.addLayer('WINDOWS', LAYER_COLORS.WINDOWS, 'CONTINUOUS');
  d.addLayer('FURNITURE', LAYER_COLORS.FURNITURE, 'CONTINUOUS');
  d.addLayer('DIMENSIONS', LAYER_COLORS.DIMENSIONS, 'CONTINUOUS');
  d.addLayer('ROOMS', LAYER_COLORS.ROOMS, 'CONTINUOUS');

  // Draw rooms (labels)
  d.setActiveLayer('ROOMS');
  const rooms = resolveRooms(floor);
  const polygons = rooms.map(room=>getRoomPolygon(room,floor.walls)), holes=roomHoles(polygons);
  for (const [index, room] of visibility.roomLabels ? rooms.entries() : []) {
    const poly = polygons[index];
    if (poly.length < 3) continue;
    const c = roomLabelPosition(room, poly, holes[index]);
    // Y is flipped in screen coords vs CAD coords
    d.drawText(c.x, -c.y, 8, 0, cadText(room.name), 'center', 'middle');
    d.drawText(c.x, -c.y - 12, 5, 0, `${formatArea(room.area, get(projectSettings).units)}`, 'center', 'middle');
  }

  // One continuous outline per wall run, separated by openings.
  d.setActiveLayer('WALLS');
  for (const wall of visibility.walls ? floor.walls : []) {
    const openings = [...floor.doors, ...floor.windows].filter(o => o.wallId === wall.id);
    for (const outline of planWallOutlines(wall, openings)) {
      d.drawPolyline([...outline, outline[0]].map(p => [p.x, -p.y]));
    }
  }

  const textLayers = new Set<string>();
  for (const note of floor.textAnnotations ?? []) {
    const raw = note.color || '#1e293b';
    const hex = /^#[0-9a-f]{6}$/i.test(raw) ? raw.slice(1) : /^#[0-9a-f]{3}$/i.test(raw) ? [...raw.slice(1)].map(c => c + c).join('') : '1e293b';
    const layer = `TEXT_${hex.toUpperCase()}`;
    if (!textLayers.has(layer)) { d.addLayer(layer, 7, 'CONTINUOUS'); textLayers.add(layer); }
    d.setActiveLayer(layer); d.setTrueColor(parseInt(hex, 16));
    const { fontSize, lines } = textAnnotationLines(note), angle = note.rotation * Math.PI / 180;
    for (const line of lines) {
      if (line.text) d.drawText(note.x - line.y * Math.sin(angle), -(note.y + line.y * Math.cos(angle)), fontSize, -note.rotation, cadText(line.text), 'center', 'middle');
    }
  }

  // Draw dimensions
  d.setActiveLayer('DIMENSIONS');
  for (const w of visibility.wallDimensions ? floor.walls : []) {
    // Follows Settings → Measure walls like the editor and the other exports (issue #106).
    const { length: len, point: midpoint } = wallDimensionLabel(w, floor.walls, get(projectSettings).wallMeasureMode);
    const mx = midpoint.x;
    const my = -midpoint.y;
    const angle = Math.atan2(-(w.end.y - w.start.y), w.end.x - w.start.x) * (180 / Math.PI);
    d.drawText(mx, my, 5, angle, `${len} cm`, 'center', 'bottom');
  }

  for (const note of floor.annotations ?? []) {
    const g = dimensionPlanGeometry(note); if (!g) continue;
    d.drawLine(note.x1,-note.y1,g.start.x,-g.start.y);
    d.drawLine(note.x2,-note.y2,g.end.x,-g.end.y);
    d.drawLine(g.start.x,-g.start.y,g.end.x,-g.end.y);
    for (const [point, sign] of [[g.start,1],[g.end,-1]] as const) {
      for (const side of [-1,1]) d.drawLine(point.x,-point.y,point.x+g.ux*7*sign+g.nx*3*side,-(point.y+g.uy*7*sign+g.ny*3*side));
    }
    d.drawText(g.center.x,-g.center.y+4,11,0,cadText(note.label || formatLength(g.length,get(projectSettings).units)),'center','bottom');
  }

  d.addLayer('MEASUREMENTS', 1, 'DASHED');
  d.addLayer('MEASUREMENT_LABELS', 1, 'CONTINUOUS');
  for (const m of floor.measurements ?? []) {
    d.setActiveLayer('MEASUREMENTS'); d.drawLine(m.x1,-m.y1,m.x2,-m.y2);
    d.setActiveLayer('MEASUREMENT_LABELS');
    d.drawCircle(m.x1,-m.y1,3); d.drawCircle(m.x2,-m.y2,3);
    d.drawText((m.x1+m.x2)/2,-(m.y1+m.y2)/2+6,12,0,formatLength(Math.hypot(m.x2-m.x1,m.y2-m.y1),get(projectSettings).units),'center','bottom');
  }

  // Doors: the shared plan symbol (doorSymbol.ts) mirrored into CAD's y-up frame, so the
  // hinge jamb, swing side and leaf match the editor, the SVG export and the 3D view.
  for (const original of floor.doors) {
    const source = floor.walls.find(w => w.id === original.wallId);
    if (!source) continue;
    const frame = planOpening(source, original.position, original.width);
    if (!frame) continue;
    for (const part of doorSymbol(frame.wall, { ...original, position: frame.position, width: frame.width })) {
      if (part.role === 'hinge') continue; // screen-only marker
      d.setActiveLayer(part.role === 'track' || part.role === 'threshold' ? 'DOORS_HIDDEN' : 'DOORS');
      if (part.role === 'swing') {
        // Negating y negates the angles and reverses the sweep; DXF arcs always run counter-clockwise.
        d.drawArc(part.cx, -part.cy, part.r, cadDegrees(-Math.max(part.from, part.to)), cadDegrees(-Math.min(part.from, part.to)));
      } else if (part.points.length > 2) d.drawPolyline(part.points.map(p => [p.x, -p.y]));
      else d.drawLine(part.points[0].x, -part.points[0].y, part.points[1].x, -part.points[1].y);
    }
  }

  // Draw windows as parallel lines
  d.setActiveLayer('WINDOWS');
  for (const original of floor.windows) {
    const source = floor.walls.find(w => w.id === original.wallId);
    if (!source) continue;
    const frame = planOpening(source, original.position, original.width);
    if (!frame) continue;
    const wall = frame.wall, win = { ...original, position: frame.position, width: frame.width };

    const wdx = wall.end.x - wall.start.x;
    const wdy = wall.end.y - wall.start.y;
    const wlen = Math.hypot(wdx, wdy);
    if (wlen === 0) continue;

    const ux = wdx / wlen, uy = wdy / wlen;
    const nx = -uy, ny = ux; // perpendicular

    const cx = wall.start.x + wdx * win.position;
    const cy = -(wall.start.y + wdy * win.position);
    const halfW = win.width / 2;
    const gap = 3; // gap between parallel lines

    // Two parallel lines representing the window
    for (const offset of [-gap, gap]) {
      const ox = nx * offset, oy = -ny * offset;
      d.drawLine(
        cx - ux * halfW + ox, cy + uy * halfW + oy,
        cx + ux * halfW + ox, cy - uy * halfW + oy
      );
    }
  }

  // Draw furniture
  d.setActiveLayer('FURNITURE');
  for (const fi of floor.furniture) {
    const cat = getCatalogItem(fi.catalogId);
    const { width: fw, depth: fd } = getFurnitureSize(fi);
    const fx = fi.position.x;
    const fy = -fi.position.y;
    const rot = (fi.rotation || 0) * Math.PI / 180;

    if (cat) drawFurnitureDxf(d, fi);
    else {
    // Unknown entries retain the simple CAD footprint.
    const hw = fw / 2, hd = fd / 2;
    const corners: [number, number][] = [
      [-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]
    ];
    const rotated = corners.map(([cx, cy]) => {
      const rx = cx * Math.cos(rot) - cy * Math.sin(rot);
      const ry = cx * Math.sin(rot) + cy * Math.cos(rot);
      return [fx + rx, fy - ry] as [number, number];
    });
    rotated.push(rotated[0]); // close
    d.drawPolyline(rotated);
    }

    // Label
    d.drawText(fx, fy, 4, 0, cadText(customModelName(fi, project) ?? (cat ? furnitureName(fi.catalogId, language) : 'Unknown furniture')), 'center', 'middle');
  }

  d.addLayer('ENTOURAGE', 8, 'CONTINUOUS');
  d.setActiveLayer('ENTOURAGE');
  for(const item of floor.entourage ?? []) drawEntourageDxf(d,item);

  d.addLayer('STAIRS', 8, 'CONTINUOUS');
  d.setActiveLayer('STAIRS');
  for (const stair of floor.stairs ?? []) canvasSymbolDxf(d,ctx=>drawStair({ctx,width:0,height:0,zoom:1,camX:0,camY:0},stair,false));

  d.addLayer('COLUMNS', 7, 'CONTINUOUS');
  d.setActiveLayer('COLUMNS');
  for (const column of floor.columns ?? []) {
    const points = columnPlanCorners(column);
    if (column.shape === 'round') d.drawCircle(column.position.x, -column.position.y, column.diameter / 2);
    else d.drawPolyline([...points, points[0]].map(p => [p.x, -p.y]));
    for (const [a, b] of [[points[0], points[2]], [points[1], points[3]]]) d.drawLine(a.x, -a.y, b.x, -b.y);
  }

  const dxfString = d.toDxfString();
  const blob = new Blob([dxfString], { type: 'application/dxf' });
  download(blob, `${project.name || 'floorplan'}.dxf`);
  return true;
}

/**
 * DWG is a proprietary binary format with no JS writer, so the DXF (which AutoCAD,
 * SketchUp and FreeCAD open directly) is downloaded instead. Returns what exportDXF
 * returns; the caller tells the user about the substitution.
 */
export function exportDWG(project: Project, language: Locale = 'en', visibility: PlanExportVisibility = currentPlanExportVisibility()): CadExportResult {
  return exportDXF(project, language, visibility);
}
