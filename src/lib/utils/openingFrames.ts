// Door and window frames in the 3D viewer. Frames reach OVERLAP into their opening so no
// frame face is coplanar with a wall reveal (coplanar faces z-fight).
import { pathOpening, type WallOpening, type wallPathProfile } from './wallProfiles';

type WallPath = ReturnType<typeof wallPathProfile>;

const DOOR_JAMB = 5;
const OVERLAP = 0.5;

/** A frame member along the wall path (cm): `center` and `width` along it, `bottom` and `height` up. */
export interface FrameBox { center: number; width: number; bottom: number; height: number }

/** The member covering `member`, reaching OVERLAP into the opening across its `edge`. The wall's
 * ends and top clip members; one they clip away entirely is left out, or the overlap alone would
 * draw a 0.5 cm sliver there (a fin at a wall end, a lid on a full-height door). */
function frameMember(path: WallPath, member: WallOpening, edge: keyof WallOpening): FrameBox | null {
  const { left, right, bottom, top } = member;
  if (!pathOpening(path, (left + right) / 2, right - left, bottom, top - bottom)) return null;
  const box = { ...member, [edge]: member[edge] + (edge === 'left' || edge === 'bottom' ? -OVERLAP : OVERLAP) };
  return { center: (box.left + box.right) / 2, width: box.right - box.left, bottom: box.bottom, height: box.top - box.bottom };
}

const present = <T>(boxes: (T | null)[]) => boxes.filter((box): box is T => box !== null);

/** Jambs and header around a door `opening` on the wall `path` (cm), as clipped by the wall.
 * Depth is wall thickness + 3: 0.5 cm proud of the baseboard on each face. */
export function doorFrameBoxes(path: WallPath, opening: WallOpening, wallThickness: number) {
  const { left, right, bottom, top } = opening, depth = wallThickness + 3;
  return present([
    frameMember(path, { left: left - DOOR_JAMB, right: left, bottom, top }, 'right'),
    frameMember(path, { left: right, right: right + DOOR_JAMB, bottom, top }, 'left'),
    frameMember(path, { left: left - DOOR_JAMB, right: right + DOOR_JAMB, bottom: top, top: top + DOOR_JAMB }, 'bottom'),
  ]).map(box => ({ ...box, depth }));
}

/** A window's outer frame bars, `bar` wide, around its `opening` on the wall `path` (cm). */
export function windowOuterBars(path: WallPath, opening: WallOpening, bar: number) {
  const { left, right, bottom, top } = opening;
  return present([
    frameMember(path, { left: left - bar, right: right + bar, bottom: bottom - bar, top: bottom }, 'top'), // bottom
    frameMember(path, { left: left - bar, right: right + bar, bottom: top, top: top + bar }, 'bottom'),    // top
    frameMember(path, { left: left - bar, right: left, bottom, top }, 'right'),                            // left
    frameMember(path, { left: right, right: right + bar, bottom, top }, 'left'),                           // right
  ]);
}
