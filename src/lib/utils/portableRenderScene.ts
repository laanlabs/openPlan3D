import { BoxGeometry, Matrix4, Mesh, Object3D, Vector3 } from 'three';

type Material = 'wall' | 'floor' | 'proxy';
export interface PortableRenderMesh { name: string; material: Material; vertices: number[][]; faces: number[][] }
const LIMIT = { meshes: 10000, vertices: 300000, faces: 300000, bytes: 64 * 1024 * 1024 };

/** Snapshot the displayed geometry, never textures, source files or photo cameras.
 * Viewer coordinates are centimetres, Y up; the worker contract uses metres.
 */
export function portableRenderScene(root: Object3D, scope: 'active-floor' | 'stacked-floors' = 'active-floor') {
  const meshes: PortableRenderMesh[] = [];
  let verticesTotal = 0, facesTotal = 0;
  const lo = new Vector3(Infinity, Infinity, Infinity), hi = new Vector3(-Infinity, -Infinity, -Infinity);
  root.updateWorldMatrix(true, true);
  function append(mesh: Mesh, material: Material, trackBounds = true) {
    if (mesh.type === 'SkinnedMesh' || mesh.type === 'InstancedMesh' || mesh.morphTargetInfluences?.some(v => v !== 0)) {
      throw new Error('This scene contains animated or instanced geometry that cannot yet be exported.');
    }
    const geometry = mesh.geometry, position = geometry.getAttribute('position'), index = geometry.getIndex();
    if (!position || position.itemSize !== 3) throw new Error('A mesh has unsupported vertex data.');
    const count = index?.count ?? position.count;
    const start = geometry.drawRange.start, end = Math.min(count, start + geometry.drawRange.count);
    if (!Number.isInteger(start) || start < 0 || start % 3 || !Number.isInteger(end) || (end - start) % 3) {
      throw new Error('A mesh has an unsupported triangle draw range.');
    }
    if (start >= end) return;
    const faceCount = (end - start) / 3;
    if (meshes.length >= LIMIT.meshes || facesTotal + faceCount > LIMIT.faces) throw new Error('Render scene exceeds the geometry budget.');
    const vertices: number[][] = [], faces: number[][] = [], remap = new Map<number, number>();
    const matrix = mesh.matrixWorld;
    const determinant = matrix.determinant();
    if (!Number.isFinite(determinant) || determinant === 0) throw new Error('A mesh has an invalid transform.');
    const point = new Vector3();
    for (let offset = start; offset < end; offset += 3) {
      const face: number[] = [];
      for (let corner = 0; corner < 3; corner++) {
        const source = index ? index.getX(offset + corner) : offset + corner;
        if (!Number.isInteger(source) || source < 0 || source >= position.count) throw new Error('A mesh has invalid triangle indices.');
        let target = remap.get(source);
        if (target === undefined) {
          if (verticesTotal + vertices.length >= LIMIT.vertices) throw new Error('Render scene exceeds the vertex budget.');
          point.fromBufferAttribute(position, source).applyMatrix4(matrix).multiplyScalar(0.01);
          const value = point.toArray();
          if (value.some(v => !Number.isFinite(v) || Math.abs(v) > 10000)) throw new Error('A mesh has invalid or out-of-range coordinates.');
          target = vertices.length; vertices.push(value); remap.set(source, target);
          if (trackBounds) { lo.min(point); hi.max(point); }
        }
        face.push(target);
      }
      if (new Set(face).size !== 3) throw new Error('A mesh has repeated triangle indices.');
      if (determinant < 0) face.reverse();
      faces.push(face);
    }
    verticesTotal += vertices.length; facesTotal += faces.length;
    meshes.push({ name: `${material}-${meshes.length}`, material, vertices, faces });
  }
  function visit(node: Object3D) {
    if (!node.visible || node.userData.renderExclude === true) return;
    if (node instanceof Mesh) {
      const role = node.userData.renderMaterial;
      append(node, role === 'floor' || role === 'wall' ? role : node.userData.wallId ? 'wall' : 'proxy');
    }
    for (const child of node.children) visit(child);
  }
  visit(root);
  if (!meshes.length) throw new Error('There is no displayed geometry to export.');
  // A bounded neutral support slab replaces the viewer's decorative infinite ground.
  const size = hi.clone().sub(lo), center = hi.clone().add(lo).multiplyScalar(0.5);
  const geometry = new BoxGeometry((size.x + 0.4) * 100, 10, (size.z + 0.4) * 100);
  const slab = new Mesh(geometry);
  slab.matrixWorld.copy(new Matrix4().makeTranslation(center.x * 100, lo.y * 100 - 5, center.z * 100));
  try { append(slab, 'floor', false); } finally { geometry.dispose(); (slab.material as import('three').Material).dispose(); }
  return {
    schema: 'openplan3d-render-scene', version: 1, coordinates: 'arkit-metres-y-up',
    geometry: 'edited-web-preview', scope,
    limitations: ['Neutral snapshot of currently displayed meshes; textures and photo cameras are omitted.',
      'Glass panes, ceilings, labels and camera helpers are omitted. Floor support is a rectangular envelope.',
      'Includes currently loaded furniture geometry; viewer simplifications remain. No scan-camera alignment.'],
    meshes,
  };
}

export function portableRenderSceneJSON(root: Object3D, scope?: 'active-floor' | 'stacked-floors'): string {
  const json = JSON.stringify(portableRenderScene(root, scope));
  if (new TextEncoder().encode(json).length > LIMIT.bytes) throw new Error('Render scene exceeds 64 MiB.');
  return json;
}
