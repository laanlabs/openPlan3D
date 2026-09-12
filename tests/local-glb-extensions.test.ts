import { expect, it } from 'vitest';
import { validateLocalGLBExtensions as validate } from '$lib/utils/localGLBExtensions';

it('accepts core GLB and explicitly declared unlit materials without mutation', () => {
  expect(validate({})).toEqual({ used: [], required: [], present: [] });
  const document = { extensionsUsed: ['KHR_materials_unlit'], extensionsRequired: ['KHR_materials_unlit'], materials: [{ extensions: { KHR_materials_unlit: {} } }] };
  const before = structuredClone(document);
  expect(validate(document).present).toEqual(['KHR_materials_unlit']); expect(document).toEqual(before);
});
it('rejects unsupported optional extensions as well as required ones', () => {
  for (const field of ['extensionsUsed', 'extensionsRequired']) {
    for (const name of ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu', 'KHR_texture_transform', 'VENDOR_unknown']) {
      expect(() => validate({ [field]: [name] })).toThrow('not supported');
    }
  }
});
it('rejects malformed or inconsistent declarations and payloads', () => {
  for (const document of [
    { extensionsUsed: null }, { extensionsUsed: ['KHR_materials_unlit', 'KHR_materials_unlit'] },
    { extensionsRequired: ['KHR_materials_unlit'] },
    { materials: [{ extensions: { KHR_materials_unlit: {} } }] },
    { extensionsUsed: ['KHR_materials_unlit'], materials: [{ extensions: { KHR_materials_unlit: null } }] },
    { extensionsUsed: ['KHR_materials_unlit'], nodes: [{ extensions: { KHR_materials_unlit: {} } }] },
    { extensions: [] },
  ]) expect(() => validate(document)).toThrow('GLB extension');
});
it('does not mistake arbitrary extras for renderer extension instructions', () => {
  const document = { extras: { extensions: { VENDOR_notes: { uri: 'https://example.com/reference' } } } };
  expect(validate(document).present).toEqual([]);
});
