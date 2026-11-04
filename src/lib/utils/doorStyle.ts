import type { Door } from '$lib/models/types';

/** Glazed door types get metal-framed glass leaves in 3D. */
export function isGlazedDoor(type: Door['type']): boolean {
  return type === 'sliding' || type === 'french';
}

/** Frame colour used when a door has no `frameColor`: aluminium for glazed doors, wood otherwise. */
export function defaultDoorFrameColor(type: Door['type']): string {
  return isGlazedDoor(type) ? '#B4B9BE' : '#6B4423';
}

export function doorFrameColor(door: Pick<Door, 'type' | 'frameColor'>): string {
  return door.frameColor ?? defaultDoorFrameColor(door.type);
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
