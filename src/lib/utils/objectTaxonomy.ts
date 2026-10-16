import type { TranslationKey } from '$lib/i18n';
import { furnitureCatalog, type FurnitureDef } from './furnitureCatalog';
import { entourageCatalog, type EntourageDef } from './entourageCatalog';

export type ObjectGroupId = 'furniture' | 'outdoor' | 'electrical' | 'entourage';
export type ObjectSubcardSource = 'catalog' | 'entourage';

export interface ObjectSubcard {
  id: string;
  labelKey: TranslationKey;
  icon: string;
  group: ObjectGroupId;
  source: ObjectSubcardSource;
  itemIds: string[];
}

export interface ObjectRoom {
  id: string;
  labelKey: TranslationKey;
  icon: string;
  kind: 'subcards' | 'direct';
  /** Ordered sub-card ids. A 'direct' room holds exactly one sub-card shown flat. */
  subcards: string[];
}

const categoryIds = (category: string) => furnitureCatalog.filter(item => item.category === category).map(item => item.id);

export const objectGroups: { id: ObjectGroupId; labelKey: TranslationKey }[] = [
  { id: 'furniture', labelKey: 'objectGroups.furniture' },
  { id: 'outdoor', labelKey: 'objectGroups.outdoor' },
  { id: 'electrical', labelKey: 'objectGroups.electrical' },
  { id: 'entourage', labelKey: 'objectGroups.entourage' },
];

