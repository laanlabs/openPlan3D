import { expect, it } from 'vitest';
import { furnitureCatalog } from '$lib/utils/furnitureCatalog';
import { entourageCatalog } from '$lib/utils/entourageCatalog';
import {
  objectGroups, objectSubcards, objectRooms, getSubcard, subcardsForRoom,
  catalogItemsForSubcard, entourageItemsForSubcard, itemsForDirectRoom, subcardHasItems,
} from '$lib/utils/objectTaxonomy';

const catalogIds = new Set(furnitureCatalog.map(item => item.id));
const entourageIds = new Set(entourageCatalog.map(def => def.id));
const groupIds = new Set(objectGroups.map(group => group.id));

it('covers every catalog item in at least one sub-card', () => {
  const covered = new Set(objectSubcards.flatMap(subcard => subcard.itemIds));
  for (const id of catalogIds) expect(covered.has(id), `uncovered catalog id: ${id}`).toBe(true);
});

it('references only known ids and known groups', () => {
  for (const subcard of objectSubcards) {
    expect(groupIds.has(subcard.group), subcard.id).toBe(true);
    const known = subcard.source === 'catalog' ? catalogIds : entourageIds;
    for (const id of subcard.itemIds) expect(known.has(id), `${subcard.id} -> ${id}`).toBe(true);
    expect(new Set(subcard.itemIds).size, subcard.id).toBe(subcard.itemIds.length);
  }
});

it('resolves every room sub-card reference', () => {
  for (const room of objectRooms) {
    expect(room.subcards.length).toBeGreaterThan(0);
    for (const id of room.subcards) expect(getSubcard(id), `${room.id} -> ${id}`).toBeDefined();
  }
});

it('moves raised_bed from Structures to Outdoor furniture', () => {
  expect(getSubcard('outdoorFurniture')!.itemIds).toContain('raised_bed');
  expect(getSubcard('structures')!.itemIds).not.toContain('raised_bed');
});

it('orders the Living Room sub-cards as specified', () => {
  expect(subcardsForRoom('livingRoom').map(subcard => subcard.id)).toEqual([
    'armchairs', 'sofas', 'ottoman', 'storage', 'lighting', 'coffeeTables',
    'diningTables', 'chairs', 'tables', 'tvMedia', 'fireplaces',
  ]);
});

it('exposes helpers over the taxonomy', () => {
  expect(catalogItemsForSubcard(getSubcard('sofas')!).map(item => item.id)).toEqual(['sofa', 'loveseat']);
  expect(entourageItemsForSubcard(getSubcard('vehicles')!).map(def => def.id)).toEqual(['car-sedan', 'car-suv', 'car-pickup']);
  expect(subcardHasItems(getSubcard('ottoman')!)).toBe(false);
  expect(subcardHasItems(getSubcard('appliances')!)).toBe(true);
  const decor = objectRooms.find(room => room.id === 'decor')!;
  expect(itemsForDirectRoom(decor).map(item => item.id)).toContain('rug');
  expect(itemsForDirectRoom(decor).every(item => item.category === 'Decor')).toBe(true);
});
