import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { readLocalGLB } from '$lib/utils/localGLB';
import { validateLocalGLBExtensions } from '$lib/utils/localGLBExtensions';
import { validateLocalGLBMaterials } from '$lib/utils/localGLBMaterials';
import { validateLocalGLBGeometry } from '$lib/utils/localGLBGeometry';
import { repackLocalGLBGeometry } from '$lib/utils/localGLBRepack';

it('validates a complete textured model and preserves its embedded image through repacking', () => {
  const source = new Uint8Array(readFileSync('tests/fixtures/local-model-textured-box.glb'));
  const original = source.slice(), container = readLocalGLB(source);
  expect(validateLocalGLBExtensions(container.document).present).toEqual([]);
  expect(validateLocalGLBMaterials(container)).toEqual({ materials: 1, textures: 1, materialUVs: [[0]] });
  const geometry = validateLocalGLBGeometry(container);
  expect(geometry.scene.scenes[0]).toEqual({ nodes: 1, primitives: 1, vertices: 36 });
  expect(geometry.meshes[0][0].bounds).toEqual({ min: [-0.5, -0.25, -0.375], max: [0.5, 0.25, 0.375] });
  expect(container.document.nodes[0].translation).toEqual([0, 0.25, 0]);
  const repacked = readLocalGLB(new Uint8Array(repackLocalGLBGeometry(container)));
  expect(validateLocalGLBGeometry(repacked)).toEqual(geometry);
  expect(validateLocalGLBMaterials(repacked)).toEqual(validateLocalGLBMaterials(container));
  const view = repacked.document.bufferViews[repacked.document.images[0].bufferView];
  expect(repacked.binary!.slice(view.byteOffset, view.byteOffset + view.byteLength)).toEqual(new Uint8Array(readFileSync('tests/fixtures/item-photo.png')));
  expect(source).toEqual(original);
});
