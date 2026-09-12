import type { CustomModelDef, Project } from '$lib/models/types';
import { LOCAL_GLB_FILE_LIMIT } from '$lib/utils/localGLB';
import { validateCustomModelDefinitions } from '$lib/utils/customModelDefinitions';
import { readProject } from '$lib/utils/projectValidation';
import { webToNative } from '$lib/utils/projectPackageBridge';
import type { StoredSnapshot } from '$lib/utils/snapshotStorage';
import { loadLocalGLBModel } from './customModelLoader';
import { photoStorageBytes, PHOTO_PROJECT_BUDGET } from './itemPhotos';

type LoadedModel = Awaited<ReturnType<typeof loadLocalGLBModel>>;
export type PreparedCustomModel = LoadedModel & { readonly sourceFilename: string };
export type CustomModelMetadata = Pick<CustomModelDef, 'name' | 'attribution' | 'license' | 'sourceUrl'>;
// Admission reads private immutable source data, never the editable preview scene.
const sources = new WeakMap<PreparedCustomModel, { data: string; definition: CustomModelDef }>();
function canceled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Model import was canceled.', 'AbortError');
}

/** Validate and decode a local file for preview. Caller owns/disposes the result.
 * Disposing also invalidates admission; original bytes stay private until attach. */
export async function prepareCustomModel(file: File, signal?: AbortSignal): Promise<PreparedCustomModel> {
  canceled(signal);
  if (!/\.glb$/i.test(file.name) || !file.size || file.size > LOCAL_GLB_FILE_LIMIT) throw new Error('Choose a GLB file up to 16 MiB.');
  if (file.name.length > 256) throw new Error('Use a model filename of at most 256 characters.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  canceled(signal);
  if (bytes.length !== file.size) throw new Error('The model file changed while reading.');
  if (!globalThis.crypto?.subtle) throw new Error('This browser cannot verify local model files.');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.buffer));
  canceled(signal);
  const sha256 = [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const loaded = await loadLocalGLBModel(bytes, signal);
  try {
    canceled(signal);
    const definition: CustomModelDef = { id: `model-${sha256}`, assetName: `model-${sha256}.glb`,
      name: file.name.replace(/\.glb$/i, '').trim() || 'Model', sourceFilename: file.name,
      sha256, byteLength: bytes.length, width: loaded.dimensions.width * 100,
      depth: loaded.dimensions.depth * 100, height: loaded.dimensions.height * 100 };
    if (Math.min(definition.width, definition.depth, definition.height) <= 0) throw new Error('Furniture models need nonzero width, depth and height. Export a solid model.');
    validateCustomModelDefinitions([definition]);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    const prepared: PreparedCustomModel = { ...loaded, sourceFilename: file.name,
      dispose() { sources.delete(prepared); loaded.dispose(); } };
    sources.set(prepared, { data: btoa(binary), definition });
    return prepared;
  } catch (error) { loaded.dispose(); throw error; }
}

/** Pure admission against the latest project/history. Commit the returned project
 * through the editor's atomic save/undo transaction; this function does not save.
 * Identical source imports reuse the existing definition and its metadata. */
export function attachCustomModel(project: Project, prepared: PreparedCustomModel,
  metadata: CustomModelMetadata, history: StoredSnapshot[], estimate?: { usage?: number; quota?: number }) {
  const source = sources.get(prepared);
  if (!source) throw new Error('This model preview has expired. Choose the file again.');
  const definition = { ...source.definition, name: metadata.name,
    attribution: metadata.attribution, license: metadata.license, sourceUrl: metadata.sourceUrl };
  validateCustomModelDefinitions([definition]);
  const next = readProject(project);
  const existing = next.customModels?.find(model => model.sha256 === definition.sha256);
  if (existing) {
    if (next.projectPackage?.assets[`assets/${existing.assetName}`] !== source.data) throw new Error('The existing model source is missing or damaged.');
    return { project: next, model: structuredClone(existing), reused: true };
  }
  if (next.customModels?.some(model => model.id === definition.id)) throw new Error('A different model has the same identifier.');
  if (!next.projectPackage) {
    const { plan, mapping } = webToNative(next, undefined);
    next.projectPackage = { version: 1, native: plan, mapping, assets: {} };
  }
  const assets = next.projectPackage.assets;
  const reused = Object.entries(assets).find(([path, data]) => /^assets\/[A-Za-z0-9][A-Za-z0-9._-]{0,159}\.glb$/i.test(path) && data === source.data)?.[0];
  if (reused) definition.assetName = reused.slice(7);
  const path = `assets/${definition.assetName}`;
  if (assets[path] !== undefined && assets[path] !== source.data) throw new Error('A different attachment has the same filename.');
  if (assets[path] === undefined && Object.keys(assets).length >= 507) throw new Error('This project already has the maximum number of attachments.');
  assets[path] = source.data;
  next.customModels = [...(next.customModels ?? []), definition];
  next.attachmentNames = { ...next.attachmentNames, [definition.assetName]: next.attachmentNames?.[definition.assetName] ?? definition.sourceFilename };
  validateCustomModelDefinitions(next.customModels, assets);
  const size = photoStorageBytes(next, history);
  if (size > PHOTO_PROJECT_BUDGET) throw new Error('This model would exceed the 64 MiB project and saved-version budget. Export a backup and remove unused attachments.');
  if (Number.isFinite(estimate?.quota) && Number.isFinite(estimate?.usage) &&
    Math.max(0, size - photoStorageBytes(project, history)) > Math.max(0, estimate!.quota! - estimate!.usage!)) {
    throw new Error('Browser storage has too little space for this model and its saved versions.');
  }
  return { project: next, model: structuredClone(definition), reused: false };
}
