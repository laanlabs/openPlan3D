import * as THREE from 'three';
import type { Floor, Point, Stair } from '$lib/models/types';
import { floorElevations } from './floors';
import { resolveRoomGeometry } from './roomDetection';
import { stairPlanBounds } from './stairPlanGeometry';
import { stairRises } from './stairLevels';

/** What the active floor alone shows through its "Open to floor below" rooms: the well down to the floor
 *  below and the stairs that climb from there into an opening. */
export interface StairwellView {
  /** Opening outlines on the active floor, in plan cm. */
  openings: Point[][];
  /** Floor-to-floor drop to the floor below, in cm. */
  depth: number;
  /** The floor below, and its Up stairs that reach into an opening's footprint. */
  below: Floor;
  stairs: Stair[];
}

function bounds(points: Point[]) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Null unless the floor has an opening and a floor below it. */
export function stairwellView(floors: Floor[], floorId: string): StairwellView | null {
  const entries = floorElevations(floors);
  const index = entries.findIndex(entry => entry.floor.id === floorId);
  if (index < 1) return null;
  const floor = entries[index].floor, below = entries[index - 1].floor;
  if (!floor.rooms.some(room => room.floorOpening)) return null;
  const openings = resolveRoomGeometry(floor)
    .filter(({ room, polygon }) => room.floorOpening && polygon.length >= 3)
    .map(({ polygon }) => polygon);
  if (!openings.length) return null;
  const boxes = openings.map(bounds);
  const stairs = (below.stairs ?? []).filter(stair => {
    if (stair.direction === 'down') return false;
    const b = stairPlanBounds(stair);
    return boxes.some(o => b.minX < o.maxX && b.maxX > o.minX && b.minY < o.maxY && b.maxY > o.minY);
  });
  return { openings, depth: stairRises(floors, floorId).down, below, stairs };
}

/** A square ground `size` cm across, centred on the origin, with the openings cut out. It lies in the
 *  shape's xy plane like a room slab: rotate it -90° about x and plan y becomes world z. Its UVs match a
 *  PlaneGeometry of the same size, so the ground texture keeps its scale and grid. */
export function groundWithOpenings(size: number, openings: Point[][]): THREE.ShapeGeometry {
  const half = size / 2;
  const shape = new THREE.Shape([
    new THREE.Vector2(-half, -half), new THREE.Vector2(half, -half), new THREE.Vector2(half, half), new THREE.Vector2(-half, half),
  ]);
  for (const opening of openings) shape.holes.push(new THREE.Path(opening.map(p => new THREE.Vector2(p.x, -p.y))));
  const geometry = new THREE.ShapeGeometry(shape);
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, position.getX(i) / size + 0.5, position.getY(i) / size + 0.5);
  uv.needsUpdate = true;
  return geometry;
}
