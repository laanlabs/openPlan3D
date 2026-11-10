import { expect, it } from 'vitest';
import * as THREE from 'three';
import { COLUMN_SKIN, columnGeometry } from '$lib/utils/columnGeometry';
import { DEPTH_ORDER } from '$lib/utils/depthOrder';

const size = (geometry: THREE.BufferGeometry) => {
  geometry.computeBoundingBox();
  const result = geometry.boundingBox!.getSize(new THREE.Vector3());
  geometry.dispose();
  return result.toArray();
};

it('stands a square column proud of a wall exactly as thick as it, so their faces are never coplanar', () => {
  // A 15 cm column in a 15 cm wall: both draw with no polygon offset on the exterior side.
  const [x, y, z] = size(columnGeometry({ shape: 'square', diameter: 15, height: 280 }));
  expect(COLUMN_SKIN).toBeGreaterThanOrEqual(0.5);
  expect(x).toBeCloseTo(15 + 2 * COLUMN_SKIN);
  expect(z).toBeCloseTo(15 + 2 * COLUMN_SKIN);
  expect(y).toBe(280); // tops stay level with the wall's; the offset settles them (below)
});

it('keeps round columns at their plan diameter and fills in missing sizes', () => {
  const [x, y, z] = size(columnGeometry({ shape: 'round', diameter: 30, height: 250 }));
  expect(Math.max(x, z)).toBeCloseTo(30);
  expect(y).toBe(250);
  expect(size(columnGeometry({ shape: 'square', diameter: 0, height: 0 }))).toEqual([30 + 2 * COLUMN_SKIN, 280, 30 + 2 * COLUMN_SKIN]);
});

it('draws a column over the wall it stands in, and never through a thicker wall around it', () => {
  // Wall tops and interior faces use DEPTH_ORDER.interiorWall; exterior faces and wall ends use 0.
  // A default column and wall are both 280 cm tall: the column's top must win their shared plane.
  expect(DEPTH_ORDER.column).toBeLessThan(DEPTH_ORDER.interiorWall);
  // An offset below 0 would pull a column face standing just behind an exterior face through it.
  expect(DEPTH_ORDER.column).toBe(0);
});
