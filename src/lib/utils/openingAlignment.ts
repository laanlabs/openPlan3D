import type { Wall, Door, Window as PlanWindow } from '$lib/models/types';
import { openingPlanBounds } from './openingPlanBounds';

/** Fit a rendered edge/center along its host, including changing curved-wall tangents. */
export function openingAlignmentPosition(wall: Wall, opening: Door | PlanWindow, kind: 'door' | 'window', value: (bounds: ReturnType<typeof openingPlanBounds>) => number, target: number): number {
  const error = (position: number) => Math.abs(value(openingPlanBounds(wall,{...opening,position},kind))-target);
  let best = opening.position, bestError = error(best);
  function consider(position: number) {
    const e = error(position);
    if (e < bestError-1e-7 || (Math.abs(e-bestError) <= 1e-7 && Math.abs(position-opening.position) < Math.abs(best-opening.position))) {
      best=position; bestError=e;
    }
  }
  // Search each small interval so either branch of a curved host can be chosen.
  // Ties keep the nearest position; unreachable targets minimize the remaining error.
  for (let i=0;i<64;i++) {
    let a=.1+.8*i/64, b=.1+.8*(i+1)/64;
    consider(a); consider(b);
    for (let j=0;j<40;j++) {
      const left=a+(b-a)/3, right=b-(b-a)/3;
      if (error(left) < error(right)) b=right; else a=left;
    }
    consider((a+b)/2);
  }
  return best;
}
