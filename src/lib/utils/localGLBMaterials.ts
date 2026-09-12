import type { readLocalGLB } from './localGLB';
import { validateLocalGLBResources } from './localGLBResources';

function fail(message: string): never { throw new Error(`Invalid GLB material: ${message}`); }
const record = (value: any): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
function table(value: unknown, limit: number, name: string): Record<string, any>[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > limit || value.some(item => !record(item))) fail(`Invalid ${name} table.`);
  return value;
}
function reference(value: unknown, length: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) >= length) fail(`Invalid ${name} reference.`);
  return value as number;
}
function number(value: unknown, min: number, max: number, name: string) {
  if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)) fail(`Invalid ${name}.`);
}
function vector(value: unknown, length: number, name: string) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length !== length) fail(`Invalid ${name}.`);
  for (const component of value) {
    if (component === undefined) fail(`Invalid ${name}.`);
    number(component, 0, 1, name);
  }
}
function enumeration(value: unknown, values: readonly unknown[], name: string) {
  if (value !== undefined && !values.includes(value)) fail(`Invalid ${name}.`);
}

/** Check core metallic/roughness materials and their embedded texture references.
 * Extension policy and actual image decoding remain separate import gates. */
export function validateLocalGLBMaterials(container: ReturnType<typeof readLocalGLB>) {
  const resources = validateLocalGLBResources(container);
  const { document } = container;
  const samplers = table(document.samplers, 64, 'sampler');
  const textures = table(document.textures, 64, 'texture');
  const materials = table(document.materials, 256, 'material');
  samplers.forEach(sampler => {
    enumeration(sampler.magFilter, [9728, 9729], 'magnification filter');
    enumeration(sampler.minFilter, [9728, 9729, 9984, 9985, 9986, 9987], 'minification filter');
    enumeration(sampler.wrapS, [33071, 33648, 10497], 'horizontal wrapping');
    enumeration(sampler.wrapT, [33071, 33648, 10497], 'vertical wrapping');
  });
  textures.forEach(texture => {
    reference(texture.source, resources.imageHeaders.length, 'image');
    if (texture.sampler !== undefined) reference(texture.sampler, samplers.length, 'sampler');
  });
  const materialUVs = materials.map(material => {
    const coordinates = new Set<number>();
    function textureInfo(value: unknown) {
      if (value === undefined) return;
      if (!record(value)) fail('Invalid texture info.');
      reference(value.index, textures.length, 'texture');
      const channel = value.texCoord === undefined ? 0 : value.texCoord;
      if (!Number.isInteger(channel) || channel < 0 || channel > 3) fail('Use texture coordinate sets 0 through 3.');
      coordinates.add(channel);
    }
    if (material.pbrMetallicRoughness !== undefined && !record(material.pbrMetallicRoughness)) fail('Invalid metallic/roughness material.');
    const pbr = material.pbrMetallicRoughness || {};
    vector(pbr.baseColorFactor, 4, 'base color factor');
    number(pbr.metallicFactor, 0, 1, 'metallic factor');
    number(pbr.roughnessFactor, 0, 1, 'roughness factor');
    textureInfo(pbr.baseColorTexture); textureInfo(pbr.metallicRoughnessTexture);
    textureInfo(material.normalTexture); textureInfo(material.occlusionTexture); textureInfo(material.emissiveTexture);
    vector(material.emissiveFactor, 3, 'emissive factor');
    number(material.normalTexture?.scale, -3.4028234663852886e38, 3.4028234663852886e38, 'normal scale');
    number(material.occlusionTexture?.strength, 0, 1, 'occlusion strength');
    enumeration(material.alphaMode, ['OPAQUE', 'MASK', 'BLEND'], 'alpha mode');
    number(material.alphaCutoff, 0, 3.4028234663852886e38, 'alpha cutoff');
    if (material.doubleSided !== undefined && typeof material.doubleSided !== 'boolean') fail('Invalid double-sided flag.');
    return [...coordinates];
  });
  for (const mesh of table(document.meshes, 256, 'mesh')) {
    for (const primitive of table(mesh.primitives, 128, 'primitive')) {
      if (primitive.material === undefined) continue;
      const id = reference(primitive.material, materials.length, 'material');
      for (const channel of materialUVs[id]) {
        if (!record(primitive.attributes) || primitive.attributes[`TEXCOORD_${channel}`] === undefined) fail('A textured primitive is missing its texture coordinates.');
      }
    }
  }
  return { materials: materials.length, textures: textures.length, materialUVs };
}
