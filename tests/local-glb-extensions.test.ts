import { expect, it } from 'vitest';
import { validateLocalGLBExtensions as validate } from '$lib/utils/localGLBExtensions';

it('accepts core GLB and explicitly declared unlit materials without mutation', () => {
  expect(validate({})).toEqual({ used: [], required: [], present: [] });
  const document = { extensionsUsed: ['KHR_materials_unlit'], extensionsRequired: ['KHR_materials_unlit'], materials: [{ extensions: { KHR_materials_unlit: {} } }] };
  const before = structuredClone(document);
  expect(validate(document).present).toEqual(['KHR_materials_unlit']); expect(document).toEqual(before);
});
it('accepts WebP textures and Draco mesh compression in their defined locations', () => {
  const document = {
    extensionsUsed: ['EXT_texture_webp', 'KHR_draco_mesh_compression'],
    extensionsRequired: ['EXT_texture_webp', 'KHR_draco_mesh_compression'],
    textures: [{ extensions: { EXT_texture_webp: { source: 0 } } }],
    meshes: [{ primitives: [{ extensions: { KHR_draco_mesh_compression: { bufferView: 3, attributes: { POSITION: 0, NORMAL: 1 } } } }] }],
  };
  const before = structuredClone(document);
  expect(validate(document).present).toEqual(['EXT_texture_webp', 'KHR_draco_mesh_compression']);
  expect(document).toEqual(before);
});
it('rejects unsupported optional extensions as well as required ones', () => {
  for (const field of ['extensionsUsed', 'extensionsRequired']) {
    for (const name of ['EXT_meshopt_compression', 'KHR_texture_basisu', 'KHR_texture_transform', 'VENDOR_unknown']) {
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
    { extensionsUsed: ['EXT_texture_webp'], materials: [{ extensions: { EXT_texture_webp: { source: 0 } } }] },
    { extensionsUsed: ['EXT_texture_webp'], textures: [{ extensions: { EXT_texture_webp: {} } }] },
    { extensionsUsed: ['KHR_draco_mesh_compression'], meshes: [{ primitives: [{ extensions: { KHR_draco_mesh_compression: { bufferView: 0 } } }] }] },
    { extensionsUsed: ['KHR_draco_mesh_compression'], meshes: [{ primitives: [{ extensions: { KHR_draco_mesh_compression: { bufferView: 0, attributes: { POSITION: -1 } } } }] }] },
  ]) expect(() => validate(document)).toThrow('GLB extension');
});
it('does not mistake arbitrary extras for renderer extension instructions', () => {
  const document = { extras: { extensions: { VENDOR_notes: { uri: 'https://example.com/reference' } } } };
  expect(validate(document).present).toEqual([]);
});
