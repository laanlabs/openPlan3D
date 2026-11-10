import type { Floor, Stair } from '$lib/models/types';
import { floorElevations } from './floors';

/** Rise used when there is no neighbouring floor to reach (the 3D viewer's historic height). */
export const DEFAULT_STAIR_RISE = 260;

export interface StairRises { up: number; down: number }

/** Floor-to-floor rises from one floor's surface, in cm. An up stair climbs to the next floor's
 * surface; a down stair descends to the floor below. Missing or non-ascending neighbours fall back
 * to the default rise, so single-floor plans keep their existing stairs. */
export function stairRises(floors: Floor[], floorId: string): StairRises {
  const entries = floorElevations(floors);
  const index = entries.findIndex(entry => entry.floor.id === floorId);
  if (index < 0) return { up: DEFAULT_STAIR_RISE, down: DEFAULT_STAIR_RISE };
  const here = entries[index].elevation;
  const gap = (other: number | undefined) => other !== undefined && other > 0 ? other : DEFAULT_STAIR_RISE;
  return {
    up: gap(entries[index + 1] && entries[index + 1].elevation - here),
    down: gap(entries[index - 1] && here - entries[index - 1].elevation),
  };
}

/** Vertical extent relative to the stair's own floor surface. Direction does not change the
 * stair's shape, as on the plan: an up stair starts at its floor, a down stair ends at it. */
export function stairSpan(stair: Pick<Stair, 'direction'>, rises: StairRises): { base: number; rise: number } {
  return stair.direction === 'down' ? { base: -rises.down, rise: rises.down } : { base: 0, rise: rises.up };
}

/** The floor directly below, by elevation. */
export function floorBelow(floors: Floor[], floorId: string): Floor | undefined {
  const entries = floorElevations(floors);
  const index = entries.findIndex(entry => entry.floor.id === floorId);
  return index > 0 ? entries[index - 1].floor : undefined;
}
