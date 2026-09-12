import type { Project, DetailKind } from '$lib/models/types';
import { validateItemDetails, validateRetainedDetailState } from './itemDetails';
import { refreshLegacyFurnitureCategories } from './legacyFurnitureCategories';
import { validateCustomModelDefinitions } from './customModelDefinitions';

/** Read untrusted native files without mutating their input or the active editor. */
export function readProject(value: unknown): Project {
  const fail = (path: string, reason: string): never => { throw new Error(`Invalid project: ${path} ${reason}.`); };
  const record = (value: any, path: string): Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
    return value;
  };
  const text = (value: any, path: string, nonempty = false) => {
    if (typeof value !== 'string' || (nonempty && !value.trim())) fail(path, nonempty ? 'must be nonempty text' : 'must be text');
  };
  const number = (value: any, path: string, min = -Infinity, max = Infinity) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(path, 'must be a finite number in range');
  };
  const positive = (value: any, path: string) => {
    number(value, path);
    if (value <= 0) fail(path, 'must be greater than zero');
  };
  const point = (value: any, path: string) => {
    record(value, path); number(value.x, `${path}.x`); number(value.y, `${path}.y`);
  };
  const list = (owner: Record<string, any>, key: string, path: string, optional = true): any[] => {
    if (owner[key] === undefined && optional) owner[key] = [];
    if (!Array.isArray(owner[key])) fail(`${path}.${key}`, 'must be an array');
    return owner[key];
  };
  const defaults = (owner: Record<string, any>, values: Record<string, any>) => {
    for (const [key, fallback] of Object.entries(values)) if (owner[key] === undefined) owner[key] = fallback;
  };
  const strings = (owner: Record<string, any>, keys: string[], path: string) => {
    for (const key of keys) if (owner[key] !== undefined) text(owner[key], `${path}.${key}`);
  };
  const booleans = (owner: Record<string, any>, keys: string[], path: string) => {
    for (const key of keys) if (owner[key] !== undefined && typeof owner[key] !== 'boolean') fail(`${path}.${key}`, 'must be a boolean');
  };
  const choice = (value: any, allowed: string[], path: string) => {
    if (!allowed.includes(value)) fail(path, 'has an unsupported value');
  };
  const ids = (value: any, path: string) => {
    if (!Array.isArray(value)) fail(path, 'must be an array');
    for (const [i, id] of value.entries()) text(id, `${path}[${i}]`, true);
  };
  let project: Record<string, any>;
  try { project = structuredClone(record(value, 'document')); }
  catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid project:')) throw error;
    fail('document', 'could not be read');
  }
  text(project!.id, 'id', true);
  defaults(project!, { name: 'Untitled Project' });
  text(project!.name, 'name'); strings(project!, ['description'], 'document');
  if (project!.projectPackage !== undefined) validateRetainedDetailState(project!.projectPackage);
  const customModelIds = validateCustomModelDefinitions(project!.customModels, project!.projectPackage?.assets);
  if (project!.attachmentNames !== undefined) {
    record(project!.attachmentNames, 'attachmentNames');
    for (const [name, label] of Object.entries(project!.attachmentNames)) text(label, `attachmentNames.${name}`);
  }
  const floors = list(project!, 'floors', 'document', false);
  if (floors.length === 0) fail('floors', 'must contain at least one floor');
  const floorIds = new Set<string>();
  for (const [index, floor] of floors.entries()) {
    const path = `floors[${index}]`;
    record(floor, path); text(floor.id, `${path}.id`, true);
    if (floorIds.has(floor.id)) fail(`${path}.id`, 'duplicates another floor');
    floorIds.add(floor.id);
    defaults(floor, { name: index === 0 ? 'Ground Floor' : `Floor ${index}`, level: index });
    text(floor.name, `${path}.name`);
    if (!Number.isSafeInteger(floor.level)) fail(`${path}.level`, 'must be an integer');
    if (floor.elevation !== undefined) number(floor.elevation, `${path}.elevation`);
    if (floor.slabThickness !== undefined) positive(floor.slabThickness, `${path}.slabThickness`);
    const seen = new Set<string>();
    const elements = (key: string, validate: (item: Record<string, any>, path: string) => void, optional = true) => {
      for (const [i, item] of list(floor, key, path, optional).entries()) {
        const itemPath = `${path}.${key}[${i}]`;
        record(item, itemPath); text(item.id, `${itemPath}.id`, true);
        if (seen.has(item.id)) fail(`${itemPath}.id`, 'duplicates another element on this floor');
        seen.add(item.id); validate(item, itemPath);
        if (['walls', 'doors', 'windows', 'furniture', 'rooms'].includes(key) && item.details !== undefined) validateItemDetails(item.details, key as DetailKind);
      }
    };
    const positioned = (item: Record<string, any>, path: string) => {
      point(item.position, `${path}.position`); defaults(item, { rotation: 0 }); number(item.rotation, `${path}.rotation`);
    };
    elements('walls', (wall, path) => {
      point(wall.start, `${path}.start`); point(wall.end, `${path}.end`);
      positive(wall.thickness, `${path}.thickness`);
      for (const key of ['startHeight', 'endHeight']) if (wall[key] !== undefined) number(wall[key], `${path}.${key}`, 0);
      defaults(wall, { height: Math.max(wall.startHeight ?? 280, wall.endHeight ?? 280), color: '#444444' });
      number(wall.height, `${path}.height`, 0);
      if (wall.curvePoint !== undefined) point(wall.curvePoint, `${path}.curvePoint`);
      strings(wall, ['color', 'texture', 'interiorColor', 'interiorTexture', 'exteriorColor', 'exteriorTexture'], path);
    }, false);
    const walls = new Set<string>(floor.walls.map((wall: any) => wall.id));
    for (const kind of ['doors', 'windows']) elements(kind, (opening, path) => {
      text(opening.wallId, `${path}.wallId`, true);
      if (!walls.has(opening.wallId)) fail(`${path}.wallId`, 'must refer to a wall on the same floor');
      number(opening.position, `${path}.position`, 0, 1); positive(opening.width, `${path}.width`);
      defaults(opening, kind === 'doors' ? { height: 210, type: 'single', swingDirection: 'left', flipSide: false } : { height: 120, type: 'standard', sillHeight: 90 });
      positive(opening.height, `${path}.height`);
      if (kind === 'doors') {
        choice(opening.type, ['single', 'double', 'sliding', 'french', 'pocket', 'bifold', 'opening', 'garage'], `${path}.type`);
        choice(opening.swingDirection, ['left', 'right'], `${path}.swingDirection`);
        booleans(opening, ['flipSide'], path);
      } else {
        choice(opening.type, ['standard', 'fixed', 'casement', 'sliding', 'bay'], `${path}.type`);
        number(opening.sillHeight, `${path}.sillHeight`, 0);
      }
    });
    elements('furniture', (item, path) => {
      if (item.customModelId !== undefined && (typeof item.customModelId !== 'string' || !customModelIds.has(item.customModelId))) fail(`${path}.customModelId`, 'must refer to a model in this project');
      text(item.catalogId, `${path}.catalogId`, true); positioned(item, path);
      defaults(item, { scale: { x: 1, y: 1, z: 1 } }); record(item.scale, `${path}.scale`);
      // Mirroring uses negative scale. Do not normalize signs or round dimensions.
      for (const key of ['x', 'y', 'z']) number(item.scale[key], `${path}.scale.${key}`);
      for (const key of ['width', 'depth', 'height']) if (item[key] !== undefined) positive(item[key], `${path}.${key}`);
      strings(item, ['color', 'material', 'sourceCategory'], path); booleans(item, ['locked'], path);
    });
    elements('stairs', (item, path) => {
      positioned(item, path); positive(item.width, `${path}.width`); positive(item.depth, `${path}.depth`);
      if (!Number.isSafeInteger(item.riserCount) || item.riserCount < 1) fail(`${path}.riserCount`, 'must be a positive integer');
      defaults(item, { stairType: 'straight', direction: 'up' });
      choice(item.stairType, ['straight', 'l-shaped', 'u-shaped', 'spiral'], `${path}.stairType`); choice(item.direction, ['up', 'down'], `${path}.direction`);
    });
    elements('columns', (item, path) => {
      positioned(item, path); positive(item.diameter, `${path}.diameter`); number(item.height, `${path}.height`, 0);
      choice(item.shape, ['round', 'square'], `${path}.shape`); defaults(item, { color: '#cccccc' }); text(item.color, `${path}.color`);
    });
    elements('rooms', (item, path) => {
      booleans(item, ['floorOpening'], path);
      // Saved room/group memberships may outlive deleted walls/objects. Preserve metadata.
      ids(item.walls, `${path}.walls`); defaults(item, { name: '', floorTexture: 'light-oak', area: 0 });
      strings(item, ['name', 'floorTexture', 'color', 'roomType'], path); number(item.area, `${path}.area`, 0);
      if (item.labelOffset !== undefined) point(item.labelOffset, `${path}.labelOffset`);
    });
    elements('guides', (item, path) => {
      choice(item.orientation, ['horizontal', 'vertical'], `${path}.orientation`); number(item.position, `${path}.position`);
    });
    for (const key of ['measurements', 'annotations']) elements(key, (item, path) => {
      for (const key of ['x1', 'y1', 'x2', 'y2']) number(item[key], `${path}.${key}`);
      if (key === 'annotations') { defaults(item, { offset: 40 }); number(item.offset, `${path}.offset`); strings(item, ['label'], path); }
    });
    elements('textAnnotations', (item, path) => {
      number(item.x, `${path}.x`); number(item.y, `${path}.y`); text(item.text, `${path}.text`);
      defaults(item, { fontSize: 16, color: '#1e293b', rotation: 0 });
      positive(item.fontSize, `${path}.fontSize`); number(item.rotation, `${path}.rotation`); text(item.color, `${path}.color`);
    });
    elements('groups', (item, path) => { ids(item.elementIds, `${path}.elementIds`); });
    // Avoid adding optional attachment arrays to otherwise unchanged current files.
    if (floor.entourage !== undefined) elements('entourage', (item, path) => {
      text(item.defId, `${path}.defId`, true); positioned(item, path); positive(item.width, `${path}.width`);
      if (item.opacity !== undefined) number(item.opacity, `${path}.opacity`, 0, 1);
      booleans(item, ['locked'], path);
    });
    if (floor.backgroundImage !== undefined) {
      const bg = record(floor.backgroundImage, `${path}.backgroundImage`), bgPath = `${path}.backgroundImage`;
      text(bg.dataUrl, `${bgPath}.dataUrl`, true); positioned(bg, bgPath); positive(bg.scale, `${bgPath}.scale`);
      defaults(bg, { opacity: 0.4, locked: false }); number(bg.opacity, `${bgPath}.opacity`, 0, 1); booleans(bg, ['locked'], bgPath);
    }
  }
  if (project!.activeFloorId !== undefined) text(project!.activeFloorId, 'activeFloorId');
  if (!floorIds.has(project!.activeFloorId)) project!.activeFloorId = floors[0].id;
  if (project!.customEntourage !== undefined) {
    const seen = new Set<string>();
    for (const [i, item] of list(project!, 'customEntourage', 'document').entries()) {
      const path = `customEntourage[${i}]`; record(item, path); text(item.id, `${path}.id`, true);
      if (seen.has(item.id)) fail(`${path}.id`, 'duplicates another custom symbol');
      seen.add(item.id); text(item.name, `${path}.name`); text(item.dataUrl, `${path}.dataUrl`, true); positive(item.aspect, `${path}.aspect`);
    }
  }
  for (const key of ['createdAt', 'updatedAt']) {
    const value = project![key];
    if (value !== undefined && !(value instanceof Date) && typeof value !== 'string') fail(key, 'must be a date');
    const date = value === undefined ? new Date(0) : new Date(value);
    if (!Number.isFinite(date.getTime())) fail(key, 'must be a valid date');
    project![key] = date;
  }
  refreshLegacyFurnitureCategories(project! as Project);
  return project! as Project;
}