export const objectSubcards: ObjectSubcard[] = [
  { id: 'armchairs', labelKey: 'objectSubcards.armchairs', icon: '💺', group: 'furniture', source: 'catalog', itemIds: ['chair'] },
  { id: 'sofas', labelKey: 'objectSubcards.sofas', icon: '🛋️', group: 'furniture', source: 'catalog', itemIds: ['sofa', 'loveseat'] },
  { id: 'ottoman', labelKey: 'objectSubcards.ottoman', icon: '🛋️', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'storage', labelKey: 'objectSubcards.storage', icon: '🗄️', group: 'furniture', source: 'catalog', itemIds: ['bookshelf', 'tv_stand', 'storage'] },
  { id: 'lighting', labelKey: 'objectSubcards.lighting', icon: '💡', group: 'furniture', source: 'catalog', itemIds: ['ceiling_light', 'chandelier', 'recessed_light', 'floor_lamp', 'table_lamp', 'wall_sconce', 'pendant_light'] },
  { id: 'coffeeTables', labelKey: 'objectSubcards.coffeeTables', icon: '☕', group: 'furniture', source: 'catalog', itemIds: ['coffee_table'] },
  { id: 'diningTables', labelKey: 'objectSubcards.diningTables', icon: '🍽️', group: 'furniture', source: 'catalog', itemIds: ['dining_table'] },
  { id: 'chairs', labelKey: 'objectSubcards.chairs', icon: '🪑', group: 'furniture', source: 'catalog', itemIds: ['dining_chair'] },
  { id: 'tables', labelKey: 'objectSubcards.tables', icon: '🪑', group: 'furniture', source: 'catalog', itemIds: ['table', 'side_table'] },
  { id: 'tvMedia', labelKey: 'objectSubcards.tvMedia', icon: '📺', group: 'furniture', source: 'catalog', itemIds: ['television'] },
  { id: 'fireplaces', labelKey: 'objectSubcards.fireplaces', icon: '🔥', group: 'furniture', source: 'catalog', itemIds: ['fireplace'] },
  { id: 'hangingCabinets', labelKey: 'objectSubcards.hangingCabinets', icon: '🗄️', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'cabinets', labelKey: 'objectSubcards.cabinets', icon: '🗄️', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'kitchenSets', labelKey: 'objectSubcards.kitchenSets', icon: '🍽️', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'appliances', labelKey: 'objectSubcards.appliances', icon: '🍳', group: 'furniture', source: 'catalog', itemIds: ['stove', 'fridge', 'oven', 'dishwasher'] },
  { id: 'kitchenware', labelKey: 'objectSubcards.kitchenware', icon: '🍴', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'smallAppliances', labelKey: 'objectSubcards.smallAppliances', icon: '🔌', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'bar', labelKey: 'objectSubcards.bar', icon: '🍸', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'islands', labelKey: 'objectSubcards.islands', icon: '🔲', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'sinks', labelKey: 'objectSubcards.sinks', icon: '🚰', group: 'furniture', source: 'catalog', itemIds: ['sink_k'] },
  { id: 'countertops', labelKey: 'objectSubcards.countertops', icon: '🔲', group: 'furniture', source: 'catalog', itemIds: ['counter'] },
  { id: 'doubleBeds', labelKey: 'objectSubcards.doubleBeds', icon: '🛏️', group: 'furniture', source: 'catalog', itemIds: ['bed_queen'] },
  { id: 'singleBeds', labelKey: 'objectSubcards.singleBeds', icon: '🛏️', group: 'furniture', source: 'catalog', itemIds: ['bed_twin'] },
  { id: 'dressers', labelKey: 'objectSubcards.dressers', icon: '🗄️', group: 'furniture', source: 'catalog', itemIds: ['dresser'] },
  { id: 'stands', labelKey: 'objectSubcards.stands', icon: '🛏️', group: 'furniture', source: 'catalog', itemIds: ['nightstand'] },
  { id: 'mirrors', labelKey: 'objectSubcards.mirrors', icon: '🪞', group: 'furniture', source: 'catalog', itemIds: ['mirror'] },
  { id: 'wardrobes', labelKey: 'objectSubcards.wardrobes', icon: '🚪', group: 'furniture', source: 'catalog', itemIds: ['wardrobe'] },
  { id: 'childrensBeds', labelKey: 'objectSubcards.childrensBeds', icon: '🛏️', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'toys', labelKey: 'objectSubcards.toys', icon: '🧸', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'kidsStorage', labelKey: 'objectSubcards.kidsStorage', icon: '🧺', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'babyBeds', labelKey: 'objectSubcards.babyBeds', icon: '🛏️', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'toilets', labelKey: 'objectSubcards.toilets', icon: '🚽', group: 'furniture', source: 'catalog', itemIds: ['toilet'] },
  { id: 'washBasins', labelKey: 'objectSubcards.washBasins', icon: '🪥', group: 'furniture', source: 'catalog', itemIds: ['sink_b'] },
  { id: 'baths', labelKey: 'objectSubcards.baths', icon: '🛁', group: 'furniture', source: 'catalog', itemIds: ['bathtub'] },
  { id: 'showers', labelKey: 'objectSubcards.showers', icon: '🚿', group: 'furniture', source: 'catalog', itemIds: ['shower'] },
  { id: 'bathroomCabinets', labelKey: 'objectSubcards.bathroomCabinets', icon: '🗄️', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'shelving', labelKey: 'objectSubcards.shelving', icon: '🗄️', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'bathroomAccessories', labelKey: 'objectSubcards.bathroomAccessories', icon: '🧴', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'laundry', labelKey: 'objectSubcards.laundry', icon: '👕', group: 'furniture', source: 'catalog', itemIds: ['washer_dryer'] },
  { id: 'desks', labelKey: 'objectSubcards.desks', icon: '🖥️', group: 'furniture', source: 'catalog', itemIds: ['desk'] },
  { id: 'officeChairs', labelKey: 'objectSubcards.officeChairs', icon: '🪑', group: 'furniture', source: 'catalog', itemIds: ['office_chair'] },
  { id: 'officeSets', labelKey: 'objectSubcards.officeSets', icon: '🖥️', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'hangers', labelKey: 'objectSubcards.hangers', icon: '🧥', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'closetsWardrobes', labelKey: 'objectSubcards.closetsWardrobes', icon: '🚪', group: 'furniture', source: 'catalog', itemIds: ['wardrobe'] },
  { id: 'shoeStorage', labelKey: 'objectSubcards.shoeStorage', icon: '👟', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'shelves', labelKey: 'objectSubcards.shelves', icon: '📚', group: 'furniture', source: 'catalog', itemIds: ['bookshelf'] },
  { id: 'decor', labelKey: 'objectSubcards.decor', icon: '🪴', group: 'furniture', source: 'catalog', itemIds: ['rug', 'round_rug', 'runner_rug', 'potted_plant', 'floor_plant', 'hanging_plant', 'curtain', 'sheer_curtain', 'wall_art', 'mirror', 'clock'] },
  { id: 'gymEquipment', labelKey: 'objectSubcards.gymEquipment', icon: '🏋️', group: 'furniture', source: 'catalog', itemIds: [] },
  { id: 'landscaping', labelKey: 'objectSubcards.landscaping', icon: '🌳', group: 'outdoor', source: 'catalog', itemIds: categoryIds('Landscaping') },
  { id: 'fencing', labelKey: 'objectSubcards.fencing', icon: '🏗️', group: 'outdoor', source: 'catalog', itemIds: ['fence_simple', 'fence_planks', 'fence_gate', 'fence_corner', 'picket_fence', 'metal_fence'] },
  { id: 'outdoorFurniture', labelKey: 'objectSubcards.outdoorFurniture', icon: '🪑', group: 'outdoor', source: 'catalog', itemIds: ['patio_table', 'patio_chair', 'bench_outdoor', 'lounger', 'umbrella', 'bbq_grill', 'fire_pit', 'campfire', 'picnic_table', 'tent', 'outdoor_sign', 'outdoor_pot_large', 'outdoor_pot_small', 'raised_bed'] },
  { id: 'structures', labelKey: 'objectSubcards.structures', icon: '🏗️', group: 'outdoor', source: 'catalog', itemIds: ['pergola', 'deck_patio', 'raised_garden_bed', 'shed', 'gazebo', 'planter_box'] },
  { id: 'pathsLawns', labelKey: 'objectSubcards.pathsLawns', icon: '🟩', group: 'outdoor', source: 'catalog', itemIds: categoryIds('Paths & Lawns') },
  { id: 'outdoorLighting', labelKey: 'objectSubcards.outdoorLighting', icon: '🔦', group: 'outdoor', source: 'catalog', itemIds: categoryIds('Outdoor Lighting') },
  { id: 'gardenStructures', labelKey: 'objectSubcards.gardenStructures', icon: '🏡', group: 'outdoor', source: 'catalog', itemIds: categoryIds('Garden Structures') },
  { id: 'poolSpa', labelKey: 'objectSubcards.poolSpa', icon: '🏊', group: 'outdoor', source: 'catalog', itemIds: categoryIds('Pool & Spa') },
  { id: 'garage', labelKey: 'objectSubcards.garage', icon: '🚗', group: 'outdoor', source: 'catalog', itemIds: categoryIds('Garage') },
  { id: 'electrical', labelKey: 'objectSubcards.electrical', icon: '🔌', group: 'electrical', source: 'catalog', itemIds: categoryIds('Electrical') },
  { id: 'plumbing', labelKey: 'objectSubcards.plumbing', icon: '💧', group: 'electrical', source: 'catalog', itemIds: categoryIds('Plumbing') },
  { id: 'entourage', labelKey: 'objectSubcards.entourage', icon: '🚶', group: 'entourage', source: 'entourage', itemIds: ['person', 'people-pair'] },
  { id: 'vehicles', labelKey: 'objectSubcards.vehicles', icon: '🚗', group: 'entourage', source: 'entourage', itemIds: ['car-sedan', 'car-suv', 'car-pickup'] },
  { id: 'planting', labelKey: 'objectSubcards.planting', icon: '🌳', group: 'entourage', source: 'entourage', itemIds: ['tree-deciduous', 'tree-conifer', 'shrub', 'hedge', 'potted-plant', 'grass-tuft'] },
  { id: 'outdoorSymbol', labelKey: 'objectSubcards.outdoorSymbol', icon: '⛱️', group: 'entourage', source: 'entourage', itemIds: ['patio-umbrella'] },
];

