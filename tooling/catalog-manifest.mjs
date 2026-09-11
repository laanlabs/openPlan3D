import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { furnitureCatalog } from '../src/lib/utils/furnitureCatalog.ts';
import { getModelFile } from '../src/lib/utils/furnitureModelFiles.ts';

const root = new URL('../', import.meta.url);
const output = new URL('docs/furniture-manifest.json', root);
const ids = new Set(), models = new Map();
const items = furnitureCatalog.map(item => {
  if (ids.has(item.id)) throw new Error(`Duplicate catalog ID: ${item.id}`);
  ids.add(item.id);
  for (const key of ['width', 'depth', 'height']) {
    if (!Number.isFinite(item[key]) || item[key] < 0 || (item[key] === 0 && !(item.symbol && key === 'height'))) throw new Error(`Invalid ${key}: ${item.id}`);
  }
  const model = getModelFile(item.id);
  if (model && !models.has(model)) {
    const path = `static/models/${model}.glb`;
    const bytes = readFileSync(new URL(path, root));
    if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF' ||
        bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length ||
        bytes.readUInt32LE(16) !== 0x4e4f534a || bytes.readUInt32LE(12) > bytes.length - 20) {
      throw new Error(`Invalid GLB header: ${path}`);
    }
    const asset = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()).asset ?? {};
    models.set(model, {
      path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
      embeddedGenerator: asset.generator ?? null, embeddedCopyright: asset.copyright ?? null,
      provenanceStatus: 'unverified',
    });
  }
  return {
    id: item.id, name: item.name, category: item.category,
    dimensionsCm: { width: item.width, depth: item.depth, height: item.height },
    dimensionStatus: 'catalog-defaults-not-product-measurements',
    webRepresentation: item.symbol ? '2d-symbol' : model ? 'glb-with-procedural-fallback' : 'procedural',
    model: model ?? null,
  };
});
const manifest = {
  format: 'openplan3d-furniture-inventory', version: 1,
  catalogSource: 'src/lib/utils/furnitureCatalog.ts',
  modelMappingSource: 'src/lib/utils/furnitureModelFiles.ts',
  modelPlacement: 'Runtime fits catalog dimensions, centers the footprint and places the bottom at zero; see furnitureModelLoader.ts.',
  nativeSupport: 'Not certified by this inventory; native package preservation and visual support require separate validation.',
  provenanceNote: 'Embedded metadata is recorded verbatim, not verified attribution or a license determination. Asset provenance remains open.',
  items, models: Object.fromEntries([...models].sort(([a], [b]) => a.localeCompare(b, 'en'))),
};
const text = JSON.stringify(manifest, null, 2) + '\n';
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) throw new Error('Usage: node tooling/catalog-manifest.mjs [--check]');
if (args[0] === '--check') {
  if (readFileSync(output, 'utf8') !== text) throw new Error('Furniture inventory is stale; run npm run catalog:manifest.');
  console.log(`Verified ${items.length} catalog entries and ${models.size} mapped GLBs.`);
} else {
  writeFileSync(output, text);
  console.log(`Wrote ${fileURLToPath(output)} (${items.length} entries, ${models.size} mapped GLBs).`);
}
