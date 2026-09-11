import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { wallTextureFiles, floorTextureFiles } from '../src/lib/utils/textureFiles.ts';

/** Inventory local credit claims; this does not verify original source archives. */
export function textureInventory(root) {
  const creditsPath = 'static/textures/CREDITS.md';
  const credits = readFileSync(new URL(creditsPath, root), 'utf8');
  const mappings = [...Object.entries(wallTextureFiles), ...Object.entries(floorTextureFiles)];
  const records = new Map();
  for (const match of credits.matchAll(/^- `([^`]+)` — ([A-Za-z0-9]+) \(1K Color\)$/gm)) {
    if (records.has(match[1])) throw new Error(`Duplicate texture credit: ${match[1]}`);
    records.set(match[1], match[2]);
  }
  const files = readdirSync(new URL('static/textures/', root)).filter(file => /\.(webp|png|jpe?g)$/i.test(file)).sort();
  const inventory = files.map(file => {
    const sourceAssetId = records.get(file);
    if (!sourceAssetId) throw new Error(`Missing texture credit: ${file}`);
    const path = `static/textures/${file}`, bytes = readFileSync(new URL(path, root));
    const materialIds = mappings.filter(([, mappedFile]) => mappedFile === file).map(([id]) => id);
    return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
      materialIds, sourceAssetId, creditsPath, provenanceStatus: 'documented-locally-not-source-byte-verified' };
  });
  for (const file of records.keys()) {
    if (!files.includes(file)) throw new Error(`Credited texture is missing: ${file}`);
  }
  for (const [, file] of mappings) {
    if (!files.includes(file)) throw new Error(`Mapped texture is missing: ${file}`);
  }
  return inventory;
}
