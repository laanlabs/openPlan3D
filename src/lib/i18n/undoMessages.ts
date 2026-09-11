import { translate, type Locale, type TranslationKey } from './index';

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
];
const messages = new Map(keys.map(key => [translate('en', key), key]));

/** Display-only translation: keep unknown descriptions and stored history intact. */
export function undoMessage(description: string, language: Locale): string {
  const key = messages.get(description);
  return key ? translate(language, key) : description;
}
