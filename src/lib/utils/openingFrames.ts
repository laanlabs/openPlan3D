// Door and window frames in the 3D viewer. Frames reach OVERLAP into their opening so no
// frame face is coplanar with a wall reveal (coplanar faces z-fight).

const DOOR_JAMB = 5;
const OVERLAP = 0.5;

/** Jambs and header around a door opening spanning `left`..`right` along the wall path (cm).
 * Depth is wall thickness + 3: 0.5 cm proud of the baseboard on each face. */
export function doorFrameBoxes(left: number, right: number, doorHeight: number, wallThickness: number) {
  const width = DOOR_JAMB + OVERLAP, depth = wallThickness + 3;
  return [
    { center: left - DOOR_JAMB / 2 + OVERLAP / 2, width, bottom: 0, height: doorHeight, depth },
    { center: right + DOOR_JAMB / 2 - OVERLAP / 2, width, bottom: 0, height: doorHeight, depth },
    { center: (left + right) / 2, width: right - left + DOOR_JAMB * 2, bottom: doorHeight - OVERLAP,
      height: DOOR_JAMB + OVERLAP, depth },
  ];
}

/** Window outer frame bars as offsets from the opening centre (`ox` along the wall, `oy` vertical). */
export function windowOuterBars(width: number, height: number, bar: number) {
  const w = bar + OVERLAP, shift = (bar - OVERLAP) / 2;
  return [
    { w: width + bar * 2, h: w, ox: 0, oy: -height / 2 - shift }, // bottom
    { w: width + bar * 2, h: w, ox: 0, oy: height / 2 + shift },  // top
    { w, h: height, ox: -width / 2 - shift, oy: 0 },              // left
    { w, h: height, ox: width / 2 + shift, oy: 0 },               // right
  ];
}
