import * as THREE from 'three';

export function createSlopedBoxGeometry(
  width: number,
  thickness: number,
  bottomY: number,
  topYLeft: number,
  topYRight: number
): THREE.BufferGeometry {
  const hLeft = topYLeft - bottomY;
  const hRight = topYRight - bottomY;
  if (hLeft === hRight) {
    const h = Math.max(0, hLeft);
    const geo = new THREE.BoxGeometry(width, h, thickness);
    geo.translate(0, bottomY + h / 2, 0);
    return geo;
  }

  const hw = width / 2;
  const ht = thickness / 2;
  const yb = bottomY;
  const ytl = Math.max(yb, topYLeft);
  const ytr = Math.max(yb, topYRight);

  // 6 faces * 4 vertices = 24 vertices
  const positions = new Float32Array([
    // +X face (right)
    hw, yb, +ht,   hw, yb, -ht,   hw, ytr, -ht,   hw, ytr, +ht,
    // -X face (left)
    -hw, yb, -ht,  -hw, yb, +ht,  -hw, ytl, +ht,  -hw, ytl, -ht,
    // +Y face (top sloped)
    -hw, ytl, +ht,  hw, ytr, +ht,  hw, ytr, -ht, -hw, ytl, -ht,
    // -Y face (bottom)
    -hw, yb, -ht,   hw, yb, -ht,   hw, yb, +ht,  -hw, yb, +ht,
    // +Z face (front / interior)
    -hw, yb, +ht,   hw, yb, +ht,   hw, ytr, +ht, -hw, ytl, +ht,
    // -Z face (back / exterior)
    hw, yb, -ht,   -hw, yb, -ht,  -hw, ytl, -ht,  hw, ytr, -ht,
  ]);

  const dx = width;
  const dy = ytr - ytl;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const normals = new Float32Array([
    // +X face
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
    // -X face
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    // +Y face
    nx, ny, 0,  nx, ny, 0,  nx, ny, 0,  nx, ny, 0,
    // -Y face
    0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
    // +Z face
    0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
    // -Z face
    0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
  ]);

  const uvs = new Float32Array([
    // +X face
    0, 0,  1, 0,  1, 1,  0, 1,
    // -X face
    0, 0,  1, 0,  1, 1,  0, 1,
    // +Y face
    0, 0,  1, 0,  1, 1,  0, 1,
    // -Y face
    0, 0,  1, 0,  1, 1,  0, 1,
    // +Z face
    0, 0,  1, 0,  1, 1,  0, 1,
    // -Z face
    0, 0,  1, 0,  1, 1,  0, 1,
  ]);

  const indices = [];
  for (let i = 0; i < 6; i++) {
    const offset = i * 4;
    indices.push(offset, offset + 1, offset + 2);
    indices.push(offset, offset + 2, offset + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  for (let i = 0; i < 6; i++) {
    geo.addGroup(i * 6, 6, i);
  }

  return geo;
}

/** Real-world size of one wall texture tile, in centimetres. */
export const WALL_TEXTURE_TILE_CM = 200;

/** Map the UVs of a createSlopedBoxGeometry wall piece in wall units, so a texture
 * tile covers the same `tile` centimetres on every piece and face and the pattern runs
 * on across the pieces cut around openings and along curves. `along` is the distance
 * from the wall's start to the piece's local origin. Each face keeps BoxGeometry's
 * texture orientation; the top keeps it at any slope. */
export function mapWallUVs(geometry: THREE.BufferGeometry, along: number, tile = WALL_TEXTURE_TILE_CM) {
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < position.count; i++) {
    const x = along + position.getX(i), y = position.getY(i), z = position.getZ(i);
    const nx = normal.getX(i), ny = normal.getY(i), nz = normal.getZ(i);
    let u: number, v: number;
    if (Math.abs(nz) > 0.5) { u = nz > 0 ? x : -x; v = y; } // interior and exterior faces
    else if (Math.abs(ny) > 1e-6) { u = x; v = ny > 0 ? -z : z; } // top, bottom, sills and heads
    else { u = nx > 0 ? -z : z; v = y; } // vertical wall ends and opening reveals
    uv.setXY(i, u / tile, v / tile);
  }
  uv.needsUpdate = true;
  return geometry;
}
