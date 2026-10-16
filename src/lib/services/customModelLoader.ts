import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { base } from '$app/paths';
import type { Project } from '$lib/models/types';
import { readLocalGLB, LOCAL_GLB_FILE_LIMIT } from '$lib/utils/localGLB';
import { validateLocalGLBExtensions } from '$lib/utils/localGLBExtensions';
import { validateLocalGLBMaterials } from '$lib/utils/localGLBMaterials';
import { validateLocalGLBGeometry } from '$lib/utils/localGLBGeometry';
import { repackLocalGLBGeometry } from '$lib/utils/localGLBRepack';
import { decodeLocalGLBImages } from '$lib/utils/localGLBImages';
import { readCustomModelSource } from './customModelSource';

function canceled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Model import was canceled.', 'AbortError');
}
function staticScene(document: Record<string, any>) {
  for (const field of ['animations', 'skins', 'cameras']) {
    if (document[field] !== undefined && (!Array.isArray(document[field]) || document[field].length)) throw new Error(`Local furniture import does not support ${field} yet. Export a static mesh.`);
  }
  for (const node of document.nodes) {
    if (node.skin !== undefined || node.camera !== undefined) throw new Error('Export static furniture without skins or cameras.');
    if (node.rotation && Math.abs(Math.hypot(...node.rotation) - 1) > 0.001) throw new Error('A model rotation is not a unit quaternion.');
    if (node.matrix && [3, 7, 11, 15].some((index, i) => node.matrix[index] !== (i === 3 ? 1 : 0))) throw new Error('A model transform is not affine.');
    if (node.weights !== undefined) {
      const count = document.meshes[node.mesh]?.primitives[0].targets?.length ?? 0;
      if (!Array.isArray(node.weights) || node.weights.length !== count || node.weights.some((value: unknown) => typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Invalid model morph weights.');
    }
  }
}

/** Load the supported static furniture profile into an owned, disposable scene.
 * No remote resources are permitted. Dimensions are meters; placement converts
 * to centimeters. The caller must retain this owner while using its bitmaps. */
export async function loadLocalGLBModel(input: Uint8Array, signal?: AbortSignal) {
  canceled(signal);
  if (input.length > LOCAL_GLB_FILE_LIMIT) throw new Error('Choose a GLB file up to 16 MiB.');
  const rawBytes = input.slice();
  const container = readLocalGLB(rawBytes);
  validateLocalGLBExtensions(container.document);
  validateLocalGLBMaterials(container);
  // Draco accessors carry no raw buffer view; repacking them would produce zeroed
  // geometry. Hand the original container to the loader with a decoder instead.
  const usesDraco = Array.isArray(container.document.extensionsUsed) && container.document.extensionsUsed.includes('KHR_draco_mesh_compression');
  const prepared = usesDraco ? (validateLocalGLBGeometry(container), rawBytes.buffer) : repackLocalGLBGeometry(container);
  staticScene(container.document);
  canceled(signal);
  const images = await decodeLocalGLBImages(container, signal);
  const textures = new Set<THREE.Texture>(), geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  let gltf: GLTF | undefined, disposed = false, dracoLoader: DRACOLoader | undefined;
  function collect() {
    for (const scene of gltf?.scenes ?? []) scene.traverse(object => {
      const renderable = object as THREE.Mesh;
      if (renderable.geometry) geometries.add(renderable.geometry);
      if (renderable.material) for (const material of Array.isArray(renderable.material) ? renderable.material : [renderable.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    });
  }
  const dispose = () => {
    if (disposed) return;
    disposed = true; collect();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    images.dispose();
    dracoLoader?.dispose(); dracoLoader = undefined;
  };
  try {
    canceled(signal);
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(() => { throw new Error('Model loading attempted an external resource.'); });
    const loader = new GLTFLoader(manager);
    if (usesDraco) {
      dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(`${base}/draco/`);
      loader.setDRACOLoader(dracoLoader);
    }
    /** Build a texture from an already-decoded embedded ImageBitmap. */
    function buildTexture(parser: any, index: number, sourceIndex: number) {
      const definition = container.document.textures[index];
      const sampler = container.document.samplers?.[definition.sampler] ?? {};
      const texture = new THREE.Texture(images.images[sourceIndex]);
      textures.add(texture);
      texture.flipY = false;
      const wrapping: Record<number, THREE.Wrapping> = { 33071: THREE.ClampToEdgeWrapping, 33648: THREE.MirroredRepeatWrapping, 10497: THREE.RepeatWrapping };
      const filtering = { 9728: THREE.NearestFilter, 9729: THREE.LinearFilter, 9984: THREE.NearestMipmapNearestFilter,
        9985: THREE.LinearMipmapNearestFilter, 9986: THREE.NearestMipmapLinearFilter, 9987: THREE.LinearMipmapLinearFilter };
      texture.wrapS = wrapping[sampler.wrapS] ?? THREE.RepeatWrapping;
      texture.wrapT = wrapping[sampler.wrapT] ?? THREE.RepeatWrapping;
      texture.magFilter = sampler.magFilter === 9728 ? THREE.NearestFilter : THREE.LinearFilter;
      texture.minFilter = filtering[sampler.minFilter as keyof typeof filtering] ?? THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = texture.minFilter !== THREE.NearestFilter && texture.minFilter !== THREE.LinearFilter;
      texture.needsUpdate = true;
      parser.associations.set(texture, { textures: index });
      return texture;
    }
    loader.register(parser => ({
      name: 'OPENPLAN_embedded_images',
      loadTexture: async (index: number) => buildTexture(parser, index, container.document.textures[index].source),
    }));
    // EXT_texture_webp keeps the image source in the extension. Register under the
    // same name as three's built-in handler so ours replaces it; the built-in path
    // would fetch a blob URL and trip the external-resource guard above.
    loader.register(parser => ({
      name: 'EXT_texture_webp',
      loadTexture: (index: number) => {
        const extension = container.document.textures[index]?.extensions?.EXT_texture_webp;
        return extension ? Promise.resolve(buildTexture(parser, index, extension.source)) : null;
      },
    }));
    gltf = await loader.parseAsync(prepared, '');
    dracoLoader?.dispose(); dracoLoader = undefined;
    canceled(signal); collect();
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(object => {
      if (object.matrixWorld.elements.some(value => !Number.isFinite(value))) throw new Error('Model transforms produce non-finite geometry.');
    });
    const bounds = new THREE.Box3().setFromObject(gltf.scene, true), size = bounds.getSize(new THREE.Vector3());
    if (bounds.isEmpty() || [...bounds.min.toArray(), ...bounds.max.toArray()].some(value => !Number.isFinite(value) || Math.abs(value) > 1_000_000) || Math.max(size.x, size.y, size.z) <= 0) throw new Error('Model bounds are empty or outside the supported range.');
    return { scene: gltf.scene, bounds, dimensions: { width: size.x, depth: size.z, height: size.y }, dispose };
  } catch (error) {
    dispose(); throw error;
  }
}

export async function loadCustomModel(project: Project, id: string, signal?: AbortSignal) {
  const source = await readCustomModelSource(project, id, signal);
  return { ...await loadLocalGLBModel(source.bytes, signal), definition: source.model };
}
