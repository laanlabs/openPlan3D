import { describe, expect, it } from 'vitest';
import type { Wall } from '$lib/models/types';
import { doorFrameBoxes, windowOuterBars, type FrameBox } from '$lib/utils/openingFrames';
import { pathOpening, wallPathProfile } from '$lib/utils/wallProfiles';

// A straight 400 cm wall, 280 cm tall: the viewer clips openings and frame members to it.
const path = wallPathProfile({ id: 'w', start: { x: 0, y: 0 }, end: { x: 400, y: 0 }, thickness: 12,
  height: 280, startHeight: 280, endHeight: 280, color: '#444444' } as Wall);
const opening = (center: number, width: number, bottom: number, height: number) => pathOpening(path, center, width, bottom, height)!;
const along = (box: FrameBox) => [box.center - box.width / 2, box.center + box.width / 2];
const up = (box: FrameBox) => [box.bottom, box.bottom + box.height];
/** What the viewer draws of a box: addOpeningFrame clips it to the wall the same way. */
const drawn = (box: FrameBox) => pathOpening(path, box.center, box.width, box.bottom, box.height);

describe('door frame', () => {
  it('reaches 0.5 cm into the opening and keeps its outer edges', () => {
    const boxes = doorFrameBoxes(path, opening(145, 90, 0, 210), 12);
    expect(boxes.map(along)).toEqual([[95, 100.5], [189.5, 195], [95, 195]]);
    expect(boxes.map(up)).toEqual([[0, 210], [0, 210], [209.5, 215]]);
    for (const box of boxes) expect(box.depth).toBe(15); // wall + 3: proud of the baseboard (wall + 2)
  });

  it('leaves out the jamb a wall end clips away instead of drawing a 0.5 cm fin', () => {
    // positionOnWall keeps a door's centre at 10% of the wall or more: 40 cm here, so a 90 cm
    // door runs to the wall end.
    const boxes = doorFrameBoxes(path, opening(40, 90, 0, 210), 12);
    expect(boxes.map(along)).toEqual([[84.5, 90], [-5, 90]]); // right jamb, header
    for (const box of boxes) expect(drawn(box)).not.toBeNull();
  });

  it('keeps a jamb the wall end only partly clips, overlap included', () => {
    const [jamb] = doorFrameBoxes(path, opening(47, 90, 0, 210), 12);
    expect(along(jamb)).toEqual([-3, 2.5]);
    expect(drawn(jamb)).toMatchObject({ left: 0, right: 2.5 });
  });

  it('leaves out the header of a door that reaches the wall top instead of drawing a lid', () => {
    const boxes = doorFrameBoxes(path, opening(145, 90, 0, 300), 12);
    expect(boxes.map(up)).toEqual([[0, 280], [0, 280]]);
  });
});

describe('window outer frame', () => {
  const bars = (center: number, width: number, sill: number, height: number) => windowOuterBars(path, opening(center, width, sill, height), 4);

  it('overlaps the opening on all sides and keeps its outer size', () => {
    const [bottom, top, left, right] = bars(160, 120, 90, 130);
    expect([along(bottom), up(bottom)]).toEqual([[96, 224], [86, 90.5]]);
    expect([along(top), up(top)]).toEqual([[96, 224], [219.5, 224]]);
    expect([along(left), up(left)]).toEqual([[96, 100.5], [90, 220]]);
    expect([along(right), up(right)]).toEqual([[219.5, 224], [90, 220]]);
  });

  it('draws no threshold under a window with its sill at the floor', () => {
    expect(bars(160, 120, 0, 130).map(up)).toEqual([[129.5, 134], [0, 130], [0, 130]]); // top, left, right
  });

  it('draws no strip along the wall top or a wall end the window reaches', () => {
    expect(bars(160, 120, 150, 200).map(up)).toEqual([[146, 150.5], [150, 280], [150, 280]]); // bottom, left, right
    const flush = bars(60, 120, 90, 130);
    expect(flush.map(along)).toEqual([[-4, 124], [-4, 124], [119.5, 124]]); // bottom, top, right
    for (const box of flush) expect(drawn(box)).not.toBeNull();
  });
});
