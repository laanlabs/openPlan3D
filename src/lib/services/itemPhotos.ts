import { photoHeader } from '$lib/utils/rasterHeader';
export { photoHeader } from '$lib/utils/rasterHeader';
import type { DetailTarget, Project, Room } from '$lib/models/types';
import { detailItem, itemDetails } from '$lib/utils/itemDetails';
import { nativeAssetNames, webToNative } from '$lib/utils/projectPackageBridge';
import { readProject } from '$lib/utils/projectValidation';
import { writeSnapshotStorage, type StoredSnapshot } from '$lib/utils/snapshotStorage';

export const PHOTO_FILE_LIMIT = 8 * 1024 * 1024;
export const PHOTO_STORED_LIMIT = 512 * 1024;
export const PHOTO_PIXEL_LIMIT = 24_000_000;
export const PHOTO_PROJECT_BUDGET = 64 * 1024 * 1024;
export type PreparedPhoto = { name: string; data: string; label?: string };
function fail(message: string): never { throw new Error(message); }
function smallEnough(info: ReturnType<typeof photoHeader>) {
  return info && info.width > 0 && info.height > 0 && info.width <= 12_000 && info.height <= 12_000 && info.width * info.height <= PHOTO_PIXEL_LIMIT;
}
const base64 = (bytes: Uint8Array) => {
  let value = '';
  for (let i = 0; i < bytes.length; i += 0x8000) value += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(value);
};

/** Decode only bounded local raster bytes. Larger inputs become optimized JPEG
 * copies; already small photos retain their exact bytes for attachment reuse. */
export async function prepareItemPhoto(file: File): Promise<PreparedPhoto> {
  if (!file.size || file.size > PHOTO_FILE_LIMIT) fail('Choose a JPG or PNG photo under 8 MiB.');
  let bytes = new Uint8Array(await file.arrayBuffer());
  const info = photoHeader(bytes);
  if (!smallEnough(info)) fail('Choose a readable JPG or PNG photo up to 24 megapixels.');
  let mime = info!.mime;
  const url = URL.createObjectURL(new Blob([bytes], { type: mime })), image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (!smallEnough({ width: image.naturalWidth, height: image.naturalHeight, mime })) fail('This photo is too large to decode safely.');
    if (bytes.length > PHOTO_STORED_LIMIT || Math.max(image.naturalWidth, image.naturalHeight) > 1600) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) fail('Photo resizing is unavailable. Choose a smaller photo.');
      let scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      for (let attempt = 0; attempt < 8; attempt++) {
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        context!.fillStyle = '#ffffff'; context!.fillRect(0, 0, canvas.width, canvas.height);
        context!.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
        if (!blob) fail('This photo could not be resized. Try a different file.');
        bytes = new Uint8Array(await blob!.arrayBuffer()); mime = 'image/jpeg';
        if (bytes.length <= PHOTO_STORED_LIMIT) break;
        scale *= 0.75;
      }
      if (bytes.length > PHOTO_STORED_LIMIT) fail('The resized photo is still too large. Choose a smaller photo.');
    }
  } catch (error) {
    if (error instanceof Error && error.name !== 'EncodingError') throw error;
    fail('This photo could not be decoded. Choose a different JPG or PNG.');
  } finally { image.src = ''; URL.revokeObjectURL(url); }
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hash = [...digest].map(b => b.toString(16).padStart(2, '0')).join('');
  const extension = mime === 'image/png' ? 'png' : 'jpg';
  return { name: `photo-${hash}.${extension}`, data: base64(bytes), label: `${file.name.replace(/\.[^.]*$/, '').slice(0, 180) || 'Photo'}.${extension}` };
}

