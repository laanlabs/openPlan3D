import { describe, expect, it } from 'vitest';
import { dimensionAnchor, dimensionOffsetAt, lineEndAt, lineToolbarAnchor, moveLineEnd, translateLine } from '$lib/utils/dimensionEditing';
import { hitTestAnnotation } from '$lib/utils/hitTesting';
import { createDefaultFloor } from '$lib/stores/project';

const line = { x1: 100, y1: 200, x2: 300, y2: 200 };

describe('measurement and dimension editing', () => {
  it('finds the end under the pointer, and the nearer one on a short line', () => {
    expect(lineEndAt({ x: 104, y: 197 }, line, 8)).toBe('start');
    expect(lineEndAt({ x: 296, y: 203 }, line, 8)).toBe('end');
    expect(lineEndAt({ x: 200, y: 200 }, line, 8)).toBeNull();
    expect(lineEndAt({ x: 104, y: 200 }, { x1: 100, y1: 200, x2: 106, y2: 200 }, 8)).toBe('end');
  });

  it('moves one end and refuses to collapse the line', () => {
    expect(moveLineEnd(line, 'end', { x: 400, y: 250 })).toEqual({ x1: 100, y1: 200, x2: 400, y2: 250 });
    expect(moveLineEnd(line, 'start', { x: 50, y: 200 })).toEqual({ x1: 50, y1: 200, x2: 300, y2: 200 });
    expect(moveLineEnd(line, 'end', { x: 100, y: 200 })).toBeNull();
  });

  it('moves the whole line', () => {
    expect(translateLine(line, { x: 25, y: -50 })).toEqual({ x1: 125, y1: 150, x2: 325, y2: 150 });
  });

  it('reads a dimension offset on the side the line is drawn', () => {
    // A left-to-right dimension draws a positive offset below the measured points (y grows downward).
    expect(dimensionOffsetAt(line, { x: 180, y: 260 })).toBeCloseTo(60);
    expect(dimensionOffsetAt(line, { x: 180, y: 170 })).toBeCloseTo(-30);
    expect(dimensionOffsetAt({ x1: 0, y1: 0, x2: 0, y2: 100 }, { x: -40, y: 50 })).toBeCloseTo(40);
    expect(dimensionOffsetAt({ x1: 5, y1: 5, x2: 5, y2: 5 }, { x: 9, y: 9 })).toBe(0);
  });

  it('anchors the toolbar on the drawn line, where a click selects the dimension', () => {
    expect(lineToolbarAnchor(line)).toEqual({ x: 200, y: 200 });
    const dimension = { id: 'd', ...line, offset: 60 };
    const anchor = dimensionAnchor(dimension);
    expect(anchor).toEqual({ x: 200, y: 260 });
    const floor = createDefaultFloor(0);
    floor.annotations = [dimension];
    expect(hitTestAnnotation(anchor, floor, 1)).toBe('d');
    // The offset read back from the anchor is the stored one.
    expect(dimensionOffsetAt(dimension, anchor)).toBeCloseTo(60);
  });
});
