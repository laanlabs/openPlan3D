import type { Door, Point, Wall } from '$lib/models/types';
import { doorPanelPose } from './wallProfiles';

/** Glazed door types get metal-framed glass leaves in 3D. */
export function isGlazedDoor(type: Door['type']): boolean {
  return type === 'sliding' || type === 'french' || type === 'bifold';
}

/** Frame colour used when a door has no `frameColor`: aluminium for glazed doors, wood otherwise. */
export function defaultDoorFrameColor(type: Door['type']): string {
  return isGlazedDoor(type) ? '#B4B9BE' : '#6B4423';
}

/** `#rgb` or `#rrggbb`: the presets and what `<input type="color">` produces. */
export function isDoorFrameColor(value: unknown): value is string {
  return typeof value === 'string' && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value);
}

/** The door's frame colour; an empty or malformed value counts as unset. */
export function doorFrameColor(door: Pick<Door, 'type' | 'frameColor'>): string {
  return isDoorFrameColor(door.frameColor) ? door.frameColor : defaultDoorFrameColor(door.type);
}

/** `#rrggbb` for `<input type="color">`, which does not accept the short form. */
export function colorInputValue(color: string): string {
  return /^#[\da-f]{3}$/i.test(color) ? `#${[...color.slice(1)].map(c => c + c).join('')}` : color;
}

/** Which face of the wall a door's leaves open toward, as the plan symbol draws it:
 * +1 is the wall's left-hand normal (-dy, dx), -1 the other face. Single doors follow
 * the opening side alone; the double and French arcs also turn over with the hinge side. */
export function doorOpeningSide(door: Pick<Door, 'type' | 'swingDirection' | 'flipSide'>): 1 | -1 {
  const side = door.flipSide ? -1 : 1;
  return (door.type === 'double' || door.type === 'french') && door.swingDirection === 'right' ? (-side as -1 | 1) : side;
}

export interface SwingLeaf { hinge: Point; width: number; pose: { x: number; z: number; yaw: number } }

/** Hinged wooden leaves across the opening chord `left`→`right`, ajar toward the face
 * `doorOpeningSide` picks. A single door has one leaf on the saved hinge; a double door
 * two half-width leaves hinged at opposite jambs, matching the plan symbol's arcs. */
export function swingLeaves(left: Point, right: Point, door: Pick<Door, 'type' | 'swingDirection' | 'flipSide'>): SwingLeaf[] {
  const flipSide = doorOpeningSide(door) === -1;
  const mid = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  // A 'right' swing puts the hinge at the leaf's start; 'left' puts it at the end.
  const spans: [Point, Point, Door['swingDirection']][] = door.type === 'double'
    ? [[left, mid, 'right'], [mid, right, 'left']]
    : [[left, right, door.swingDirection]];
  return spans.map(([start, end, swingDirection]) => {
    const width = Math.hypot(end.x - start.x, end.y - start.y);
    const pose = doorPanelPose({ start, end } as Wall, { width, position: 0.5, swingDirection, flipSide } as Door);
    return { hinge: swingDirection === 'left' ? end : start, width, pose };
  });
}

/** How far a pocket door's slab may slide past the jamb into its cavity: at most half
 * the door, no further than the wall runs (`available`), and, on a curved wall, only
 * while the straight slab stays within `maxOffset` of the wall's centreline. The slab
 * leaves the jamb at `edge`, heading along the unit vector `direction`. */
export function pocketDoorTravel(width: number, available: number, edge: Point, direction: Point, centreline: { start: Point; end: Point }[], maxOffset: number): number {
  const limit = Math.max(0, Math.min(width / 2, available));
  const offset = (p: Point) => Math.min(...centreline.map(({ start, end }) => {
    const dx = end.x - start.x, dy = end.y - start.y, length2 = dx * dx + dy * dy;
    const t = length2 > 0 ? Math.max(0, Math.min(1, ((p.x - start.x) * dx + (p.y - start.y) * dy) / length2)) : 0;
    return Math.hypot(p.x - start.x - dx * t, p.y - start.y - dy * t);
  }));
  let fits = 0;
  for (let d = Math.min(0.5, limit); ; d = Math.min(d + 0.5, limit)) {
    if (offset({ x: edge.x + direction.x * d, y: edge.y + direction.y * d }) > maxOffset) return fits;
    fits = d;
    if (d >= limit) return fits;
  }
}

/** Swatches offered for door frames in the properties panel; `key` names a `doorFrameColor.*` label. */
export const DOOR_FRAME_PRESETS = [
  { key: 'AnthraciteGrey', color: '#3B3F46' },
  { key: 'Black', color: '#1A1A1A' },
  { key: 'White', color: '#F4F5F0' },
  { key: 'ChartwellGreen', color: '#98B49E' },
  { key: 'SageGreen', color: '#7C8D79' },
  { key: 'AgateGrey', color: '#B1B3A7' },
  { key: 'Aluminium', color: '#B4B9BE' },
  { key: 'Cream', color: '#ECE6D3' },
  { key: 'Oak', color: '#BC8A4E' },
  { key: 'Rosewood', color: '#4A2A22' },
  { key: 'Mahogany', color: '#5C2516' },
  { key: 'Walnut', color: '#3D2B1F' },
  { key: 'Teak', color: '#8E5929' },
  { key: 'Brown', color: '#6B4423' },
] as const;