export function attachItemPhoto(project: Project, target: DetailTarget, photo: PreparedPhoto, detectedRoom?: Room): Project {
  if (!['furniture', 'rooms'].includes(target.kind)) fail('This item does not support photos.');
  const next = readProject(project);
  if (target.kind === 'rooms' && !detailItem(next, target) && detectedRoom?.id === target.id) {
    next.floors.find(f => f.id === target.floorId)?.rooms.push(structuredClone(detectedRoom));
  }
  const item = detailItem(next, target);
  if (!item) fail('The selected item changed. Select it again before adding a photo.');
  if (!next.projectPackage) {
    const { plan, mapping } = webToNative(next, undefined);
    next.projectPackage = { version: 1, native: plan, mapping, assets: {} };
  }
  const assets = next.projectPackage.assets;
  const reused = Object.entries(assets).find(([, data]) => data === photo.data)?.[0];
  const name = reused?.slice(7) ?? photo.name;
  if (!reused && assets[`assets/${name}`] !== undefined && assets[`assets/${name}`] !== photo.data) fail('A different attachment has the same filename. Choose the photo again.');
  if (!reused && Object.keys(assets).length >= 507) fail('This project already has the maximum number of attachments.');
  item!.details = { ...itemDetails(next, target), photos: [...new Set([...(itemDetails(next, target).photos ?? []), name])] };
  assets[`assets/${name}`] = photo.data;
  if (photo.label && !next.attachmentNames?.[name]) next.attachmentNames = { ...next.attachmentNames, [name]: photo.label };
  return next;
}

/** Historical copies share bytes internally. Include both current history and
 * ten future versions when admitting photos; actual saves remain atomic. */
export function photoStorageBytes(project: Project, history: StoredSnapshot[] = []): number {
  const data = JSON.stringify(project), current = { data, timestamp: 0, description: 'Photo storage estimate' };
  const bytes = (text: string) => new TextEncoder().encode(text).length;
  return bytes(data) + Math.max(bytes(writeSnapshotStorage([...history, current].slice(-10))),
    bytes(writeSnapshotStorage(Array.from({ length: 10 }, () => current))));
}
export function checkPhotoStorage(before: Project, after: Project, history: StoredSnapshot[], estimate?: { usage?: number; quota?: number }) {
  const size = photoStorageBytes(after, history);
  if (size > PHOTO_PROJECT_BUDGET) fail('This project and its saved versions would exceed the 64 MiB photo budget. Export a backup, then remove unused attachments or use smaller photos.');
  if (typeof estimate?.quota === 'number' && typeof estimate.usage === 'number' &&
      Math.max(0, size - photoStorageBytes(before, history)) > Math.max(0, estimate.quota - estimate.usage)) {
    fail('Browser storage has too little space for this photo and its saved versions. Export a backup and free space, then try again.');
  }
}

export function usedPhotoNames(project: Project): Set<string> {
  const state = project.projectPackage;
  if (!state) return new Set();
  const names = new Set(nativeAssetNames(webToNative(project, state.native, state.mapping).plan));
  for (const model of project.customModels ?? []) names.add(model.assetName);
  const embedded = new Set([...project.floors.map(f => f.backgroundImage?.dataUrl), ...(project.customEntourage ?? []).map(item => item.dataUrl)]
    .filter((url): url is string => !!url).map(url => url.slice(url.indexOf(',') + 1)));
  const referencedBytes = new Set([...names].map(name => state.assets[`assets/${name}`]));
  for (const [path, bytes] of Object.entries(state.assets)) if (embedded.has(bytes) && !referencedBytes.has(bytes)) names.add(path.slice(7));
  return names;
}
export function deleteUnusedPhoto(project: Project, name: string): Project {
  if (project.customModels?.some(model => model.assetName === name)) fail('This attachment is still used by a custom model. Remove its model definition first.');
  if (usedPhotoNames(project).has(name)) fail('This attachment is still used by an item or tracing image. Remove those references first.');
  const next = readProject(project), state = next.projectPackage;
  if (!state || !Object.hasOwn(state.assets, `assets/${name}`)) fail('This attachment is no longer available.');
  delete state.assets[`assets/${name}`];
  if (next.attachmentNames) delete next.attachmentNames[name];
  // Old recognized references must not restore a deliberately deleted file.
  for (const item of [...(state.native.furniture ?? []), ...(state.native.rooms ?? [])]) if (item.photos) item.photos = item.photos.filter((photo: string) => photo !== name);
  return next;
}

export function photoPreview(data: string | undefined): string | undefined {
  if (!data || data.length > PHOTO_FILE_LIMIT * 4 / 3) return;
  try {
    const head = Uint8Array.from(atob(data.slice(0, 262144)), char => char.charCodeAt(0));
    const info = photoHeader(head);
    return smallEnough(info) ? `data:${info!.mime};base64,${data}` : undefined;
  } catch { return; }
}
export function downloadPhoto(name: string, data: string) {
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  const link = document.createElement('a'); link.href = url; link.download = name.split('/').at(-1)!; link.click(); URL.revokeObjectURL(url);
}
