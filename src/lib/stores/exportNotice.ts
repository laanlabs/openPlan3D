import { writable } from 'svelte/store';
import type { Locale, TranslationKey } from '$lib/i18n';
import type { Project } from '$lib/models/types';
import { exportAsPNG, exportAsSVG, exportPDF } from '$lib/utils/export';
import { exportDWG, exportDXF } from '$lib/utils/cadExport';
import { interchangeFileName, projectToPreparedRoomPlan, sortedJson } from '$lib/utils/interchange';
import { TransferLinkError, siblingImportUrl, type SiblingPlannerId } from '$lib/utils/transferLink';
import { planContentHidden } from '$lib/utils/exportVisibility';
import { currentPlanExportVisibility } from './planVisibility';

/** The published user guide, linked from the editor, its shortcuts dialog and the library. */
export const USER_GUIDE_URL = 'https://github.com/laanlabs/openPlan3D/blob/main/docs/user-guide.md';

export const exportNotice = writable<{ title: TranslationKey; message: TranslationKey } | null>(null);

/** Plan exports follow the 2D view's layers; a floor whose every item is hidden gets this notice instead of an empty file. */
function noticeHiddenContent(project: Project, title: TranslationKey): boolean {
  const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
  if (!planContentHidden(floor, currentPlanExportVisibility())) return false;
  exportNotice.set({ title, message: 'exportNotice.allHidden' });
  return true;
}

/** Both PDF entry points use the same outcome reporting; the sheet's labels follow `language`. */
export async function exportPDFWithFeedback(project: Project, language: Locale = 'en') {
  exportNotice.set(null);
  if (noticeHiddenContent(project, 'exportNotice.pdfTitle')) return;
  try {
    const result = await exportPDF(project, language);
    if (!result) {
      exportNotice.set({ title: 'exportNotice.pdfTitle', message: 'exportNotice.pdfEmpty' });
    } else if (result.omitted3D) {
      exportNotice.set({ title: 'exportNotice.pdfPartial', message: 'exportNotice.pdfPartialHelp' });
    }
  } catch {
    exportNotice.set({ title: 'exportNotice.pdfTitle', message: 'exportNotice.pdfFailed' });
  }
}

export async function exportPNGWithFeedback(project: Project) {
  exportNotice.set(null);
  if (noticeHiddenContent(project, 'exportNotice.pngTitle')) return;
  try {
    if (!await exportAsPNG(null, project)) exportNotice.set({ title: 'exportNotice.pngTitle', message: 'exportNotice.pngEmpty' });
  } catch {
    exportNotice.set({ title: 'exportNotice.pngTitle', message: 'exportNotice.pngFailed' });
  }
}

/** Like PNG and PDF, the vector and CAD exports explain an empty floor or a failure instead of doing nothing; labels follow `language`. */
export function exportSVGWithFeedback(project: Project, language: Locale = 'en') {
  exportNotice.set(null);
  if (noticeHiddenContent(project, 'exportNotice.svgTitle')) return;
  try {
    if (!exportAsSVG(project, language)) exportNotice.set({ title: 'exportNotice.svgTitle', message: 'exportNotice.svgEmpty' });
  } catch {
    exportNotice.set({ title: 'exportNotice.svgTitle', message: 'exportNotice.svgFailed' });
  }
}

/** CAD exports also say when the floor's only content is entourage they cannot draw, rather than asking for content. */
export function exportDXFWithFeedback(project: Project, language: Locale = 'en') {
  exportNotice.set(null);
  if (noticeHiddenContent(project, 'exportNotice.dxfTitle')) return;
  try {
    const result = exportDXF(project, language);
    if (result !== true) exportNotice.set({ title: 'exportNotice.dxfTitle', message: result === 'unsupported' ? 'exportNotice.dxfUnsupported' : 'exportNotice.dxfEmpty' });
  } catch {
    exportNotice.set({ title: 'exportNotice.dxfTitle', message: 'exportNotice.dxfFailed' });
  }
}

/** There is no DWG writer: the DXF downloads and the notice says so instead of a blocking alert. */
export function exportDWGWithFeedback(project: Project, language: Locale = 'en') {
  exportNotice.set(null);
  if (noticeHiddenContent(project, 'exportNotice.dwgErrorTitle')) return;
  try {
    const result = exportDWG(project, language);
    exportNotice.set(result === true
      ? { title: 'exportNotice.dwgTitle', message: 'exportNotice.dwgFallback' }
      : { title: 'exportNotice.dwgErrorTitle', message: result === 'unsupported' ? 'exportNotice.dwgUnsupported' : 'exportNotice.dwgEmpty' });
  } catch {
    exportNotice.set({ title: 'exportNotice.dwgErrorTitle', message: 'exportNotice.dwgFailed' });
  }
}

/** Save the plan as prepared RoomPlan JSON, the file the sibling planners and the iPhone app import. */
export function downloadInterchangeJson(project: Project) {
  const blob = new Blob([sortedJson(projectToPreparedRoomPlan(project), 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url; link.download = interchangeFileName(project); link.click();
  } finally { URL.revokeObjectURL(url); }
}

/** What openInSiblingPlanner needs from the tab it opens; `window.open`'s result satisfies it. */
export type PlannerTab = { opener: unknown; location: { replace(url: string): void }; close(): void } | null;

/**
 * Open the plan in a sibling planner. The tab opens synchronously, while the click is still
 * trusted, and gets the transfer link once it is built (deflate is asynchronous); a plan too
 * large for a link is downloaded as interchange JSON instead. Resolves true when the planner
 * was opened; every failure is reported through exportNotice.
 */
export async function openInSiblingPlanner(project: Project, id: SiblingPlannerId,
  open: (url: string, target: string) => PlannerTab = (url, target) => window.open(url, target),
  download: (project: Project) => void = downloadInterchangeJson): Promise<boolean> {
  exportNotice.set(null);
  const tab = open('about:blank', '_blank');
  if (!tab) { exportNotice.set({ title: 'exportNotice.linkTitle', message: 'exportNotice.linkBlocked' }); return false; }
  try {
    const url = await siblingImportUrl(id, projectToPreparedRoomPlan(project, { forLink: true }));
    tab.opener = null;
    tab.location.replace(url);
    return true;
  } catch (error) {
    tab.close();
    const reason = error instanceof TransferLinkError ? error.reason : null;
    if (reason === 'too-large') download(project);
    exportNotice.set({ title: 'exportNotice.linkTitle', message: reason === 'too-large' ? 'exportNotice.linkTooLarge' : reason === 'unsupported' ? 'exportNotice.linkUnsupported' : 'exportNotice.linkFailed' });
    return false;
  }
}
