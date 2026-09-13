import type { TranslationKey } from './index';

// Stored category identifiers remain unchanged.
export const catalogCategoryLabels: Record<string, TranslationKey> = {
  "Living Room": "catalogCategories.living",
  "Bedroom": "catalogCategories.bedroom",
  "Kitchen": "catalogCategories.kitchen",
  "Bathroom": "catalogCategories.bathroom",
  "Office": "catalogCategories.office",
  "Dining": "catalogCategories.dining",
  "Decor": "catalogCategories.decor",
  "Lighting": "catalogCategories.lighting",
  "Outdoor Furniture": "catalogCategories.outdoorFurniture",
  "Landscaping": "catalogCategories.landscaping",
  "Fencing": "catalogCategories.fencing",
  "Structures": "catalogCategories.structures",
  "Electrical": "catalogCategories.electrical",
  "Plumbing": "catalogCategories.plumbing",
  "Garage": "catalogCategories.garage",
  "Garden Structures": "catalogCategories.gardenStructures",
  "Imported": "catalogCategories.imported",
  "Outdoor Lighting": "catalogCategories.outdoorLighting",
  "Paths & Lawns": "catalogCategories.pathsLawns",
  "Pool & Spa": "catalogCategories.poolSpa"
};

export function normalizeCatalogSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
