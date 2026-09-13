function fail(message: string): never { throw new Error(`Unsupported GLB extension: ${message}`); }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Explicit initial extension support for local furniture import. Core geometry
 * and materials are checked separately. Unsupported optional extensions are not
 * silently dropped: the original asset must remain available to the user. */
export function validateLocalGLBExtensions(document: Record<string, any>) {
  function names(value: unknown, field: string): string[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 32 || value.some(name => typeof name !== 'string' || !name.length) || new Set(value).size !== value.length) fail(`Invalid ${field} declaration.`);
    return value;
  }
  const used = names(document.extensionsUsed, 'extensionsUsed');
  const required = names(document.extensionsRequired, 'extensionsRequired');
  for (const name of [...used, ...required]) {
    if (name !== 'KHR_materials_unlit') fail(`${name} is not supported by local model import yet.`);
  }
  for (const name of required) if (!used.includes(name)) fail('Required extensions must also be declared as used.');
  const present = new Set<string>();
  function visit(value: unknown, path: (string | number)[], depth: number) {
    if (depth > 100) fail('Extension metadata is too deeply nested.');
    if (Array.isArray(value)) { value.forEach((item, index) => visit(item, [...path, index], depth + 1)); return; }
    if (!record(value)) return;
    for (const [key, child] of Object.entries(value)) {
      // extras is application-owned metadata, never a glTF extension location.
      if (key === 'extras') continue;
      if (key !== 'extensions') { visit(child, [...path, key], depth + 1); continue; }
      if (!record(child)) fail('An extension dictionary is malformed.');
      for (const [name, payload] of Object.entries(child)) {
        if (!used.includes(name)) fail(`${name} is missing from extensionsUsed.`);
        if (name !== 'KHR_materials_unlit') fail(`${name} is not supported by local model import yet.`);
        if (path.length !== 2 || path[0] !== 'materials' || typeof path[1] !== 'number' || !record(payload)) fail('KHR_materials_unlit must be an object on a material.');
        present.add(name);
      }
    }
  }
  visit(document, [], 0);
  return { used, required, present: [...present] };
}
