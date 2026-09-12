import type { Project } from '$lib/models/types';
import { validateCustomModelDefinitions } from '$lib/utils/customModelDefinitions';
import { readLocalGLB } from '$lib/utils/localGLB';

function checkCanceled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Model import was canceled.', 'AbortError');
}

/** Resolve immutable original bytes from project attachments. No URL is fetched.
 * Hash/container verification does not replace geometry, material, extension,
 * scene or texture admission checks in the loading pipeline. */
export async function readCustomModelSource(project: Project, id: string, signal?: AbortSignal) {
  checkCanceled(signal);
  validateCustomModelDefinitions(project.customModels, project.projectPackage?.assets);
  const definition = project.customModels?.find(model => model.id === id);
  if (!definition) throw new Error('This custom model is no longer defined in the project.');
  // A project may change while hashing. Return metadata matching the captured bytes.
  const model = structuredClone(definition);
  const encoded = project.projectPackage?.assets[`assets/${model.assetName}`];
  if (typeof encoded !== 'string') throw new Error('The original model attachment is missing.');
  if (encoded.length !== Math.ceil(model.byteLength / 3) * 4) throw new Error('The retained model byte length does not match its definition.');
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  const body = encoded.slice(0, encoded.length - padding);
  if (/[^A-Za-z0-9+/]/.test(body) || encoded.length / 4 * 3 - padding !== model.byteLength) throw new Error('The retained model is not valid base64 data.');
  let decoded: string;
  try { decoded = atob(encoded); } catch { throw new Error('The retained model is not valid base64 data.'); }
  if (decoded.length !== model.byteLength) throw new Error('The decoded model byte length does not match its definition.');
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index);
  checkCanceled(signal);
  if (!globalThis.crypto?.subtle) throw new Error('This browser cannot verify local model files.');
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer);
  checkCanceled(signal);
  const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  if (sha256 !== model.sha256) throw new Error('The original model attachment has changed or is damaged.');
  const container = readLocalGLB(bytes);
  return { model, bytes, container };
}
