import Drawing from 'dxf-writer';
import { wallPlanDimension } from './wallPlanGeometry';
import { wallPathSpans } from './wallProfiles';
import type { Project } from '$lib/models/types';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { resolveRooms, getRoomPolygon, roomLabelPosition } from '$lib/utils/roomDetection';
import { projectSettings, formatArea } from '$lib/stores/settings';
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

export function exportDXF(project: Project) {
  const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
  if (!floor || floor.walls.length === 0) return;

  const d = new Drawing();
  d.setUnits('Centimeters');

  // Add layers
  d.addLayer('WALLS', LAYER_COLORS.WALLS, 'CONTINUOUS');
  d.addLayer('DOORS', LAYER_COLORS.DOORS, 'CONTINUOUS');
  d.addLayer('WINDOWS', LAYER_COLORS.WINDOWS, 'CONTINUOUS');
  d.addLayer('FURNITURE', LAYER_COLORS.FURNITURE, 'CONTINUOUS');
  d.addLayer('DIMENSIONS', LAYER_COLORS.DIMENSIONS, 'CONTINUOUS');
  d.addLayer('ROOMS', LAYER_COLORS.ROOMS, 'CONTINUOUS');

  // Draw rooms (labels)
  d.setActiveLayer('ROOMS');
  const rooms = resolveRooms(floor);
  for (const room of rooms) {
    const poly = getRoomPolygon(room, floor.walls);
    if (poly.length < 3) continue;
    const c = roomLabelPosition(room, poly);
    // Y is flipped in screen coords vs CAD coords
    d.drawText(c.x, -c.y, 8, 0, room.name, 'center', 'middle');
    d.drawText(c.x, -c.y - 12, 5, 0, `${formatArea(room.area, get(projectSettings).units)}`, 'center', 'middle');
  }

  // Draw walls as thick rectangles (offset perpendicular to wall direction)
  d.setActiveLayer('WALLS');
  for (const source of floor.walls) for (const span of wallPathSpans(source)) {
    const w = { ...source, start: span.start, end: span.end };
    const dx = w.end.x - w.start.x;
    const dy = w.end.y - w.start.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) continue;

    const half = w.thickness / 2;
    // Perpendicular unit vector
    const nx = -dy / len * half;
    const ny = dx / len * half;

    // Four corners of the wall rectangle (flipping Y)
    const x1 = w.start.x + nx, y1 = -(w.start.y + ny);
    const x2 = w.end.x + nx, y2 = -(w.end.y + ny);
    const x3 = w.end.x - nx, y3 = -(w.end.y - ny);
    const x4 = w.start.x - nx, y4 = -(w.start.y - ny);

    d.drawPolyline([
      [x1, y1],
      [x2, y2],
      [x3, y3],
      [x4, y4],
      [x1, y1],
    ]);
  }

  // Draw dimensions
  d.setActiveLayer('DIMENSIONS');
  for (const w of floor.walls) {
    const { length: len, point: midpoint } = wallPlanDimension(w);
    const mx = midpoint.x;
    const my = -midpoint.y;
    const angle = Math.atan2(-(w.end.y - w.start.y), w.end.x - w.start.x) * (180 / Math.PI);
    d.drawText(mx, my, 5, angle, `${len} cm`, 'center', 'bottom');
  }

  // Draw doors as arcs + lines
  d.setActiveLayer('DOORS');
  for (const door of floor.doors) {
    const wall = floor.walls.find(w => w.id === door.wallId);
    if (!wall) continue;

    const wdx = wall.end.x - wall.start.x;
    const wdy = wall.end.y - wall.start.y;
    const wlen = Math.hypot(wdx, wdy);
    if (wlen === 0) continue;

    // Door hinge position
    const hx = wall.start.x + wdx * door.position;
    const hy = -(wall.start.y + wdy * door.position);

    // Door width as radius
    const r = door.width / 2;

    // Openings and garage doors have no swing arc
    if (door.type === 'opening' || door.type === 'garage') {
      const ux = wdx / wlen, uy = -wdy / wlen; // CAD y is flipped
      if (door.type === 'garage') {
        // Panel line across the opening
        d.drawLine(hx - ux * r, hy - uy * r, hx + ux * r, hy + uy * r);
      } else {
        // Doorway: jamb ticks at each side of the opening
        const nxc = -uy, nyc = ux;
        const jamb = (wall.thickness ?? 10) / 2 + 2;
        for (const sign of [-1, 1]) {
          const jx = hx + ux * r * sign, jy = hy + uy * r * sign;
          d.drawLine(jx + nxc * jamb, jy + nyc * jamb, jx - nxc * jamb, jy - nyc * jamb);
        }
      }
      continue;
    }

    // Wall angle in degrees
    const wallAngle = Math.atan2(-wdy, wdx) * (180 / Math.PI);

    // Draw arc (90 degree swing)
    const startAngle = door.swingDirection === 'left' ? wallAngle : wallAngle - 90;
    const endAngle = door.swingDirection === 'left' ? wallAngle + 90 : wallAngle;
    d.drawArc(hx, hy, r, startAngle, endAngle);

    // Draw door line (the door panel)
    const panelAngle = (door.swingDirection === 'left' ? wallAngle : wallAngle - 90) * Math.PI / 180;
    d.drawLine(hx, hy, hx + Math.cos(panelAngle) * r, hy + Math.sin(panelAngle) * r);
  }

  // Draw windows as parallel lines
  d.setActiveLayer('WINDOWS');
  for (const win of floor.windows) {
    const wall = floor.walls.find(w => w.id === win.wallId);
    if (!wall) continue;

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
    const fw = fi.width ?? (cat ? cat.width : 30);
    const fd = fi.depth ?? (cat ? cat.depth : 30);
    const fx = fi.position.x;
    const fy = -fi.position.y;
    const rot = (fi.rotation || 0) * Math.PI / 180;

    // Compute rotated rectangle corners
    const hw = fw / 2, hd = fd / 2;
    const corners: [number, number][] = [
      [-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]
    ];
    const rotated = corners.map(([cx, cy]) => {
      const rx = cx * Math.cos(rot) - cy * Math.sin(rot);
      const ry = cx * Math.sin(rot) + cy * Math.cos(rot);
      return [fx + rx, fy + ry] as [number, number];
    });
    rotated.push(rotated[0]); // close
    d.drawPolyline(rotated);

    // Label
    if (cat) {
      d.drawText(fx, fy, 4, 0, cat.name, 'center', 'middle');
    }
  }

  const dxfString = d.toDxfString();
  const blob = new Blob([dxfString], { type: 'application/dxf' });
  download(blob, `${project.name || 'floorplan'}.dxf`);
}

export function exportDWG(project: Project) {
  // DWG is a proprietary binary format. No good JS library exists.
  // Export as DXF — virtually all CAD software (AutoCAD, SketchUp, etc.) opens DXF natively.
  const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
  if (!floor || floor.walls.length === 0) return;

  alert('DWG is a proprietary binary format. Exporting as DXF instead — all major CAD tools (AutoCAD, SketchUp, FreeCAD) can open DXF files directly.');
  exportDXF(project);
}
