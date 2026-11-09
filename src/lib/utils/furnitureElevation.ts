import type { FurnitureItem } from '$lib/models/types';
import { getFurnitureSize } from './furnitureCatalog';

/** Largest accepted height above the floor, in cm (100 m). */
export const MAX_FURNITURE_ELEVATION = 10_000;
/** Placed furniture rests this far above the floor plane so it does not z-fight the floor (cm). */
export const FURNITURE_FLOOR_OFFSET = 1.5;

/**
 * Bottom heights (cm above the floor, for a given physical height) of the decor and lighting
 * items whose procedural models used to hang themselves from fixed points on a 260 cm ceiling
 * or a wall. Their geometry is now built from zero and lifted by this default, so items saved
 * without `elevation` render where they always did.
 */
const MOUNTED: Record<string, (height: number) => number> = {
  wall_art: () => 120,
  mirror: () => 100,
  clock: () => 140,
  wall_sconce: height => 180 - height / 2,
  ceiling_light: height => 260 - height,
  chandelier: height => 260 - height,
  recessed_light: height => 260 - height,
  pendant_light: height => 200 - height,
};

/**
 * Offset built into a procedural model's geometry before normalisation. The television's
 * fallback hung at 80 cm while its bundled GLB stands on the floor; the GLB's floor position
 * remains the default, so its fallback now matches it.
 */
export function proceduralMountOffset(catalogId: string, height: number): number {
  if (catalogId === 'television') return 80;
  return MOUNTED[catalogId]?.(height) ?? 0;
}

/** Elevation used when an item has none saved: 0 except for the wall and ceiling items above. */
export function defaultFurnitureElevation(item: Pick<FurnitureItem, 'catalogId' | 'customModelId' | 'height' | 'scale'>): number {
  // A project model is fitted with its bottom on the floor whatever its fallback catalog id.
  if (item.customModelId) return 0;
  const mounted = MOUNTED[item.catalogId];
  return mounted ? Math.max(0, mounted(getFurnitureSize(item as FurnitureItem).height)) : 0;
}

/** Height of the item's bottom above its floor, in cm. */
export function furnitureElevation(item: Pick<FurnitureItem, 'catalogId' | 'customModelId' | 'height' | 'scale' | 'elevation'>): number {
  return isValidFurnitureElevation(item.elevation) ? item.elevation : defaultFurnitureElevation(item);
}

/** World Y (cm, relative to its floor) of the placed model's origin, which sits at the model's bottom. */
export function placedFurnitureY(item: Pick<FurnitureItem, 'catalogId' | 'customModelId' | 'height' | 'scale' | 'elevation'>): number {
  return FURNITURE_FLOOR_OFFSET + furnitureElevation(item);
}

export function isValidFurnitureElevation(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_FURNITURE_ELEVATION;
}

/** The stored form of an edited elevation: omitted when it equals the item's default. */
export function storedFurnitureElevation(item: Pick<FurnitureItem, 'catalogId' | 'customModelId' | 'height' | 'scale'>, value: number): number | undefined {
  return value === defaultFurnitureElevation(item) ? undefined : value;
}
