function fail(message: string): never { throw new Error(`Unsupported GLB extension: ${message}`); }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

/** Explicit extension support for local furniture import. Core geometry and
 * materials are checked separately. Unsupported extensions are not silently
 * dropped: the original asset must remain available to the user. */
const SUPPORTED = new Set(['KHR_materials_unlit', 'EXT_texture_webp', 'KHR_draco_mesh_compression']);

export function validateLocalGLBExtensions(document: Record<string, any>) {
  function names(value: unknown, field: string): string[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 32 || value.some(name => typeof name !== 'string' || !name.length) || new Set(value).size !== value.length) fail(`Invalid ${field} declaration.`);
    return value;
  }
  const used = names(document.extensionsUsed, 'extensionsUsed');
  const required = names(document.extensionsRequired, 'extensionsRequired');
  const unsupported = [...new Set([...used, ...required])].filter(name => !SUPPORTED.has(name));
  if (unsupported.length) fail(`${unsupported.join(', ')} is not supported by local model import yet.`);
  for (const name of required) if (!used.includes(name)) fail('Required extensions must also be declared as used.');
  const present = new Set<string>();
  /** Validate an extension payload in the location glTF defines for it. */
  function payload(name: string, value: unknown, path: (string | number)[]) {
    if (name === 'KHR_materials_unlit') {
      if (path.length !== 2 || path[0] !== 'materials' || typeof path[1] !== 'number' || !record(value)) fail('KHR_materials_unlit must be an object on a material.');
      return;
    }
    if (name === 'EXT_texture_webp') {
      if (path.length !== 2 || path[0] !== 'textures' || typeof path[1] !== 'number' || !record(value) || !integer(value.source)) fail('EXT_texture_webp has an invalid declaration.');
      return;
    }
    // KHR_draco_mesh_compression
    if (path.length !== 4 || path[0] !== 'meshes' || path[2] !== 'primitives' || typeof path[1] !== 'number' || typeof path[3] !== 'number' || !record(value)) fail('KHR_draco_mesh_compression has an invalid declaration.');
    if (!integer(value.bufferView) || !record(value.attributes) || !Object.keys(value.attributes).length) fail('KHR_draco_mesh_compression has an invalid declaration.');
    for (const [semantic, id] of Object.entries(value.attributes)) if (!semantic.length || !integer(id)) fail('KHR_draco_mesh_compression has an invalid declaration.');
  }
  function visit(value: unknown, path: (string | number)[], depth: number) {
    if (depth > 100) fail('Extension metadata is too deeply nested.');
    if (Array.isArray(value)) { value.forEach((item, index) => visit(item, [...path, index], depth + 1)); return; }
    if (!record(value)) return;
    for (const [key, child] of Object.entries(value)) {
      // extras is application-owned metadata, never a glTF extension location.
      if (key === 'extras') continue;
      if (key !== 'extensions') { visit(child, [...path, key], depth + 1); continue; }
      if (!record(child)) fail('An extension dictionary is malformed.');
      for (const [name, value] of Object.entries(child)) {
        if (!used.includes(name)) fail(`${name} is missing from extensionsUsed.`);
        if (!SUPPORTED.has(name)) fail(`${name} is not supported by local model import yet.`);
        payload(name, value, path);
        present.add(name);
      }
    }
  }
  visit(document, [], 0);
  return { used, required, present: [...present] };
}