export const objectRooms: ObjectRoom[] = [
  { id: 'livingRoom', labelKey: 'objectRooms.livingRoom', icon: '🛋️', kind: 'subcards', subcards: ['armchairs', 'sofas', 'ottoman', 'storage', 'lighting', 'coffeeTables', 'diningTables', 'chairs', 'tables', 'tvMedia', 'fireplaces'] },
  { id: 'bedroom', labelKey: 'objectRooms.bedroom', icon: '🛏️', kind: 'subcards', subcards: ['doubleBeds', 'singleBeds', 'dressers', 'stands', 'lighting', 'mirrors', 'wardrobes'] },
  { id: 'kitchen', labelKey: 'objectRooms.kitchen', icon: '🍳', kind: 'subcards', subcards: ['hangingCabinets', 'cabinets', 'kitchenSets', 'appliances', 'kitchenware', 'smallAppliances', 'bar', 'islands', 'sinks', 'countertops'] },
  { id: 'kidsRoom', labelKey: 'objectRooms.kidsRoom', icon: '🧸', kind: 'subcards', subcards: ['childrensBeds', 'toys', 'kidsStorage', 'babyBeds'] },
  { id: 'bathroom', labelKey: 'objectRooms.bathroom', icon: '🛁', kind: 'subcards', subcards: ['toilets', 'washBasins', 'baths', 'showers', 'bathroomCabinets', 'shelving', 'bathroomAccessories', 'laundry'] },
  { id: 'diningRoom', labelKey: 'objectRooms.diningRoom', icon: '🍽️', kind: 'subcards', subcards: ['diningTables', 'chairs', 'bar'] },
  { id: 'hallway', labelKey: 'objectRooms.hallway', icon: '🚪', kind: 'subcards', subcards: ['hangers', 'closetsWardrobes', 'dressers', 'shoeStorage', 'shelves'] },
  { id: 'office', labelKey: 'objectRooms.office', icon: '🖥️', kind: 'subcards', subcards: ['desks', 'officeChairs', 'officeSets'] },
  { id: 'decor', labelKey: 'objectRooms.decor', icon: '🪴', kind: 'direct', subcards: ['decor'] },
  { id: 'outdoor', labelKey: 'objectRooms.outdoor', icon: '🌳', kind: 'subcards', subcards: ['landscaping', 'fencing', 'outdoorFurniture', 'structures', 'pathsLawns', 'outdoorLighting', 'gardenStructures'] },
  { id: 'poolSpa', labelKey: 'objectRooms.poolSpa', icon: '🏊', kind: 'direct', subcards: ['poolSpa'] },
  { id: 'garage', labelKey: 'objectRooms.garage', icon: '🚗', kind: 'direct', subcards: ['garage'] },
  { id: 'gym', labelKey: 'objectRooms.gym', icon: '🏋️', kind: 'direct', subcards: ['gymEquipment'] },
];

export function getSubcard(id: string): ObjectSubcard | undefined {
  return objectSubcards.find(subcard => subcard.id === id);
}

export function subcardsForRoom(roomId: string): ObjectSubcard[] {
  const room = objectRooms.find(candidate => candidate.id === roomId);
  if (!room) return [];
  return room.subcards.map(getSubcard).filter((subcard): subcard is ObjectSubcard => subcard !== undefined);
}

export function catalogItemsForSubcard(subcard: ObjectSubcard): FurnitureDef[] {
  return subcard.itemIds.map(id => furnitureCatalog.find(item => item.id === id)).filter((item): item is FurnitureDef => item !== undefined);
}

export function entourageItemsForSubcard(subcard: ObjectSubcard): EntourageDef[] {
  return subcard.itemIds.map(id => entourageCatalog.find(def => def.id === id)).filter((def): def is EntourageDef => def !== undefined);
}

export function itemsForRoom(room: ObjectRoom): FurnitureDef[] {
  const subcard = getSubcard(room.subcards[0]);
  return subcard ? catalogItemsForSubcard(subcard) : [];
}

export function subcardHasItems(subcard: ObjectSubcard): boolean {
  return subcard.itemIds.length > 0;
}
