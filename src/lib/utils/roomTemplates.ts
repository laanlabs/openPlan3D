import type { Point } from '$lib/models/types';
import type { RoomPreset } from './roomPresets';
import { placePreset } from './roomPresets';
import { addFurniture, rotateFurniture, beginUndoGroup, endUndoGroup } from '$lib/stores/project';

export interface FurniturePlacement {
  catalogId: string;
  /** Offset from room center, in cm */
  x: number;
  y: number;
  rotation: number;
}

export interface RoomTemplate {
  name: string;
  presetId: string; // which RoomPreset shape to use
  furniture: FurniturePlacement[];
}

/**
 * Room templates keyed by room-type name.
 * Positions are relative to the room bounding-box center.
 * Default room size is 400×300 so extents are ±200 x ±150.
 */
export const roomTemplates: RoomTemplate[] = [
  {
    name: 'Living Room',
    presetId: 'rectangle',
    furniture: [
      { catalogId: 'sofa', x: 0, y: -80, rotation: 0 },
      { catalogId: 'coffee_table', x: 0, y: 0, rotation: 0 },
      { catalogId: 'tv_stand', x: 0, y: 100, rotation: 180 },
      { catalogId: 'bookshelf', x: -170, y: 0, rotation: 90 },
    ],
  },
  {
    name: 'Bedroom',
    presetId: 'rectangle',
    furniture: [
      { catalogId: 'bed_queen', x: 0, y: -30, rotation: 0 },
      { catalogId: 'nightstand', x: -130, y: -30, rotation: 0 },
      { catalogId: 'nightstand', x: 130, y: -30, rotation: 0 },
      { catalogId: 'dresser', x: 50, y: 100, rotation: 180 },
      { catalogId: 'wardrobe', x: -120, y: 100, rotation: 180 },
    ],
  },
  {
    name: 'Kitchen',
    presetId: 'rectangle',
    furniture: [
      { catalogId: 'counter', x: -125, y: -100, rotation: 0 },
      { catalogId: 'fridge', x: 150, y: -100, rotation: 0 },
      { catalogId: 'stove', x: -25, y: -100, rotation: 0 },
      { catalogId: 'sink_k', x: 55, y: -100, rotation: 0 },
    ],
  },
  {
    name: 'Bathroom',
    presetId: 'rectangle',
    furniture: [
      { catalogId: 'bathtub', x: -60, y: -60, rotation: 0 },
      { catalogId: 'toilet', x: 100, y: -60, rotation: 0 },
      { catalogId: 'sink_b', x: 100, y: 60, rotation: 180 },
    ],
  },
  {
    name: 'Office',
    presetId: 'rectangle',
    furniture: [
      { catalogId: 'desk', x: 0, y: -50, rotation: 0 },
      { catalogId: 'office_chair', x: 0, y: 20, rotation: 180 },
      { catalogId: 'bookshelf', x: -170, y: 0, rotation: 90 },
    ],
  },
  {
    name: 'Dining Room',
    presetId: 'rectangle',
    furniture: [
      { catalogId: 'dining_table', x: 0, y: 0, rotation: 0 },
      { catalogId: 'dining_chair', x: -35, y: -77.5, rotation: 0 },
      { catalogId: 'dining_chair', x: 35, y: -77.5, rotation: 0 },
      { catalogId: 'dining_chair', x: -35, y: 77.5, rotation: 180 },
      { catalogId: 'dining_chair', x: 35, y: 77.5, rotation: 180 },
    ],
  },
];

/**
 * Place a room preset with optional furniture template.
 * Furniture positions are offset from the given origin (room center).
 */
export function placeRoomTemplate(
  preset: RoomPreset,
  origin: Point,
  template: RoomTemplate | null,
  w = 400,
  h = 300,
): void {
  beginUndoGroup();
  try {
    placePreset(preset, origin, w, h);
    for (const item of template?.furniture ?? []) {
      const id = addFurniture(item.catalogId, {
        x: origin.x + item.x, y: origin.y + item.y,
      });
      if (item.rotation !== 0) rotateFurniture(id, item.rotation);
    }
  } finally {
    endUndoGroup('Placed room template');
  }
}
