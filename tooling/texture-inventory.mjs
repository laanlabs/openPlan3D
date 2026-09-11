import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

/** Inventory local credit claims; this does not verify original source archives. */
export function textureInventory(root) {
  const creditsPath = 'static/textures/CREDITS.md';
  const credits = readFileSync(new URL(creditsPath, root), 'utf8');
  const mappings = readFileSync(new URL('src/lib/utils/textureGenerator.ts', root), 'utf8');
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
    const materialIds = [...mappings.matchAll(/'([^']+)': catalogAssetUrl\(`\/textures\/([^`]+)`\)/g)]
      .filter(match => match[2] === file).map(match => match[1]);
    return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
      materialIds, sourceAssetId, creditsPath, provenanceStatus: 'documented-locally-not-source-byte-verified' };
  });
  for (const file of records.keys()) {
    if (!files.includes(file)) throw new Error(`Credited texture is missing: ${file}`);
  }
  for (const match of mappings.matchAll(/catalogAssetUrl\(`\/textures\/([^`]+)`\)/g)) {
    if (!files.includes(match[1])) throw new Error(`Mapped texture is missing: ${match[1]}`);
  }
  return inventory;
}
