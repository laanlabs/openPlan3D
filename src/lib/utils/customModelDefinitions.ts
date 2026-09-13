import { LOCAL_GLB_FILE_LIMIT } from './localGLB';
import { safePackagePath } from './projectPackageZip';

function fail(message: string): never { throw new Error(`Invalid custom model: ${message}`); }
const object = (value: any): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
function text(value: unknown, limit: number, name: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) fail(`Invalid ${name}.`);
}

/** Structural project validation, not model admission or renderer permission.
 * web.json transports definitions separately from its ZIP assets, so detached
 * definitions are readable; when asset storage exists its references must resolve.
 * Loading must verify the original bytes/hash and run all GLB admission checks. */
export function validateCustomModelDefinitions(value: unknown, assets?: Record<string, string>): Set<string> {
  const ids = new Set<string>();
  if (value === undefined) return ids;
  if (!Array.isArray(value) || value.length > 64) fail('Use at most 64 model definitions per project.');
  for (const model of value) {
    if (!object(model)) fail('A model definition must be an object.');
    text(model.id, 128, 'model ID'); text(model.name, 256, 'model name');
    if (!/^[A-Za-z0-9_-]+$/.test(model.id) || ids.has(model.id)) fail('Model IDs must be unique identifiers.');
    ids.add(model.id);
    text(model.sourceFilename, 256, 'source filename');
    if (typeof model.assetName !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}\.glb$/i.test(model.assetName) || !safePackagePath(model.assetName)) fail('Use a plain GLB attachment filename.');
    if (typeof model.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(model.sha256)) fail('Invalid source digest.');
    if (!Number.isSafeInteger(model.byteLength) || model.byteLength < 20 || model.byteLength > LOCAL_GLB_FILE_LIMIT) fail('Invalid source byte length.');
    for (const dimension of ['width', 'depth', 'height']) {
      if (typeof model[dimension] !== 'number' || !Number.isFinite(model[dimension]) || model[dimension] <= 0 || model[dimension] > 200_000_000) fail('Invalid model dimensions in centimeters.');
    }
    for (const [field, limit] of [['attribution', 2048], ['license', 256], ['sourceUrl', 2048]] as const) {
      if (model[field] !== undefined) text(model[field], limit, field);
    }
    if (model.sourceUrl !== undefined) {
      let url: URL;
      try { url = new URL(model.sourceUrl); } catch { fail('Invalid source URL.'); }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail('Use a public HTTP or HTTPS source URL.');
    }
    if (assets !== undefined) {
      const source = assets[`assets/${model.assetName}`];
      if (typeof source !== 'string') fail('The original model attachment is missing.');
      if (source.length !== Math.ceil(model.byteLength / 3) * 4) fail('The retained source length does not match its model definition.');
    }
  }
  return ids;
}
