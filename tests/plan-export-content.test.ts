import { expect, it } from 'vitest';
import { hasPlanExportContent } from '$lib/utils/planExportContent';
import type { Floor } from '$lib/models/types';

it('requires content that the plan exporters can draw', () => {
  const floor = { walls: [], furniture: [], textAnnotations: [], annotations: [], measurements: [] } as unknown as Floor;
  expect(hasPlanExportContent(floor)).toBe(false);
  expect(hasPlanExportContent({ ...floor, textAnnotations: [{ text: '  ' }] } as Floor)).toBe(false);
  expect(hasPlanExportContent({ ...floor, annotations: [{ x1: 0, x2: 0, y1: 0, y2: 0 }] } as Floor)).toBe(false);
  expect(hasPlanExportContent({ ...floor, textAnnotations: [{ text: 'Note' }] } as Floor)).toBe(true);
  expect(hasPlanExportContent({ ...floor, annotations: [{ x1: 0, x2: 10, y1: 0, y2: 0 }] } as Floor)).toBe(true);
  expect(hasPlanExportContent({ ...floor, furniture: [{}] } as Floor)).toBe(true);
  expect(hasPlanExportContent({ ...floor, measurements: [{}] } as Floor)).toBe(true);
});
