import type { readLocalGLB } from './localGLB';
import { validateLocalGLBResources } from './localGLBResources';

const MAX_DECODED_BYTES = 64 * 1024 * 1024;
const sizes: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const shapes: Record<string, [number, number]> = {
  SCALAR: [1, 1], VEC2: [1, 2], VEC3: [1, 3], VEC4: [1, 4],
  MAT2: [2, 2], MAT3: [3, 3], MAT4: [4, 4],
};
function fail(message: string): never { throw new Error(`Invalid GLB accessor: ${message}`); }
function integer(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) >= 0; }
function record(value: any): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }

/** Validate storage before allocating decoded accessors. Mesh attribute semantics,
 * extension policy and final geometry bounds still require separate validation. */
export function validateLocalGLBAccessors(container: ReturnType<typeof readLocalGLB>) {
  const { ranges } = validateLocalGLBResources(container);
  const { document, binary } = container;
  const accessors = document.accessors === undefined ? [] : document.accessors;
  if (!Array.isArray(accessors) || accessors.length > 4096 || accessors.some(a => !record(a))) fail('Invalid accessor table.');
  const bytes = binary && new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  let decodedBytes = 0;
  function storage(reference: unknown, offset: unknown, count: number, elementSize: number, alignment: number, sparse = false, lastSize = elementSize) {
    if (!integer(reference) || reference >= ranges.length || !integer(offset)) fail('Invalid storage reference or offset.');
    const range = ranges[reference], view = document.bufferViews[reference];
    if (sparse && (view.byteStride !== undefined || view.target !== undefined)) fail('Sparse storage must be tightly packed and have no target.');
    const stride = view.byteStride === undefined ? elementSize : view.byteStride;
    if (stride < elementSize || stride % alignment || offset % alignment || (range.offset + offset) % alignment) fail('Invalid accessor alignment or stride.');
    if (offset > range.length || (count - 1) * stride + lastSize > range.length - offset) fail('Accessor extends beyond its buffer view.');
    return { offset: range.offset + offset, stride };
  }
  return accessors.map(accessor => {
    const size = integer(accessor.componentType) ? sizes[accessor.componentType] : undefined;
    const shape = typeof accessor.type === 'string' && Object.prototype.hasOwnProperty.call(shapes, accessor.type) ? shapes[accessor.type] : undefined;
    if (!size || !Array.isArray(shape) || !integer(accessor.count) || accessor.count < 1) fail('Invalid component type, shape or count.');
    if (accessor.normalized !== undefined && (typeof accessor.normalized !== 'boolean' ||
        (accessor.normalized && [5125, 5126].includes(accessor.componentType)))) fail('Invalid normalization.');
    const [columns, rows] = shape;
    const columnBytes = columns === 1 ? rows * size : Math.ceil(rows * size / 4) * 4;
    const elementSize = columns * columnBytes;
    const lastSize = (columns - 1) * columnBytes + rows * size;
    // Include interleaved storage in the budget as loaders may clone its full stride.
    const sourceView = integer(accessor.bufferView) ? document.bufferViews?.[accessor.bufferView] : undefined;
    decodedBytes += accessor.count * Math.max(elementSize, sourceView?.byteStride || 0);
    if (!Number.isSafeInteger(decodedBytes) || decodedBytes > MAX_DECODED_BYTES) fail('Decoded geometry exceeds the memory budget.');
    const alignment = columns > 1 ? Math.max(4, size) : size;
    function checkFloats(source: { offset: number; stride: number }, count: number) {
      if (accessor.componentType !== 5126) return;
      for (let i = 0; i < count; i++) for (let column = 0; column < columns; column++) for (let row = 0; row < rows; row++) {
        if (!Number.isFinite(bytes!.getFloat32(source.offset + i * source.stride + column * columnBytes + row * size, true))) fail('Non-finite floating-point data.');
      }
    }
    if (accessor.bufferView !== undefined) {
      checkFloats(storage(accessor.bufferView, accessor.byteOffset === undefined ? 0 : accessor.byteOffset, accessor.count, elementSize, alignment, false, lastSize), accessor.count);
    } else if (accessor.byteOffset !== undefined) fail('An accessor without a buffer view cannot have a byte offset.');
    const sparse = accessor.sparse;
    if (sparse !== undefined) {
      if (!record(sparse) || !integer(sparse.count) || sparse.count < 1 || sparse.count > accessor.count ||
          !record(sparse.indices) || !record(sparse.values) || ![5121, 5123, 5125].includes(sparse.indices.componentType)) fail('Invalid sparse accessor.');
      const indexSize = sizes[sparse.indices.componentType];
      const indices = storage(sparse.indices.bufferView, sparse.indices.byteOffset === undefined ? 0 : sparse.indices.byteOffset, sparse.count, indexSize, indexSize, true);
      let previous = -1;
      for (let i = 0; i < sparse.count; i++) {
        const offset = indices.offset + i * indexSize;
        const index = indexSize === 1 ? bytes!.getUint8(offset) : indexSize === 2 ? bytes!.getUint16(offset, true) : bytes!.getUint32(offset, true);
        if (index <= previous || index >= accessor.count) fail('Sparse indices must increase strictly and remain in range.');
        previous = index;
      }
      checkFloats(storage(sparse.values.bufferView, sparse.values.byteOffset === undefined ? 0 : sparse.values.byteOffset, sparse.count, elementSize, alignment, true, lastSize), sparse.count);
    }
    return { count: accessor.count as number, components: columns * rows, elementSize };
  });
}
