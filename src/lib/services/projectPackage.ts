import type { Project } from '$lib/models/types';
import { readProject } from '$lib/utils/projectValidation';
import { PACKAGE_LIMIT, jsonBytes, packageJSON, packageError, readPackageZip, writePackageZip, safePackagePath, crc32 } from '$lib/utils/projectPackageZip';
import { applyNativeEdits, nativeAssetNames, nativeToWeb, validatePackageMapping, validatePackagePlan, webToNative, type PackageMapping } from '$lib/utils/projectPackageBridge';
import { prepareLibraryRestore } from './libraryRestore';
import type { DetailKind } from '$lib/models/types';
import { upgradeLegacyFurnitureCategories } from '$lib/utils/legacyFurnitureCategories';

type PackageState = { version: 1; furnitureCategoriesVersion?: 1; native: Record<string, any>; mapping: PackageMapping; assets: Record<string, string> };
const docs = ['manifest.json', 'plan.json', 'web.json', 'baseline.json', 'mapping.json'];
const reservedAssets = new Set(['plan.json', 'room.json', 'room.usdz', 'session.json', 'manifest.json', 'info.json', 'thumbnail.jpg']);
function validateLocalImages(project: Project) {
  const images = [...project.floors.flatMap(f => f.backgroundImage ? [f.backgroundImage.dataUrl] : []), ...(project.customEntourage ?? []).map(item => item.dataUrl)];
  if (images.some(url => !/^data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/]*={0,2}$/.test(url))) {
    packageError('Project images must be embedded raster images. Download a JSON backup to preserve external image references.');
  }
}
export const PACKAGE_NOTICE = 'Photos, item notes and costs travel with this package and can be edited in Item details. Retained native metadata stays available on iPhone. The iPhone preview simplifies web-only features; their original data stays in the package for return to the web.';
const encode64 = (data: Uint8Array) => {
  let text = '';
  for (let i = 0; i < data.length; i += 0x8000) text += String.fromCharCode(...data.subarray(i, i + 0x8000));
  return btoa(text);
};
function decode64(value: string): Uint8Array {
  if (typeof value !== 'string' || value.length > PACKAGE_LIMIT * 4 / 3 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) packageError('Invalid attachment data.');
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}
function imageInfo(bytes: Uint8Array): { width: number; type: string } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) return { width: view.getUint32(16), type: 'image/png' };
  if (bytes.length >= 10 && String.fromCharCode(...bytes.subarray(0, 6)).match(/^GIF8[79]a$/)) return { width: view.getUint16(6, true), type: 'image/gif' };
  if (bytes.length >= 4 && view.getUint16(0) === 0xffd8) {
    let pos = 2;
    while (pos + 4 < bytes.length && bytes[pos] === 0xff) {
      const marker = bytes[pos + 1], length = view.getUint16(pos + 2);
      if (length < 2 || pos + 2 + length > bytes.length) return null;
      if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 7) return { width: view.getUint16(pos + 7), type: 'image/jpeg' };
      pos += length + 2;
    }
  }
  return null;
}
function underlayBackground(plan: Record<string, any>, assets: Record<string, Uint8Array>) {
  if (!plan.underlay) return undefined;
  const bytes = assets[`assets/${plan.underlay.imageFilename}`], info = bytes && imageInfo(bytes);
  if (!info || !info.width) return undefined;
  return { dataUrl: `data:${info.type};base64,${encode64(bytes)}`, position: { x: plan.underlay.center.x * 100, y: plan.underlay.center.y * 100 }, scale: plan.underlay.widthMeters * 100 / info.width, opacity: 0.4, rotation: (plan.underlay.angle ?? 0) * 180 / Math.PI, locked: true };
}
function readState(project: Project): PackageState | undefined {
  const state = (project as any).projectPackage;
  if (state === undefined) return undefined;
  if (!state || state.version !== 1 || !state.assets || typeof state.assets !== 'object' || Array.isArray(state.assets)) packageError('Unrecognized retained package data. Download a JSON backup to preserve it.');
  if (state.furnitureCategoriesVersion !== undefined && state.furnitureCategoriesVersion !== 1) packageError('Unsupported retained furniture-category version.');
  return { version: 1, furnitureCategoriesVersion: state.furnitureCategoriesVersion, native: validatePackagePlan(state.native), mapping: validatePackageMapping(state.mapping), assets: state.assets };
}
export function projectPackageBytes(value: Project): Uint8Array {
  const project = readProject(value), state = readState(project);
  if (state && state.furnitureCategoriesVersion === undefined && !upgradeLegacyFurnitureCategories(project, state.native, state.mapping)) {
    packageError('Legacy furniture identities could not be resolved. Download a JSON backup to preserve the retained data.');
  }
  validateLocalImages(project);
  delete (project as any).projectPackage;
  const { plan, mapping } = webToNative(project, state?.native, state?.mapping);
  const assets: Record<string, Uint8Array> = Object.create(null);
  let assetSize = 0;
  if (Object.keys(state?.assets ?? {}).length > 507) packageError('Too many attachments.');
  for (const [name, raw] of Object.entries(state?.assets ?? {})) {
    if (!name.startsWith('assets/') || !safePackagePath(name) || reservedAssets.has(name.slice(7).split('/')[0].toLowerCase())) packageError('Invalid retained attachment path.');
    assetSize += typeof raw === 'string' ? raw.length * 3 / 4 : PACKAGE_LIMIT;
    if (assetSize > PACKAGE_LIMIT) packageError('Attachments exceed 64 MiB.');
    assets[name] = decode64(raw);
  }
  // The native editor has one tracing image. Other floor images remain in web.json.
  const background = project.floors[0].backgroundImage;
  let underlayFloorId: string | undefined;
  if (background) {
    const match = /^data:(image\/(?:png|jpeg|gif));base64,(.*)$/.exec(background.dataUrl);
    const bytes = match && decode64(match[2]), info = bytes && imageInfo(bytes);
    if (bytes && info?.width) {
      const same = Object.entries(assets).find(([, stored]) => stored.length === bytes.length && stored.every((byte, i) => byte === bytes[i]));
      let filename = same?.[0].slice(7) ?? `web-underlay-${crc32(bytes).toString(16)}.${info.type.split('/')[1]}`;
      if (!same && assets[`assets/${filename}`]) filename = `web-underlay-${crypto.randomUUID()}.${info.type.split('/')[1]}`;
      assets[`assets/${filename}`] = bytes;
      plan.underlay = { imageFilename: filename, center: { x: background.position.x / 100, y: background.position.y / 100 }, widthMeters: background.scale * info.width / 100, angle: background.rotation !== 0 || plan.underlay?.angle != null ? background.rotation * Math.PI / 180 : undefined };
      underlayFloorId = project.floors[0].id;
    }
  }
  for (const filename of nativeAssetNames(plan)) if (!assets[`assets/${filename}`]) packageError(`Missing attachment: ${filename}.`);
  return writePackageZip({
    'manifest.json': jsonBytes({ format: 'openplan3d-project', version: 1, producer: 'web', title: project.name }),
    'plan.json': jsonBytes(plan), 'web.json': jsonBytes(project),
    'baseline.json': jsonBytes({ ...plan, openplanItemDetailsVersion: 1, openplanFurnitureCategoriesVersion: 1, openplanUnderlayFloorId: underlayFloorId, openplanAssetChecksums: Object.fromEntries(Object.entries(assets).map(([path, data]) => [path, crc32(data)])) }),
    'mapping.json': jsonBytes({ entries: mapping }), ...assets,
  });
}
export function readProjectPackage(bytes: Uint8Array): { project: Project; assets: number; warnings: string[] } {
  const files = readPackageZip(bytes), manifest = packageJSON(files['manifest.json']);
  if (manifest.format !== 'openplan3d-project' || manifest.version !== 1 || !['web', 'ios'].includes(manifest.producer) || typeof manifest.title !== 'string' || manifest.title.length > 1000) packageError('Unsupported manifest. Choose an OpenPlan3D project package, not a capture dataset or library backup.');
  for (const name of Object.keys(files)) if (!docs.includes(name) && (!name.startsWith('assets/') || reservedAssets.has(name.slice(7).split('/')[0].toLowerCase()))) packageError(`Unrecognized package file: ${name}.`);
  const plan = validatePackagePlan(packageJSON(files['plan.json']));
  const assets = Object.fromEntries(Object.entries(files).filter(([name]) => name.startsWith('assets/')));
  for (const filename of nativeAssetNames(plan)) if (!assets[`assets/${filename}`]) packageError(`Missing attachment: ${filename}.`);
  const hasWeb = !!files['web.json'];
  if (hasWeb !== !!files['baseline.json'] || hasWeb !== !!files['mapping.json'] || manifest.producer === 'web' && !hasWeb) packageError('The web return data is incomplete.');
  const mapping = hasWeb ? validatePackageMapping(packageJSON(files['mapping.json']).entries) : [];
  let project: Project;
  if (hasWeb) {
    const source = readProject(packageJSON(files['web.json']));
    validateLocalImages(source);
    if ((source as any).projectPackage !== undefined) packageError('Nested project packages are not supported.');
    const baseline = validatePackagePlan(packageJSON(files['baseline.json']));
    if (baseline.openplanItemDetailsVersion !== undefined && baseline.openplanItemDetailsVersion !== 1) packageError('Unsupported item-details baseline version.');
    if (baseline.openplanFurnitureCategoriesVersion !== undefined && baseline.openplanFurnitureCategoriesVersion !== 1) packageError('Unsupported furniture-category baseline version.');
    const before = nativeToWeb(baseline, mapping, manifest.title), after = nativeToWeb(plan, mapping, manifest.title);
    if (baseline.openplanFurnitureCategoriesVersion === undefined && !upgradeLegacyFurnitureCategories(source, baseline, mapping)) {
      packageError('Legacy furniture identities could not be resolved. Keep the original package for recovery.');
    }
    project = applyNativeEdits(source, before, after);
    // Older web releases retain unknown detail fields but cannot apply native
    // metadata edits to them. Their baseline has no detail-version marker, so
    // the current native plan is authoritative for the newly shared fields.
    if (baseline.openplanItemDetailsVersion !== 1) for (const floor of after.floors) {
      const target = project.floors.find(f => f.id === floor.id);
      if (!target) continue;
      for (const kind of ['walls', 'doors', 'windows', 'furniture', 'rooms'] as DetailKind[]) for (const item of floor[kind]) {
        const found = target[kind].find(i => i.id === item.id);
        if (found) found.details = { ...found.details, ...item.details };
      }
    }
    // Native movement/size changes to a shared underlay update its web placement;
    // unchanged native previews preserve exact web values; opacity and locking stay web-only.
    const underlayFloor = project.floors.find(f => f.id === baseline.openplanUnderlayFloorId);
    const assetPath = plan.underlay && `assets/${plan.underlay.imageFilename}`;
    const imageChanged = assetPath && baseline.openplanAssetChecksums?.[assetPath] !== crc32(assets[assetPath]);
    if (underlayFloor && (JSON.stringify(plan.underlay) !== JSON.stringify(baseline.underlay) || imageChanged)) {
      const background = underlayBackground(plan, assets);
      if (background) underlayFloor.backgroundImage = { ...(underlayFloor.backgroundImage ?? background), dataUrl: background.dataUrl, position: background.position, scale: background.scale, rotation: background.rotation };
      else if (!plan.underlay && baseline.underlay) delete underlayFloor.backgroundImage;
    }
  } else {
    project = nativeToWeb(plan, [], manifest.title);
    const background = underlayBackground(plan, assets);
    if (background) project.floors[0].backgroundImage = background;
  }
  project.name = manifest.title;
  // Rebuild identities for the current native plan, retaining source web IDs.
  const resolved = webToNative(project, plan, mapping);
  for (const filename of nativeAssetNames(resolved.plan)) if (!assets[`assets/${filename}`]) packageError(`Missing attachment: ${filename}.`);
  (project as any).projectPackage = { version: 1, furnitureCategoriesVersion: 1, native: plan, mapping: resolved.mapping, assets: Object.fromEntries(Object.entries(assets).map(([name, data]) => [name, encode64(data)])) } satisfies PackageState;
  return { project: readProject(project), assets: Object.keys(assets).length, warnings: [PACKAGE_NOTICE, ...(plan.underlay && !underlayBackground(plan, assets) ? ['The tracing image format is retained for iPhone but cannot be previewed here.'] : [])] };
}
export async function prepareProjectPackage(file: File) {
  if (file.size > PACKAGE_LIMIT) packageError('The package exceeds 64 MiB.');
  const bytes = new Uint8Array(await file.arrayBuffer()), preview = readProjectPackage(bytes);
  const restore = prepareLibraryRestore(JSON.stringify({ [preview.project.id]: JSON.stringify(preview.project) }), file.name, 'Imported copy');
  return { ...preview, restore: restore.restore, bytes };
}
export function downloadProjectPackage(project: Project) {
  const bytes = projectPackageBytes(project);
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' }));
  const link = document.createElement('a'); link.href = url; link.download = 'openplan3d-project.zip'; link.click(); URL.revokeObjectURL(url);
}
