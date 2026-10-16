import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { readLocalGLB } from '$lib/utils/localGLB';
import { validateLocalGLBExtensions } from '$lib/utils/localGLBExtensions';
import { validateLocalGLBResources } from '$lib/utils/localGLBResources';
import { validateLocalGLBMaterials } from '$lib/utils/localGLBMaterials';
import { validateLocalGLBGeometry } from '$lib/utils/localGLBGeometry';
import { photoHeader } from '$lib/utils/rasterHeader';

// Synthetic fixture generated from the repository's own textured box with
// `gltf-transform webp` then `gltf-transform draco` (WebP textures + Draco mesh).
const bytes = new Uint8Array(readFileSync('tests/fixtures/local-model-draco-webp-box.glb'));

it('validates a Draco + WebP GLB through the pre-load gate', () => {
  const container = readLocalGLB(bytes.slice());
  const extensions = validateLocalGLBExtensions(container.document);
  expect(extensions.required).toEqual(['EXT_texture_webp', 'KHR_draco_mesh_compression']);
  expect(extensions.present).toEqual(['EXT_texture_webp', 'KHR_draco_mesh_compression']);

  const resources = validateLocalGLBResources(container);
  expect(resources.imageHeaders).toHaveLength(1);
  expect(resources.imageHeaders[0].mime).toBe('image/webp');
  expect(resources.imageHeaders[0].width).toBe(32);
  expect(resources.imageHeaders[0].height).toBe(24);

  const materials = validateLocalGLBMaterials(container);
  expect(materials.textures).toBe(1);
  expect(materials.materialUVs).toEqual([[0]]);

  // Draco accessors carry no raw buffer view; geometry validation still bounds
  // the scene by declared counts and must not reject them.
  expect(() => validateLocalGLBGeometry(container)).not.toThrow();
});

it('reads WebP dimensions from the embedded image header', () => {
  const container = readLocalGLB(bytes.slice());
  const view = container.document.bufferViews[container.document.images[0].bufferView];
  const image = container.binary!.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  expect(photoHeader(image)).toEqual({ width: 32, height: 24, mime: 'image/webp' });
});
