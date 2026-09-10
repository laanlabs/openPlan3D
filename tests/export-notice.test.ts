import { beforeEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { exportPDF } from '$lib/utils/export';
import { exportNotice, exportPDFWithFeedback } from '$lib/stores/exportNotice';
import { roomProject } from './fixtures/project';
vi.mock('$lib/utils/export', () => ({ exportPDF: vi.fn() }));
beforeEach(() => { vi.mocked(exportPDF).mockReset(); exportNotice.set(null); });
it('reports an unavailable optional 3D view and clears the notice on a complete export', () => {
 vi.mocked(exportPDF).mockReturnValue({omitted3D:true}); exportPDFWithFeedback(roomProject());
 expect(get(exportNotice)?.title).toBe('PDF exported without the 3D view');
 vi.mocked(exportPDF).mockReturnValue({omitted3D:false}); exportPDFWithFeedback(roomProject());
 expect(get(exportNotice)).toBeNull();
});
it('contains required export failures and reports empty floors', () => {
 vi.mocked(exportPDF).mockImplementation(()=>{throw new Error('private implementation details');});
 expect(()=>exportPDFWithFeedback(roomProject())).not.toThrow();
 expect(get(exportNotice)?.title).toBe("Couldn't export PDF");
 expect(get(exportNotice)?.message).not.toContain('private');
 vi.mocked(exportPDF).mockReturnValue(undefined); exportPDFWithFeedback(roomProject());
 expect(get(exportNotice)?.message).toContain('Add walls');
});
