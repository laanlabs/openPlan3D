import { beforeEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { exportAsPNG, exportPDF } from '$lib/utils/export';
import { exportNotice, exportPNGWithFeedback, exportPDFWithFeedback } from '$lib/stores/exportNotice';
import { roomProject } from './fixtures/project';
vi.mock('$lib/utils/export', () => ({ exportAsPNG: vi.fn(), exportPDF: vi.fn() }));
beforeEach(() => { vi.mocked(exportPDF).mockReset(); exportNotice.set(null); });
it('reports an unavailable optional 3D view and clears the notice on a complete export', async () => {
 vi.mocked(exportPDF).mockResolvedValue({omitted3D:true}); await exportPDFWithFeedback(roomProject());
 expect(get(exportNotice)?.title).toBe('PDF exported without the 3D view');
 vi.mocked(exportPDF).mockResolvedValue({omitted3D:false}); await exportPDFWithFeedback(roomProject());
 expect(get(exportNotice)).toBeNull();
});
it('contains required export failures and reports empty floors', async () => {
 vi.mocked(exportPDF).mockRejectedValue(new Error('private implementation details'));
 await expect(exportPDFWithFeedback(roomProject())).resolves.toBeUndefined();
 expect(get(exportNotice)?.title).toBe("Couldn't export PDF");
 expect(get(exportNotice)?.message).not.toContain('private');
 vi.mocked(exportPDF).mockResolvedValue(undefined); await exportPDFWithFeedback(roomProject());
 expect(get(exportNotice)?.message).toContain('Add walls');
});

it('reports asynchronous PNG encoding failures and empty floors', async()=>{
 vi.mocked(exportAsPNG).mockRejectedValue(new Error('encoding failed'));
 await exportPNGWithFeedback(roomProject());expect(get(exportNotice)?.title).toBe("Couldn't export 2D PNG");
 vi.mocked(exportAsPNG).mockResolvedValue(false);await exportPNGWithFeedback(roomProject());
 expect(get(exportNotice)?.message).toContain('Add walls');
 vi.mocked(exportAsPNG).mockResolvedValue(true);await exportPNGWithFeedback(roomProject());expect(get(exportNotice)).toBeNull();
});
