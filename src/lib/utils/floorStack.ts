import { Group } from 'three';
import type { Floor } from '$lib/models/types';
import { floorElevations } from './floors';

/** The active floor is already built at zero; move it before adding any other floors. */
export function assembleFloorStack(
  root: Group, floors: Floor[], activeFloorId: string,
  buildOther: (floor: Floor, group: Group, yOffset: number) => void,
): { floor: Floor; yOffset: number }[] {
  const entries = floorElevations(floors).map(({ floor, elevation }) => ({ floor, yOffset: elevation }));
  const active = entries.find(entry => entry.floor.id === activeFloorId);
  if (!active) return [];
  for (const child of root.children) child.position.y += active.yOffset;
  for (const entry of entries) {
    if (entry === active) continue;
    const group = new Group();
    buildOther(entry.floor, group, entry.yOffset);
    for (const child of [...group.children]) root.add(child);
  }
  return entries;
}

/** How "Show All Floors Stacked" draws the floors other than the active one. */
export type StackedFloorsStyle = 'translucent' | 'solid';

/** Opacity of the other floors in the translucent stacked view. */
export const STACKED_FLOOR_OPACITY = 0.35;

/** Material flags for the other floors' walls, slabs and columns. Solid floors leave the
 * transparent pass entirely (no per-frame sorting or blending, so no flicker between
 * overlapping storeys). Translucent floors do not write depth, like the viewer's other
 * transparent surfaces: overlapping translucent walls and slabs then blend, instead of the
 * one drawn first hiding the others in an order that changes as the camera moves. */
export function stackedFloorMaterial(style: StackedFloorsStyle): { transparent: boolean; opacity: number; depthWrite: boolean } {
  return style === 'solid'
    ? { transparent: false, opacity: 1, depthWrite: true }
    : { transparent: true, opacity: STACKED_FLOOR_OPACITY, depthWrite: false };
}

interface PickHit { distance: number; object: { userData: Record<string, unknown> } }

/** True when a solid other floor (meshes flagged `userData.stackedFloor`) lies in front of
 * `distance` along the ray, so a click there must not reach the active floor behind it.
 * Translucent floors never block: the active floor is visible through them. */
export function stackedFloorOccludes(hits: readonly PickHit[], distance: number, style: StackedFloorsStyle): boolean {
  return style === 'solid' && hits.some(hit => hit.object.userData.stackedFloor === true && hit.distance < distance);
}

/** The active-floor wall a 3D click or hover reaches, given raycast hits sorted by distance. */
export function pickedWallId(hits: readonly PickHit[], style: StackedFloorsStyle): string | null {
  const hit = hits.find(entry => typeof entry.object.userData.wallId === 'string');
  if (!hit || stackedFloorOccludes(hits, hit.distance, style)) return null;
  return hit.object.userData.wallId as string;
}
