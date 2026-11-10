/** Shared format recognition for file imports and link admission. */

/**
 * Metres, compared with a wall's `dimensions[0]`, its length. The iPhone editor can drag a wall's
 * two ends onto one point and still exports the wall, 0 long. A wall shorter than this (0 or
 * rounding) has no direction or extent, so the importer leaves it out with its openings. Every
 * longer wall imports as before: the iPhone and OpenKitchen3D exporters write raw lengths, and a
 * real sliver of a few millimetres can carry an opening the user sees.
 */
export const COLLAPSED_WALL_LENGTH = 1e-6;

export function isRoomPlanJson(data: any): boolean {
  return !!data && (data.openplanPrepared === true || data.openplanHandoffVersion !== undefined ||
    (Array.isArray(data.walls) && data.walls.some((wall: any) => wall?.dimensions !== undefined)));
}

/** Validate a complete capture before constructing or replacing a project. */
export function validateRoomPlan(data: any): void {
  function fail(path: string, reason: string): never {
    throw new Error(`Invalid RoomPlan file: ${path} ${reason}. No project was imported.`);
  }
  const record = (value: any) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const finite = (value: any) => typeof value === 'number' && Number.isFinite(value);
  const list = (key: string): any[] => {
    if (data[key] === undefined) return [];
    if (!Array.isArray(data[key])) fail(key, 'must be an array');
    return data[key];
  };
  const story = (value: any, path: string) => {
    if (value !== undefined && !Number.isSafeInteger(value)) fail(path, 'must be an integer');
  };
  if (!record(data)) fail('document', 'must be an object');
  if (!Array.isArray(data.walls)) fail('walls', 'must be an array');
  if (data.openplanHandoffVersion !== undefined && data.openplanHandoffVersion !== 1) {
    fail('openplanHandoffVersion', 'is not supported by this version of the editor');
  }
  const ids = new Set<string>();
  const walls = new Map<string, any>();
  for (const key of ['walls', 'doors', 'windows', 'openings', 'objects']) {
    for (const [index, item] of list(key).entries()) {
      const path = `${key}[${index}]`;
      if (!record(item)) fail(path, 'must be an object');
      if (typeof item.identifier !== 'string' || !item.identifier.trim()) fail(path, 'needs an identifier');
      if (ids.has(item.identifier)) fail(path, 'has a duplicate identifier');
      ids.add(item.identifier);
      const size = item.dimensions;
      if (!Array.isArray(size) || size.length < 2 || !size.every(finite)) {
        fail(`${path}.dimensions`, 'must list a finite width and height, and optionally depth, in metres');
      }
      // Only a wall may be 0 long (see COLLAPSED_WALL_LENGTH).
      if (key === 'walls' ? size[0] < 0 : size[0] <= 0) {
        fail(`${path}.dimensions`, key === 'walls' ? 'must have a nonnegative length' : 'must have a positive width');
      }
      if (size[1] <= 0) fail(`${path}.dimensions`, 'must have a positive height');
      if (key === 'objects' ? !(size[2] > 0) : size[2] < 0) {
        fail(`${path}.dimensions`, key === 'objects' ? 'must have a positive depth' : 'must have a nonnegative depth');
      }
      if (!Array.isArray(item.transform) || item.transform.length !== 16 || !item.transform.every(finite) ||
          Math.hypot(item.transform[0], item.transform[2]) < 1e-8) {
        fail(`${path}.transform`, 'must be a finite 4×4 transform with a horizontal direction');
      }
      story(item.story, `${path}.story`);
      for (const field of ['hingeLeft', 'opensInward']) {
        if (item[field] !== undefined && typeof item[field] !== 'boolean') fail(`${path}.${field}`, 'must be a boolean');
      }
      if (item.sillHeight !== undefined && (!finite(item.sillHeight) || item.sillHeight < 0)) {
        fail(`${path}.sillHeight`, 'must be a nonnegative number in metres');
      }
      if (item.style !== undefined) {
        const allowed = key === 'doors' ? ['single', 'double', 'sliding', 'patio'] : ['fixed', 'sliding'];
        if (!allowed.includes(item.style)) fail(`${path}.style`, 'is not supported for this opening');
      }
      if (key === 'walls') walls.set(item.identifier, item);
    }
  }
  for (const key of ['doors', 'windows', 'openings']) {
    for (const [index, item] of list(key).entries()) {
      const wall = walls.get(item.parentIdentifier);
      if (!wall || (wall.story ?? 0) !== (item.story ?? 0)) {
        fail(`${key}[${index}].parentIdentifier`, 'must refer to a wall on the same floor');
      }
    }
  }
  const levels = new Set<number>();
  for (const [index, item] of list('stories').entries()) {
    if (!record(item) || !Number.isSafeInteger(item.index) || typeof item.name !== 'string') {
      fail(`stories[${index}]`, 'needs an integer index and a name');
    }
    if (levels.has(item.index)) fail(`stories[${index}]`, 'has a duplicate floor index');
    levels.add(item.index);
  }
  for (const [index, item] of list('sections').entries()) {
    const path = `sections[${index}]`;
    if (!record(item) || !Array.isArray(item.center) || item.center.length !== 3 ||
        !item.center.every(finite) || typeof item.label !== 'string') {
      fail(path, 'needs a finite centre and room label');
    }
    story(item.story, `${path}.story`);
    for (const field of ['displayName', 'color']) {
      if (item[field] !== undefined && typeof item[field] !== 'string') fail(`${path}.${field}`, 'must be text');
    }
  }
  if (data.openplanImportOptions !== undefined) {
    const options = data.openplanImportOptions;
    if (!record(options) || typeof options.straighten !== 'boolean' || typeof options.orthogonal !== 'boolean') {
      fail('openplanImportOptions', 'needs boolean straighten and orthogonal choices');
    }
  }
}
