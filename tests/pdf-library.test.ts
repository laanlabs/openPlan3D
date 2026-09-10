import { expect, it, vi } from 'vitest';
import { exportPDF } from '$lib/utils/export';
import { roomProject } from './fixtures/project';

const result = vi.hoisted(() => ({ filename: '', pdf: '' }));
vi.mock('jspdf', async importOriginal => {
  const actual = await importOriginal<typeof import('jspdf')>();
  return {
    default: class {
      constructor(options: ConstructorParameters<typeof actual.default>[0]) {
        const pdf = new actual.default(options);
        // Exercise the real PDF/image encoder, intercepting only the file download.
        vi.spyOn(pdf, 'save').mockImplementation((filename = '') => {
          result.filename = filename;
          result.pdf = pdf.output();
          return pdf;
        });
        return pdf;
      }
    },
  };
});

it('generates a real PDF with the plan image and room schedule using the installed jsPDF', () => {
  const context = new Proxy({ measureText: () => ({ width: 30 }) }, {
    get: (target, key) => target[key as keyof typeof target] ?? (() => {}),
  });
  // Valid 1px PNG stands in for browser rasterization; jsPDF still decodes/embeds it.
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
  vi.stubGlobal('document', {
    createElement: () => ({ width: 1, height: 1, getContext: () => context, toDataURL: () => png }),
    querySelectorAll: () => [],
    querySelector: () => null,
  });

  exportPDF(roomProject());

  expect(result.filename).toBe('Regression plan.pdf');
  expect(result.pdf).toMatch(/^%PDF-1\.[0-9]/);
  expect(result.pdf).toContain('/Count 2');
  expect(result.pdf).toContain('/Subtype /Image');
  expect(result.pdf).toContain('(Regression plan)');
  expect(result.pdf).toContain('(Room Schedule)');
  expect(result.pdf).toContain('%%EOF');
});
