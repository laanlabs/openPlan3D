import * as THREE from 'three';
import type { Column } from '$lib/models/types';

/** How far a square column's 3D faces stand outside its plan outline. Columns and the exterior
 * faces of walls both draw with no polygon offset (DEPTH_ORDER.column is 0), so a column exactly as
 * thick as the wall it stands in would z-fight with the wall there; this keeps their faces apart.
 * An offset in polygon units alone does not settle such a tie everywhere: under SwiftShader a
 * column one unit ahead still lost most of its face, and needed 16. A column 2 * COLUMN_SKIN
 * thinner than its wall is flush instead, a less likely size than one as thick as the wall. */
export const COLUMN_SKIN = 0.5;

/** A column's 3D shape, centred on the origin. Round columns have no flat face to lie in a
 * wall plane, so only square ones grow by COLUMN_SKIN. */
export function columnGeometry(column: Pick<Column, 'shape' | 'diameter' | 'height'>): THREE.BufferGeometry {
  const h = column.height || 280, d = column.diameter || 30;
  return column.shape === 'square'
    ? new THREE.BoxGeometry(d + 2 * COLUMN_SKIN, h, d + 2 * COLUMN_SKIN)
    : new THREE.CylinderGeometry(d / 2, d / 2, h, 24);
}
