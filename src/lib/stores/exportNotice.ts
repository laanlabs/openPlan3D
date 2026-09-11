import { writable } from 'svelte/store';
import type { TranslationKey } from '$lib/i18n';
import type { Project } from '$lib/models/types';
import { exportAsPNG, exportPDF } from '$lib/utils/export';

export const exportNotice = writable<{ title: TranslationKey; message: TranslationKey } | null>(null);

/** Both PDF entry points use the same outcome reporting. */
export async function exportPDFWithFeedback(project: Project) {
  exportNotice.set(null);
  try {
    const result = await exportPDF(project);
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
  try {
    if (!await exportAsPNG(null, project)) exportNotice.set({ title: 'exportNotice.pngTitle', message: 'exportNotice.pngEmpty' });
  } catch {
    exportNotice.set({ title: 'exportNotice.pngTitle', message: 'exportNotice.pngFailed' });
  }
}
