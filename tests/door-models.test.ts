import { describe, expect, it } from 'vitest';
import type { Door, Point, Wall } from '$lib/models/types';
import { doorSymbol } from '$lib/utils/doorSymbol';
import { colorInputValue, doorFrameColor, doorOpeningSide, isDoorFrameColor, pocketDoorTravel, swingLeaves } from '$lib/utils/doorStyle';
import { pathOpening, wallPathProfile } from '$lib/utils/wallProfiles';
import { readProject } from '$lib/utils/projectValidation';
import { roomProject } from './fixtures/project';

const wallFrom = (start: Point, end: Point, extra: Partial<Wall> = {}) => ({ id: 'w', start, end, thickness: 15, height: 260, ...extra }) as Wall;
const door = (fields: Partial<Door>) => ({ id: 'd', wallId: 'w', position: 0.5, width: 150, height: 210, type: 'double', swingDirection: 'left', flipSide: false, ...fields }) as Door;
// Which face of the wall a vector points to: +1 along the wall's left-hand normal (-dy, dx).
const face = (wall: Wall, v: Point) => {
  const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y;
  return Math.sign(-dy * v.x + dx * v.y);
};

describe('3D swing leaves follow the plan symbol', () => {
  // An angled wall so the check does not rely on axis-aligned coordinates
  const wall = wallFrom({ x: 40, y: -30 }, { x: 340, y: 170 });
  const at = (t: number) => ({ x: wall.start.x + (wall.end.x - wall.start.x) * t, y: wall.start.y + (wall.end.y - wall.start.y) * t });
  for (const type of ['single', 'double'] as const) for (const swingDirection of ['left', 'right'] as const) for (const flipSide of [false, true]) {
    it(`${type} door, hinge ${swingDirection}, ${flipSide ? 'flipped' : 'unflipped'}`, () => {
      const d = door({ type, swingDirection, flipSide, width: type === 'double' ? 150 : 90 });
      const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
      const left = at(0.5 - d.width / 2 / length), right = at(0.5 + d.width / 2 / length);
      const plan = doorSymbol(wall, d).filter(part => part.role === 'leaf').map(part => {
        const [hinge, free] = (part as { points: Point[] }).points;
        return { hinge, side: face(wall, { x: free.x - hinge.x, y: free.y - hinge.y }) };
      });
      const model = swingLeaves(left, right, d).map(leaf => ({ hinge: leaf.hinge, side: face(wall, { x: Math.cos(leaf.pose.yaw), y: Math.sin(leaf.pose.yaw) }), pose: leaf.pose }));
      expect(model).toHaveLength(plan.length);
      for (const leaf of model) {
        const match = plan.find(p => Math.hypot(p.hinge.x - leaf.hinge.x, p.hinge.y - leaf.hinge.y) < 1e-6);
        expect(match, 'a 3D hinge on a plan hinge').toBeDefined();
        expect(leaf.side).toBe(match!.side);
        expect(leaf.side).toBe(doorOpeningSide(d));
        // The leaf pivots at its hinge, set 2 cm toward the opening face
        expect(Math.hypot(leaf.pose.x - leaf.hinge.x, leaf.pose.z - leaf.hinge.y)).toBeCloseTo(2);
        expect(face(wall, { x: leaf.pose.x - leaf.hinge.x, y: leaf.pose.z - leaf.hinge.y })).toBe(leaf.side);
      }
    });
  }

  it('French door hinges sit on the face its plan arcs swing to', () => {
    for (const swingDirection of ['left', 'right'] as const) for (const flipSide of [false, true]) {
      const d = door({ type: 'french', swingDirection, flipSide, width: 140 });
      const sides = doorSymbol(wall, d).filter(part => part.role === 'leaf').map(part => {
        const [hinge, free] = (part as { points: Point[] }).points;
        return face(wall, { x: free.x - hinge.x, y: free.y - hinge.y });
      });
      expect(sides).toEqual([doorOpeningSide(d), doorOpeningSide(d)]);
    }
  });

  it('double door leaves split the opening at its middle', () => {
    const leaves = swingLeaves({ x: 0, y: 0 }, { x: 150, y: 0 }, door({ swingDirection: 'right' }));
    expect(leaves.map(l => [l.hinge.x, l.width])).toEqual([[0, 75], [150, 75]]);
  });
});

describe('pocket door travel', () => {
  const straight = [{ start: { x: -200, y: 0 }, end: { x: 200, y: 0 } }];
  const travel = (available: number) => pocketDoorTravel(80, available, { x: 40, y: 0 }, { x: 1, y: 0 }, straight, 5.5);

  it('slides half the door into a long enough wall', () => { expect(travel(160)).toBe(40); });
  it('stops at the end of the wall', () => {
    expect(travel(20)).toBe(20);
    expect(travel(0)).toBe(0);
    expect(travel(-5)).toBe(0);
  });

  it('keeps the hidden part inside a curved wall', () => {
    const wall = wallFrom({ x: -200, y: 0 }, { x: 200, y: 0 }, { curvePoint: { x: 0, y: 300 } });
    const path = wallPathProfile(wall), opening = pathOpening(path, path.distanceAt(0.5), 80, 0, 210)!;
    const left = path.sample(opening.left).point, right = path.sample(opening.right).point;
    const width = Math.hypot(right.x - left.x, right.y - left.y);
    const direction = { x: (right.x - left.x) / width, y: (right.y - left.y) / width };
    const hidden = pocketDoorTravel(width, path.length - opening.right, right, direction, path.spans, 5.5);
    expect(hidden).toBeGreaterThan(0);
    expect(hidden).toBeLessThan(width / 2);
    // Every point of the hidden slab stays within the allowed offset of the faceted centreline
    for (let d = 0; d <= hidden; d += 0.25) {
      const p = { x: right.x + direction.x * d, y: right.y + direction.y * d };
      let nearest = Infinity;
      for (let s = opening.right; s <= opening.right + 60; s += 0.05) {
        const q = path.sample(s).point; nearest = Math.min(nearest, Math.hypot(p.x - q.x, p.y - q.y));
      }
      expect(nearest).toBeLessThanOrEqual(5.5 + 0.01);
    }
  });
});

describe('door frame colour', () => {
  const withColor = (frameColor: unknown) => {
    const project: any = roomProject(), floor = project.floors[0];
    floor.doors = [{ id: 'd', wallId: floor.walls[0].id, position: 0.5, width: 90, height: 210, type: 'single', swingDirection: 'left', flipSide: false, frameColor }];
    return project;
  };

  it('accepts short and long hex colours', () => {
    for (const color of ['#abc', '#3B3F46', '#a1b2c3']) expect(readProject(withColor(color)).floors[0].doors[0].frameColor).toBe(color);
  });
  it('treats an empty colour as unset', () => {
    const loaded = readProject(withColor('')).floors[0].doors[0];
    expect('frameColor' in loaded).toBe(false);
    expect(doorFrameColor({ type: 'single', frameColor: '' })).toBe('#6B4423');
  });
  it('rejects anything else', () => {
    for (const color of ['red', 'not-a-colour', '#abcd', '#12345g', 'rgb(1,2,3)', 123, null]) {
      expect(() => readProject(withColor(color)), String(color)).toThrow(/frameColor has an unsupported value/);
    }
    expect(isDoorFrameColor('#ABC')).toBe(true);
    expect(isDoorFrameColor(' #abc')).toBe(false);
  });
  it('widens the short form for the colour picker', () => {
    expect(colorInputValue('#aBc')).toBe('#aaBBcc');
    expect(colorInputValue('#3b3f46')).toBe('#3b3f46');
  });
});
