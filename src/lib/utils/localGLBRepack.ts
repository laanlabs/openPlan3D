import type { readLocalGLB } from './localGLB';
import { validateLocalGLBGeometry } from './localGLBGeometry';
import { visitValidatedLocalGLBAccessor } from './localGLBAccessors';

const componentBytes: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const components: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const align = (value: number) => Math.ceil(value / 4) * 4;

/** Repack validated geometry into loader-compatible dense accessors, preserving
 * the source container. This does NOT replace material/extension/scene policies
 * or decoded texture checks required before exposing local model import. */
export function repackLocalGLBGeometry(container: ReturnType<typeof readLocalGLB>): ArrayBuffer {
  validateLocalGLBGeometry(container);
  const originalLength = container.document.buffers?.[0]?.byteLength || 0;
  let length = align(originalLength), geometryBytes = 0;
  const plans = container.document.accessors.map((accessor: Record<string, any>) => {
    // Float matrices avoid the loader's unsupported byte/short column padding.
    const matrix = accessor.type.startsWith('MAT');
    const type = matrix ? 5126 : accessor.componentType;
    const size = components[accessor.type];
    const bytes = accessor.count * size * componentBytes[type];
    geometryBytes += align(bytes);
    if (!Number.isSafeInteger(geometryBytes) || geometryBytes > 64 * 1024 * 1024) throw new Error('Repacked GLB geometry exceeds 64 MiB.');
    const offset = length; length += align(bytes);
    return { type, size, bytes, offset, matrix };
  });
  const document = structuredClone(container.document);
  document.bufferViews ??= [];
  document.buffers = [{ ...(document.buffers?.[0] || {}), byteLength: length }];
  const binary = new Uint8Array(length);
  if (container.binary) binary.set(container.binary.subarray(0, originalLength));
  const view = new DataView(binary.buffer);
  function write(offset: number, type: number, value: number) {
    switch (type) {
      case 5120: view.setInt8(offset, value); break;
      case 5121: view.setUint8(offset, value); break;
      case 5122: view.setInt16(offset, value, true); break;
      case 5123: view.setUint16(offset, value, true); break;
      case 5125: view.setUint32(offset, value, true); break;
      default: view.setFloat32(offset, value, true);
    }
  }
  plans.forEach((plan: { type: number; size: number; bytes: number; offset: number; matrix: boolean }, id: number) => {
    const source = container.document.accessors[id], target = document.accessors[id];
    const min = Array(plan.size).fill(Infinity), max = Array(plan.size).fill(-Infinity);
    visitValidatedLocalGLBAccessor(container, id, (values, index) => {
      values.forEach((raw, component) => {
        let value = raw;
        if (plan.matrix && source.normalized) {
          const divisor = source.componentType === 5120 ? 127 : source.componentType === 5121 ? 255 : source.componentType === 5122 ? 32767 : 65535;
          value = Math.max(-1, raw / divisor);
        }
        if (plan.type === 5126) value = Math.fround(value);
        write(plan.offset + (index * plan.size + component) * componentBytes[plan.type], plan.type, value);
        min[component] = Math.min(min[component], value); max[component] = Math.max(max[component], value);
      });
    });
    target.bufferView = document.bufferViews.length;
    target.componentType = plan.type;
    target.min = min; target.max = max;
    delete target.byteOffset; delete target.sparse;
    if (plan.matrix) delete target.normalized;
    document.bufferViews.push({ buffer: 0, byteOffset: plan.offset, byteLength: plan.bytes });
  });
  const json = new TextEncoder().encode(JSON.stringify(document));
  // Derived metadata remains bounded even when the original JSON was compact.
  if (json.length > 4 * 1024 * 1024) throw new Error('Repacked GLB metadata exceeds 4 MiB.');
  const jsonLength = align(json.length), total = 12 + 8 + jsonLength + 8 + binary.length;
  const result = new ArrayBuffer(total), output = new Uint8Array(result), header = new DataView(result);
  header.setUint32(0, 0x46546c67, true); header.setUint32(4, 2, true); header.setUint32(8, total, true);
  header.setUint32(12, jsonLength, true); header.setUint32(16, 0x4e4f534a, true);
  output.fill(0x20, 20, 20 + jsonLength); output.set(json, 20);
  header.setUint32(20 + jsonLength, binary.length, true); header.setUint32(24 + jsonLength, 0x004e4942, true);
  output.set(binary, 28 + jsonLength);
  return result;
}
