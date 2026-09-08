/** Keep the experimental loader self-contained and bounded before decoding. */
export function validateLocalGLB(buffer: ArrayBuffer): void {
  if (buffer.byteLength > 128 * 1024 * 1024) throw new Error('Choose a GLB smaller than 128 MB.');
  if (buffer.byteLength < 20) throw new Error('This is not a complete GLB file.');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) {
    throw new Error('Choose a valid glTF 2.0 binary (.glb) file.');
  }
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || length > 16 * 1024 * 1024 || length + 20 > buffer.byteLength) {
    throw new Error('Invalid or oversized GLB metadata.');
  }
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length)));
  for (const entry of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    if (entry.uri && !/^data:/.test(entry.uri)) throw new Error('Use a self-contained GLB with embedded textures.');
  }
  const count = (json.meshes ?? []).reduce((total: number, mesh: { primitives?: { attributes?: { POSITION?: number } }[] }) =>
    total + (mesh.primitives ?? []).reduce((sum, primitive) => sum + (json.accessors?.[primitive.attributes?.POSITION ?? -1]?.count ?? 0), 0), 0);
  if (!Number.isFinite(count) || count > 2_000_000) throw new Error('This test viewer supports up to two million mesh vertices.');
}
