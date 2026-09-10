import { writable } from 'svelte/store';
import type { Project } from '$lib/models/types';
import { exportAsPNG, exportPDF } from '$lib/utils/export';

export const exportNotice = writable<{ title: string; message: string } | null>(null);

/** Both PDF entry points use the same outcome reporting. */
export function exportPDFWithFeedback(project: Project) {
  exportNotice.set(null);
  try {
    const result = exportPDF(project);
    if (!result) {
      exportNotice.set({ title: "Couldn't export PDF", message: 'Add walls, furniture, notes or measurements to the active floor before exporting a PDF.' });
    } else if (result.omitted3D) {
      exportNotice.set({ title: 'PDF exported without the 3D view', message: 'The floor plan was exported. Reopen the 3D view and try again to include it.' });
    }
  } catch {
    exportNotice.set({ title: "Couldn't export PDF", message: 'The PDF could not be prepared. Try again, or export JSON to keep a copy of your plan.' });
  }
}

export async function exportPNGWithFeedback(project: Project) {
  exportNotice.set(null);
  try {
    if (!await exportAsPNG(null, project)) exportNotice.set({ title: "Couldn't export 2D PNG", message: 'Add walls, furniture, notes or measurements to the active floor before exporting a PNG.' });
  } catch {
    exportNotice.set({ title: "Couldn't export 2D PNG", message: 'The PNG could not be prepared. Try again, or export JSON to keep a copy of your plan.' });
  }
}
