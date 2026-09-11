import { translate, type Locale, type TranslationKey } from './index';
import type { Door, Window, Column } from '$lib/models/types';

const keys: Extract<TranslationKey, `undoAction.${string}`>[] = [
  'undoAction.edit',
  'undoAction.group',
  'undoAction.current',
  'undoAction.customEntourage',
  'undoAction.entourage',
  'undoAction.floor',
  'undoAction.stair',
  'undoAction.wall',
  'undoAction.elevation',
  'undoAction.slab',
  'undoAction.deleteElement',
  'undoAction.deleteFurniture',
  'undoAction.deleteRoom',
  'undoAction.deleteWall',
  'undoAction.duplicate',
  'undoAction.importFloor',
  'undoAction.moveFurniture',
  'undoAction.paste',
  'undoAction.removeFloor',
  'undoAction.resizeWall',
  'undoAction.reverseWall',
  'undoAction.rotateFurniture',
  'undoAction.rotateSelection',
  'undoAction.split',
  'undoAction.placeFurniture',
  'undoAction.moveRoomLabel',
  'undoAction.resizeFurniture',
  'undoAction.moveGeometry',
  'undoAction.elevationDoor',
  'undoAction.elevationWindow',
  'undoAction.distribute',
  'undoAction.align',
  'undoAction.roomTemplate',
  'undoAction.front',
  'undoAction.back',
  'undoAction.itemDetails',
  'undoAction.itemPhoto',
  'undoAction.reusePhoto',
  'undoAction.deleteAttachment',
  'undoAction.lock',
  'undoAction.unlock',
];
const messages = new Map(keys.map(key => [translate('en', key), key]));

const doorTypes = {
  single: 'openingCatalog.single', double: 'openingCatalog.double',
  sliding: 'openingCatalog.sliding', french: 'openingCatalog.french',
  pocket: 'openingCatalog.pocket', bifold: 'openingCatalog.bifold',
  opening: 'openingCatalog.doorway', garage: 'openingCatalog.garage',
} satisfies Record<Door['type'], TranslationKey>;
const windowTypes = {
  standard: 'openingCatalog.standard', fixed: 'openingCatalog.fixed',
  casement: 'openingCatalog.casement', sliding: 'openingCatalog.sliding',
  bay: 'openingCatalog.bay',
} satisfies Record<Window['type'], TranslationKey>;
const columnTypes = {
  round: 'columnProperties.round', square: 'columnProperties.square',
} satisfies Record<Column['shape'], TranslationKey>;
const typedMessages = new Map<string, { action: TranslationKey; type: TranslationKey }>();
for (const [kind, types, action] of [
  ['door', doorTypes, 'undoAction.addDoor'],
  ['window', windowTypes, 'undoAction.addWindow'],
  ['column', columnTypes, 'undoAction.addColumn'],
] as const) {
  for (const [type, key] of Object.entries(types)) {
    typedMessages.set(`Added ${type} ${kind}`, { action, type: key });
  }
}

/** Display-only translation: keep unknown descriptions and stored history intact. */
export function undoMessage(description: string, language: Locale): string {
  const key = messages.get(description);
  if (key) return translate(language, key);
  const typed = typedMessages.get(description);
  if (typed && language !== 'en') {
    return translate(language, typed.action, { type: translate(language, typed.type) });
  }
  return description;
}
