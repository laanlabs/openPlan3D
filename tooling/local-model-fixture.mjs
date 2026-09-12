import { BoxGeometry } from 'three';
import { readFile, writeFile } from 'node:fs/promises';

// Generated geometry: 1 m wide, 0.5 m high, 0.75 m deep. Reuses the existing
// repository test image; this asset is for import integration tests, not catalog distribution.
const geometry = new BoxGeometry(1, 0.5, 0.75);
const parts = [], bufferViews = [];
let byteLength = 0;
function append(bytes) {
  const index = bufferViews.length;
  bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length });
  parts.push(bytes); byteLength += bytes.length;
  const padding = (4 - byteLength % 4) % 4;
  parts.push(Buffer.alloc(padding)); byteLength += padding;
  return index;
}
function attribute(name) {
  const array = geometry.getAttribute(name).array;
  return append(Buffer.from(array.buffer, array.byteOffset, array.byteLength));
}
const positions = attribute('position'), normals = attribute('normal'), uvs = attribute('uv');
const indexArray = geometry.index.array;
const indices = append(Buffer.from(indexArray.buffer, indexArray.byteOffset, indexArray.byteLength));
const image = append(await readFile('tests/fixtures/item-photo.png'));
const document = {
  asset: { version: '2.0', generator: 'OpenPlan3D local model fixture generator' },
  buffers: [{ byteLength }], bufferViews,
  accessors: [
    { bufferView: positions, componentType: 5126, type: 'VEC3', count: 24, min: [-0.5, -0.25, -0.375], max: [0.5, 0.25, 0.375] },
    { bufferView: normals, componentType: 5126, type: 'VEC3', count: 24 },
    { bufferView: uvs, componentType: 5126, type: 'VEC2', count: 24 },
    { bufferView: indices, componentType: 5123, type: 'SCALAR', count: 36 },
  ],
  images: [{ bufferView: image, mimeType: 'image/png' }], textures: [{ source: 0 }],
  materials: [{ name: 'Fixture finish', pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 0.7, baseColorTexture: { index: 0 } } }],
  meshes: [{ name: 'Textured fixture box', primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
  nodes: [{ mesh: 0, translation: [0, 0.25, 0] }], scenes: [{ nodes: [0] }], scene: 0,
};
const jsonBytes = Buffer.from(JSON.stringify(document)), jsonLength = Math.ceil(jsonBytes.length / 4) * 4;
const json = Buffer.alloc(jsonLength, 0x20); jsonBytes.copy(json);
const binary = Buffer.concat(parts);
const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + binary.length, 8);
function chunkHeader(length, type) { const value = Buffer.alloc(8); value.writeUInt32LE(length); value.writeUInt32LE(type, 4); return value; }
await writeFile('tests/fixtures/local-model-textured-box.glb', Buffer.concat([
  header, chunkHeader(json.length, 0x4e4f534a), json, chunkHeader(binary.length, 0x004e4942), binary,
]));
geometry.dispose();
console.log('Generated tests/fixtures/local-model-textured-box.glb');
