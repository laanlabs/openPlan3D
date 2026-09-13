import jsPDF from 'jspdf';
import { translate, type Locale } from '$lib/i18n';
import { get } from 'svelte/store';
import type { Project } from '$lib/models/types';
import { projectSettings, formatArea } from '$lib/stores/settings';
import { resolveRooms } from './roomDetection';
import { drawRooms, drawDoorOnWall, drawWindowOnWall, drawFurnitureItem, drawStair, drawColumn, drawAnnotations, drawPersistedMeasurements, drawTextAnnotations, drawEntourageItems } from './canvasRenderer';
import { worldToScreen, type CanvasState } from './canvasInteraction';
import { activePrintFloor, printBounds, calculatePrintLayout, type PrintOptions } from './printLayout';

const PIXELS_PER_MM = 6;

/** Preview and PDF use the same fixed physical page, independent of screen size/DPR. */
export function renderPrintPage(canvas: HTMLCanvasElement, project: Project, options: PrintOptions, language: Locale = 'en') {
  const floor = activePrintFloor(project);
  const bounds = floor && printBounds(floor, project.customEntourage);
  if (!bounds) return null;
  const layout = calculatePrintLayout(bounds, options);
  const { pageWidth, pageHeight, area, center, mmPerCm } = layout;
  canvas.width = Math.round(pageWidth * PIXELS_PER_MM);
  canvas.height = Math.round(pageHeight * PIXELS_PER_MM);
  const ctx = canvas.getContext('2d')!;
  // Separate axes compensate for pixel rounding on Letter pages.
  const px = canvas.width / pageWidth, py = canvas.height / pageHeight;
  ctx.scale(px, py);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, pageWidth, pageHeight);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 5px sans-serif';
  ctx.fillText(project.name || translate(language, 'print.sheetUntitled'), 12, 16, pageWidth - 70);
  ctx.font = '3px sans-serif';
  ctx.fillText(floor.name, 12, 22, pageWidth - 70);
  ctx.textAlign = 'right';
  ctx.fillText(translate(language, 'print.sheetScale', { value: options.scale === 'fit' ? translate(language, 'print.fit') : layout.scaleLabel }), pageWidth - 12, 16);
  ctx.fillText(new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en'), pageWidth - 12, 22);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 0.25;
  ctx.strokeRect(area.x, area.y, area.width, area.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.width, area.height);
  ctx.clip();
  ctx.translate(area.x, area.y);
  ctx.scale(1 / PIXELS_PER_MM, 1 / PIXELS_PER_MM);
  const cs: CanvasState = { ctx, width: area.width * PIXELS_PER_MM, height: area.height * PIXELS_PER_MM, zoom: mmPerCm * PIXELS_PER_MM, camX: center.x, camY: center.y };
  const settings = get(projectSettings);
  drawRooms(cs, floor, resolveRooms(floor), null, true, true, settings);
  ctx.strokeStyle = '#334155';
  ctx.lineCap = 'round';
  for (const wall of floor.walls) {
    const a = worldToScreen(cs, wall.start.x, wall.start.y), b = worldToScreen(cs, wall.end.x, wall.end.y);
    ctx.lineWidth = wall.thickness * cs.zoom;
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    if (wall.curvePoint) {
      const c = worldToScreen(cs, wall.curvePoint.x, wall.curvePoint.y);
      ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
    } else ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const door of floor.doors) { const wall = floor.walls.find(w => w.id === door.wallId); if (wall) drawDoorOnWall(cs, wall, door); }
  for (const win of floor.windows) { const wall = floor.walls.find(w => w.id === win.wallId); if (wall) drawWindowOnWall(cs, wall, win); }
  for (const item of floor.furniture) drawFurnitureItem(cs, item, false);
  for (const item of floor.stairs ?? []) drawStair(cs, item, false);
  for (const item of floor.columns ?? []) drawColumn(cs, item, false);
  drawAnnotations(cs, floor, null, settings);
  drawPersistedMeasurements(cs, floor, null, settings);
  drawTextAnnotations(cs, floor, null, null);
  drawEntourageItems(cs, floor, null, project.customEntourage);
  ctx.restore();
  ctx.textAlign = 'left'; ctx.fillStyle = '#64748b'; ctx.font = '2.5px sans-serif';
  ctx.fillText(translate(language, 'print.sheetFooter'), 12, pageHeight - 7, pageWidth - 24);
  // Calibration line also makes browser/physical print scaling verifiable.
  const barCm = Math.min(100, 10 ** Math.floor(Math.log10(40 / mmPerCm)));
  const barMm = barCm * mmPerCm;
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(12, pageHeight - 15); ctx.lineTo(12 + barMm, pageHeight - 15); ctx.stroke();
  ctx.fillText(`${barCm} cm`, 14 + barMm, pageHeight - 14);
  return layout;
}

export function createPrintPDF(canvas: HTMLCanvasElement, project: Project, options: PrintOptions, language: Locale = 'en') {
  const floor = activePrintFloor(project), bounds = floor && printBounds(floor, project.customEntourage);
  if (!bounds) throw new Error(translate(language, 'print.empty'));
  const layout = calculatePrintLayout(bounds, options);
  if (!layout.fits) throw new Error(translate(language, 'print.pdfOverflow'));
  const pdf = new jsPDF({ unit: 'mm', format: options.pageSize, orientation: options.orientation });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, layout.pageWidth, layout.pageHeight);
  const rooms = resolveRooms(floor);
  let y = layout.pageHeight;
  for (const room of rooms) {
    if (y > layout.pageHeight - 20) {
      pdf.addPage(options.pageSize, options.orientation);
      pdf.setFontSize(14); pdf.text(translate(language, 'print.schedule'), 12, 18); y = 30;
    }
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(room.name, layout.pageWidth - 85) as string[];
    pdf.text(formatArea(room.area, get(projectSettings).units), layout.pageWidth - 12, y, { align: 'right' });
    for (const line of lines) {
      if (y > layout.pageHeight - 15) {
        pdf.addPage(options.pageSize, options.orientation); y = 20;
      }
      pdf.text(line, 12, y);
      y += 5;
    }
    y += 3;
  }
  return pdf;
}
