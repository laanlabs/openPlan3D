import type { FurnitureItem, PackageMapping, Project } from '$lib/models/types';
import { furnitureCatalog } from './furnitureCatalog';
import { importedFurnitureCategory } from './furnitureCategories';

const originalCatalogIds = new Set(furnitureCatalog.map(item => item.id));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const mappingKinds = new Set(['levels', 'walls', 'doors', 'windows', 'furniture', 'rooms', 'textAnnotations']);

/** Repair only the old non-catalog → chair projection. Preflight identities and
 * source categories before changing anything; ambiguous retained data stays intact.
 * This uses source width for bed presentation, never an edited web footprint.
 * No native geometry, attachment decoding or new project/UUID creation is needed. */
export function upgradeLegacyFurnitureCategories(project: Project, native: Record<string, any>, mapping: PackageMapping): boolean {
  if (!Array.isArray(native.furniture) || native.furniture.length > 5000 || !Array.isArray(mapping) || mapping.length > 5000) return false;
  const sources = new Map<string, { category: string; width: number }>();
  for (const item of native.furniture) {
    if (!item || typeof item.id !== 'string' || !uuid.test(item.id) || sources.has(item.id.toLowerCase()) ||
      typeof item.category !== 'string' || typeof item.width !== 'number' || !Number.isFinite(item.width) || item.width <= 0 || item.width > 10_000) return false;
    sources.set(item.id.toLowerCase(), item);
  }
  const ids = new Set<string>(), targets = new Set<string>();
  const byId = new Map<string, { floorId: string; item: FurnitureItem }[]>();
  for (const floor of project.floors) for (const item of floor.furniture) {
    const matches = byId.get(item.id) ?? [];
    matches.push({ floorId: floor.id, item }); byId.set(item.id, matches);
  }
  const updates: { item: FurnitureItem; category: Pick<FurnitureItem, 'catalogId' | 'sourceCategory'> }[] = [];
  const claimed = new Set<FurnitureItem>();
  for (const entry of mapping) {
    if (!entry || typeof entry.id !== 'string' || !uuid.test(entry.id) || !mappingKinds.has(entry.kind) ||
      typeof entry.webId !== 'string' || !entry.webId || entry.kind !== 'levels' && (typeof entry.floorId !== 'string' || !entry.floorId)) return false;
    const key = entry.id.toLowerCase(), target = JSON.stringify([entry.floorId, entry.kind, entry.webId]);
    if (ids.has(key) || targets.has(target)) return false;
    ids.add(key); targets.add(target);
    if (entry.kind !== 'furniture') continue;
    const matches = byId.get(entry.webId) ?? [];
    const item = matches.find(match => match.floorId === entry.floorId)?.item ?? (matches.length === 1 ? matches[0].item : undefined);
    // No unique destination after a floor move: do not guess or mark it upgraded.
    if (!item && matches.length > 1) return false;
    if (!item) continue; // Deleted web item; do not resurrect it.
    if (claimed.has(item)) return false;
    claimed.add(item);
    const source = sources.get(key);
    if (!source) return false;
    if (item.catalogId === 'chair' && !originalCatalogIds.has(source.category)) {
      // Match the native projection's metre → centimetre rounding at 140 cm.
      const width = Math.round(source.width * 1e10) / 1e8;
      updates.push({ item, category: importedFurnitureCategory(source.category, width) });
    }
  }
  for (const { item, category } of updates) {
    item.catalogId = category.catalogId;
    if (category.sourceCategory !== undefined) item.sourceCategory = category.sourceCategory;
  }
  return true;
}

/** Called only on readProject's validated clone. Raw library/history records and
 * unsupported versions remain available unchanged for recovery. */
export function refreshLegacyFurnitureCategories(project: Project) {
  const state = project.projectPackage;
  if (!state || state.version !== 1 || state.furnitureCategoriesVersion !== undefined || !state.mapping.some(entry => entry.kind === 'furniture')) return;
  if (upgradeLegacyFurnitureCategories(project, state.native, state.mapping)) state.furnitureCategoriesVersion = 1;
}
