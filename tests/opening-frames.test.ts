import { describe, expect, it } from 'vitest';
import { doorFrameBoxes, windowOuterBars } from '$lib/utils/openingFrames';

const edges = (center: number, size: number) => [center - size / 2, center + size / 2];

describe('door frame', () => {
  const left = 100, right = 190, doorHeight = 210, wall = 12;
  const [leftJamb, rightJamb, header] = doorFrameBoxes(left, right, doorHeight, wall);

  it('reaches into the opening and keeps its outer edges', () => {
    const [leftOuter, leftInner] = edges(leftJamb.center, leftJamb.width);
    const [rightInner, rightOuter] = edges(rightJamb.center, rightJamb.width);
    expect(leftOuter).toBeCloseTo(95);
    expect(leftInner).toBeGreaterThan(left);
    expect(rightInner).toBeLessThan(right);
    expect(rightOuter).toBeCloseTo(195);
  });

  it('starts the header below the lintel and covers both jambs', () => {
    expect(header.bottom).toBeLessThan(doorHeight);
    expect(header.bottom + header.height).toBeCloseTo(215);
    expect(edges(header.center, header.width)).toEqual([95, 195]);
  });

  it('stands proud of the baseboard (wall + 2)', () => {
    for (const box of [leftJamb, rightJamb, header]) expect(box.depth).toBeGreaterThan(wall + 2);
  });
});

describe('window outer frame', () => {
  const width = 120, height = 130, bar = 4;
  const [bottom, top, leftBar, rightBar] = windowOuterBars(width, height, bar);

  it('overlaps the opening on all sides and keeps its outer size', () => {
    const [lOuter, lInner] = edges(leftBar.ox, leftBar.w);
    const [rInner, rOuter] = edges(rightBar.ox, rightBar.w);
    const [bOuter, bInner] = edges(bottom.oy, bottom.h);
    const [tInner, tOuter] = edges(top.oy, top.h);
    expect([lOuter, rOuter, bOuter, tOuter]).toEqual([-64, 64, -69, 69]);
    expect(lInner).toBeGreaterThan(-width / 2);
    expect(rInner).toBeLessThan(width / 2);
    expect(bInner).toBeGreaterThan(-height / 2);
    expect(tInner).toBeLessThan(height / 2);
  });
});
