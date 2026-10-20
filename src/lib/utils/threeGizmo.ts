import * as THREE from 'three';

/** Axis handles exposed by the 3D transform gizmo. */
export type GizmoAxis = 'x' | 'y' | 'z' | 'along' | 'rotate';

export interface GizmoTarget {
  /** World position of the gizmo origin (the object's base). */
  position: THREE.Vector3;
  allow: { x: boolean; y: boolean; z: boolean; rotate: boolean };
  /** When set, a single arrow is oriented along this world direction instead of the x/z arrows. */
  along?: THREE.Vector3 | null;
}

const AXIS_COLORS: Record<'x' | 'y' | 'z', number> = { x: 0xef4444, y: 0x22c55e, z: 0x3b82f6 };

/** Draws the same circular-arrow glyph used by the 2D rotation handle. */
function rotationHandleTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath(); ctx.arc(32, 32, 16, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(32, 32, 9, -Math.PI * 0.8, Math.PI * 0.35); ctx.stroke();
  const end = Math.PI * 0.35;
  const ex = 32 + Math.cos(end) * 9, ey = 32 + Math.sin(end) * 9;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(ex + 2.5, ey + 3.5);
  ctx.lineTo(ex - 3, ey + 2.5);
  ctx.lineTo(ex - 0.5, ey - 3.5);
  ctx.closePath();
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

/**
 * A compact, dependency-free translate/rotate gizmo: three RGB arrows (x = plan
 * X, y = elevation, z = plan Y) plus a billboard rotation handle that reuses the
 * 2D icon. Drag math lives in the exported helpers; the viewer owns store commits.
 */
export function createTransformGizmo() {
  const object = new THREE.Group();
  object.visible = false;
  object.renderOrder = 1000;
  object.userData.renderExclude = true;

  const shaftGeo = new THREE.CylinderGeometry(1.6, 1.6, 70, 10);
  shaftGeo.translate(0, 35, 0);
  const headGeo = new THREE.ConeGeometry(5, 14, 12);
  headGeo.translate(0, 77, 0);
  const proxyGeo = new THREE.CylinderGeometry(7, 7, 84, 6);
  proxyGeo.translate(0, 42, 0);
  const proxyMat = new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false, transparent: true, opacity: 0, toneMapped: false });

  const meshes: { axis: GizmoAxis; mesh: THREE.Mesh }[] = [];

  function makeArrow(color: number, axis: GizmoAxis) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true, toneMapped: false });
    const shaft = new THREE.Mesh(shaftGeo, mat); shaft.userData.gizmoAxis = axis;
    const head = new THREE.Mesh(headGeo, mat); head.userData.gizmoAxis = axis;
    // Invisible, wider proxy makes the thin arrow easy to grab with a pointer.
    const proxy = new THREE.Mesh(proxyGeo, proxyMat); proxy.userData.gizmoAxis = axis; proxy.visible = false;
    group.add(shaft, head, proxy);
    object.add(group);
    meshes.push({ axis, mesh: shaft }, { axis, mesh: head }, { axis, mesh: proxy });
    return group;
  }

  const axes: Record<'x' | 'y' | 'z', THREE.Group> = {
    x: makeArrow(AXIS_COLORS.x, 'x'),
    y: makeArrow(AXIS_COLORS.y, 'y'),
    z: makeArrow(AXIS_COLORS.z, 'z'),
  };
  axes.x.rotation.z = -Math.PI / 2;
  axes.z.rotation.x = Math.PI / 2;
  const alongGroup = makeArrow(0xf59e0b, 'along');

  const handleMat = new THREE.SpriteMaterial({ map: rotationHandleTexture(), depthTest: false, depthWrite: false, transparent: true, toneMapped: false });
  const handle = new THREE.Sprite(handleMat);
  handle.userData.gizmoAxis = 'rotate' satisfies GizmoAxis;
  handle.scale.set(30, 30, 1);
  handle.position.set(0, 120, 0);
  object.add(handle);

  let target: GizmoTarget | null = null;
  let activePickables: THREE.Object3D[] = [];

  function refreshPickables() {
    activePickables = meshes.filter(({ axis }) => {
      if (axis === 'along') return alongGroup.visible;
      if (axis === 'rotate') return false;
      return axes[axis].visible;
    }).map(({ mesh }) => mesh);
    if (handle.visible) activePickables.push(handle);
  }

  function setTarget(next: GizmoTarget | null) {
    target = next;
    object.visible = !!next;
    if (!next) { refreshPickables(); return; }
    object.position.copy(next.position);
    const along = next.along ?? null;
    axes.x.visible = !along && next.allow.x;
    axes.y.visible = !along && next.allow.y;
    axes.z.visible = !along && next.allow.z;
    alongGroup.visible = !!along;
    if (along) {
      alongGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.clone().normalize());
    }
    handle.visible = next.allow.rotate;
    refreshPickables();
  }

  /** Keep the gizmo a roughly constant screen size as the camera moves. */
  function setScale(scale: number) {
    object.scale.setScalar(Math.max(scale, 0.001));
  }

  function pick(raycaster: THREE.Raycaster, ndc: THREE.Vector2, camera: THREE.Camera): GizmoAxis | null {
    if (!object.visible) return null;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(activePickables, false);
    for (const hit of hits) {
      const axis = hit.object.userData.gizmoAxis as GizmoAxis | undefined;
      if (axis) return axis;
    }
    return null;
  }

  function dispose() {
    shaftGeo.dispose();
    headGeo.dispose();
    proxyGeo.dispose();
    for (const { mesh } of meshes) (mesh.material as THREE.Material).dispose();
    handleMat.map?.dispose();
    handleMat.dispose();
  }

  return { object, setTarget, setScale, pick, dispose };
}

/** Scalar coordinate of the pointer along a world-space axis, on the plane through `origin`. */
export function pointerAxisValue(
  axis: THREE.Vector3, origin: THREE.Vector3, ndc: THREE.Vector2,
  camera: THREE.Camera, raycaster: THREE.Raycaster,
): number | null {
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  let normal = camDir.clone().sub(axis.clone().multiplyScalar(camDir.dot(axis)));
  if (normal.lengthSq() < 1e-8) {
    normal = Math.abs(axis.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  }
  normal.normalize();
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origin);
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, hit)) return null;
  return hit.dot(axis);
}

/** Plan-space angle (degrees, 0 = "up"/-Z) from the object center to the pointer on the floor plane. */
export function pointerAngleDeg(
  origin: THREE.Vector3, ndc: THREE.Vector2, camera: THREE.Camera, raycaster: THREE.Raycaster,
): number | null {
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -origin.y);
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, hit)) return null;
  return Math.atan2(hit.x - origin.x, -(hit.z - origin.z)) * 180 / Math.PI;
}

export const GIZMO_AXIS_DIRECTION: Record<'x' | 'y' | 'z', THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};
