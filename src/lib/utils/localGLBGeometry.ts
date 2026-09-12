import type { readLocalGLB } from './localGLB';
import { validateLocalGLBAccessors, visitValidatedLocalGLBAccessor } from './localGLBAccessors';
import { validateLocalGLBScene } from './localGLBScene';

function fail(message: string): never { throw new Error(`Invalid GLB geometry: ${message}`); }
const record = (value: any): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Validate ordinary glTF mesh semantics and actual position/index values.
 * Materials, extensions and loader compatibility are separate import gates. */
export function validateLocalGLBGeometry(container: ReturnType<typeof readLocalGLB>) {
  const layouts = validateLocalGLBAccessors(container);
  const scene = validateLocalGLBScene(container.document);
  const { document } = container;
  const accessors = document.accessors;
  function accessor(id: unknown) {
    if (!Number.isSafeInteger(id) || (id as number) < 0 || (id as number) >= accessors.length) fail('An attribute reference is out of range.');
    return accessors[id as number];
  }
  const bounds = new Map<number, { min: number[]; max: number[] }>();
  const maximumIndices = new Map<number, number>();
  function positionBounds(id: number) {
    if (!bounds.has(id)) {
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      visitValidatedLocalGLBAccessor(container, id, values => {
        for (let axis = 0; axis < 3; axis++) {
          if (Math.abs(values[axis]) > 1_000_000) fail('Position exceeds the supported coordinate range.');
          min[axis] = Math.min(min[axis], values[axis]); max[axis] = Math.max(max[axis], values[axis]);
        }
      });
      bounds.set(id, { min, max });
    }
    return bounds.get(id)!;
  }
  function attributes(value: unknown, count: number, morph = false) {
    if (!record(value) || !Object.keys(value).length || Object.keys(value).length > 32) fail('Invalid attribute table.');
    for (const [semantic, id] of Object.entries(value)) {
      const a = accessor(id);
      if (a.count !== count) fail('Attribute vertex counts do not match.');
      const float = a.componentType === 5126 && !a.normalized;
      const unsignedNormalized = [5121, 5123].includes(a.componentType) && a.normalized === true;
      let valid = false;
      if (morph) valid = ['POSITION', 'NORMAL', 'TANGENT'].includes(semantic) && a.type === 'VEC3' && float;
      else if (semantic === 'POSITION' || semantic === 'NORMAL') valid = a.type === 'VEC3' && float;
      else if (semantic === 'TANGENT') valid = a.type === 'VEC4' && float;
      else if (/^TEXCOORD_\d+$/.test(semantic)) valid = a.type === 'VEC2' && (float || unsignedNormalized);
      else if (/^COLOR_\d+$/.test(semantic)) valid = ['VEC3', 'VEC4'].includes(a.type) && (float || unsignedNormalized);
      else if (/^JOINTS_\d+$/.test(semantic)) valid = a.type === 'VEC4' && [5121, 5123].includes(a.componentType) && !a.normalized;
      else if (/^WEIGHTS_\d+$/.test(semantic)) valid = a.type === 'VEC4' && (float || unsignedNormalized);
      else if (semantic.startsWith('_')) valid = ['SCALAR', 'VEC2', 'VEC3', 'VEC4'].includes(a.type);
      if (!valid) fail(`Unsupported format for ${semantic}.`);
      const view = a.bufferView === undefined ? undefined : document.bufferViews[a.bufferView];
      if ((a.byteOffset || 0) % 4 || (a.count > 1 && (view?.byteStride ?? layouts[id as number].elementSize) % 4)) fail('Vertex attributes require four-byte alignment.');
      if (semantic === 'POSITION') positionBounds(id as number);
    }
  }
  const meshes = document.meshes.map((mesh: Record<string, any>) => {
    let targetCount: number | undefined;
    return mesh.primitives.map((primitive: Record<string, any>) => {
      const position = accessor(primitive.attributes?.POSITION);
      attributes(primitive.attributes, position.count);
      let count = position.count;
      if (primitive.indices !== undefined) {
        const indices = accessor(primitive.indices);
        if (indices.type !== 'SCALAR' || ![5121, 5123, 5125].includes(indices.componentType) || indices.normalized) fail('Invalid index accessor.');
        if (indices.bufferView !== undefined && document.bufferViews[indices.bufferView].byteStride !== undefined) fail('Index data must be tightly packed.');
        const restart = indices.componentType === 5121 ? 255 : indices.componentType === 5123 ? 65535 : 4294967295;
        if (!maximumIndices.has(primitive.indices)) {
          let maximum = 0;
          visitValidatedLocalGLBAccessor(container, primitive.indices, values => { maximum = Math.max(maximum, values[0]); });
          maximumIndices.set(primitive.indices, maximum);
        }
        const maximum = maximumIndices.get(primitive.indices)!;
        if (maximum >= position.count || maximum === restart) fail('An index points outside the vertex array or uses primitive restart.');
        count = indices.count;
      }
      const mode = primitive.mode === undefined ? 4 : primitive.mode;
      if (!Number.isInteger(mode) || mode < 0 || mode > 6 || (mode === 1 && count % 2) ||
          (mode === 4 && count % 3) || ([2, 3].includes(mode) && count < 2) || ([4, 5, 6].includes(mode) && count < 3)) fail('Invalid primitive draw mode or element count.');
      const targets = primitive.targets === undefined ? [] : primitive.targets;
      if (!Array.isArray(targets) || targets.length > 32) fail('Invalid morph targets.');
      if (targetCount !== undefined && targetCount !== targets.length) fail('Morph target counts differ within a mesh.');
      targetCount = targets.length;
      for (const target of targets) attributes(target, position.count, true);
      if (mesh.weights !== undefined && (!Array.isArray(mesh.weights) || mesh.weights.length !== targetCount || mesh.weights.some((v: unknown) => typeof v !== 'number' || !Number.isFinite(v)))) fail('Invalid morph weights.');
      return { mode, count, bounds: positionBounds(primitive.attributes.POSITION) };
    });
  });
  return { scene, meshes };
}
