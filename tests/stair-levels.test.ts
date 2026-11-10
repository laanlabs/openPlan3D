import { expect, it } from 'vitest';
import { DEFAULT_STAIR_RISE, stairRises, stairSpan } from '$lib/utils/stairLevels';
import { sceneSignature } from '$lib/utils/sceneSignature';
import { createDefaultFloor, createDefaultProject } from '$lib/stores/project';
import type { Stair } from '$lib/models/types';

const stair = (direction: Stair['direction']): Stair => ({ id: `s-${direction}`, position: { x: 0, y: 0 }, rotation: 0,
  width: 100, depth: 300, riserCount: 14, direction, stairType: 'straight' });

function floors(...elevations: (number | undefined)[]) {
  return elevations.map((elevation, level) => Object.assign(createDefaultFloor(level), elevation === undefined ? {} : { elevation }));
}

it('climbs to the next floor and descends to the floor below, using saved elevations', () => {
  const plan = floors(-280, 0, 315, 640);
  expect(stairRises(plan, plan[1].id)).toEqual({ up: 315, down: 280 });
  expect(stairSpan(stair('up'), stairRises(plan, plan[1].id))).toEqual({ base: 0, rise: 315 });
  expect(stairSpan(stair('down'), stairRises(plan, plan[1].id))).toEqual({ base: -280, rise: 280 });
  // An up stair on one floor and the down stair it meets on the next floor share one span.
  const lower = stairSpan(stair('up'), stairRises(plan, plan[2].id));
  const upper = stairSpan(stair('down'), stairRises(plan, plan[3].id));
  expect([315 + lower.base, 315 + lower.base + lower.rise]).toEqual([315, 640]);
  expect([640 + upper.base, 640 + upper.base + upper.rise]).toEqual([315, 640]);
});

it('uses level order and legacy level spacing rather than array order', () => {
  const plan = floors(undefined, undefined, undefined);
  expect(stairRises([...plan].reverse(), plan[1].id)).toEqual({ up: 300, down: 300 });
});

it('keeps the default rise without a neighbouring floor or with a non-ascending gap', () => {
  const single = floors(0);
  expect(stairRises(single, single[0].id)).toEqual({ up: DEFAULT_STAIR_RISE, down: DEFAULT_STAIR_RISE });
  expect(stairSpan(stair('down'), stairRises(single, single[0].id))).toEqual({ base: -DEFAULT_STAIR_RISE, rise: DEFAULT_STAIR_RISE });
  const flat = floors(0, 0);
  expect(stairRises(flat, flat[0].id).up).toBe(DEFAULT_STAIR_RISE);
  expect(stairRises(flat, 'missing')).toEqual({ up: DEFAULT_STAIR_RISE, down: DEFAULT_STAIR_RISE });
});

it('rebuilds the active floor when a neighbouring elevation changes the height of its stairs', () => {
  const project = createDefaultProject();
  project.floors = floors(0, 300);
  const signature = () => sceneSignature(project, project.floors[0], false, 'metric');
  const before = signature();
  project.floors[1].elevation = 320;
  expect(signature()).toBe(before); // no stairs, no dependency on the other floor
  project.floors[0].stairs.push(stair('up'));
  const withStair = signature();
  project.floors[1].elevation = 340;
  expect(signature()).not.toBe(withStair);
});
