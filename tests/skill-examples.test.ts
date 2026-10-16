import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { readProject } from '$lib/utils/projectValidation';
import { resolveRooms } from '$lib/utils/roomDetection';
import { createProjectFromRoomPlan, isRoomPlanJson, validateRoomPlan } from '$lib/utils/roomplanImport';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';

// The skill teaches agents to author plan files; its examples and catalog table must track the code.
const dir = 'docs/skills/openplan3d-plan-authoring';
const read = (name: string) => readFileSync(`${dir}/${name}`, 'utf8');
const example = (name: string) => JSON.parse(read(`examples/${name}`));
const skill = read('SKILL.md');
const byName = <T extends { name: string }>(rooms: T[]) => Object.fromEntries(rooms.map(room => [room.name, room])) as Record<string, T>;

describe('web project example', () => {
  const source = example('two-room-web-project.json');
  it('passes readProject unchanged and detects both named rooms with positive areas', () => {
    const loaded = readProject(structuredClone(source));
    expect(loaded.floors).toEqual(source.floors);
    expect(loaded).toMatchObject({ id: 'two-room-demo', name: 'Two-room demo', activeFloorId: 'ground' });
    const rooms = byName(resolveRooms(loaded.floors[0]));
    expect(Object.keys(rooms).sort()).toEqual(['Bedroom', 'Living Room']);
    expect(rooms['Living Room']).toMatchObject({ id: 'r-living', floorTexture: 'light-oak', area: 24 });
    expect(rooms['Bedroom']).toMatchObject({ id: 'r-bedroom', floorTexture: 'carpet-beige', area: 16 });
    for (const room of Object.values(rooms)) { expect(room.area).toBeGreaterThan(0); expect(room.walls).toHaveLength(4); }
    for (const item of loaded.floors[0].furniture) expect(getCatalogItem(item.catalogId)).toBeDefined();
  });
});

describe('prepared RoomPlan interchange example', () => {
  const source = example('two-room-interchange.openplan3d.json');
  it('is recognised, validates and imports the same two named rooms, openings and catalog furniture', () => {
    expect(isRoomPlanJson(source)).toBe(true);
    expect(() => validateRoomPlan(source)).not.toThrow();
    const project = createProjectFromRoomPlan(structuredClone(source), 'Two-room demo');
    expect(readProject(project)).toEqual(project);
    expect(project.floors).toHaveLength(1);
    const floor = project.floors[0];
    expect(floor).toMatchObject({ level: 0, name: 'Ground Floor' });
    expect(floor.walls).toHaveLength(5); expect(floor.doors).toHaveLength(2); expect(floor.windows).toHaveLength(2);
    expect(floor.rooms.map(room => room.name)).toEqual(['Living Room', 'Bedroom']);
    expect(floor.rooms.map(room => room.area)).toEqual([24, 16]);
    for (const room of floor.rooms) expect(room.walls).toHaveLength(4);
    expect(floor.furniture.map(item => item.catalogId)).toEqual(['sofa', 'coffee_table', 'bed_queen']);
    expect(floor.furniture.map(item => item.sourceCategory)).toEqual([undefined, undefined, undefined]);
    // Detection on the imported walls attaches the section names by wall set, as the editor will.
    expect(Object.keys(byName(resolveRooms(floor))).sort()).toEqual(['Bedroom', 'Living Room']);
  });
  it('matches the web example geometry, swing semantics and furniture placement', () => {
    const web = example('two-room-web-project.json').floors[0];
    const floor = createProjectFromRoomPlan(structuredClone(source), 'Two-room demo').floors[0];
    for (const expected of web.walls) {
      const wall = floor.walls.find(w => w.id === expected.id)!;
      expect(wall).toMatchObject({ thickness: expected.thickness, height: expected.height });
      for (const end of ['start', 'end'] as const) for (const axis of ['x', 'y'] as const) expect(wall[end][axis]).toBeCloseTo(expected[end][axis], 6);
    }
    for (const expected of [...web.doors, ...web.windows]) {
      const opening = [...floor.doors, ...floor.windows].find(o => o.id === expected.id)!;
      const { position, ...rest } = expected;
      expect(opening).toMatchObject(rest);
      expect(opening.position).toBeCloseTo(position, 6);
    }
    for (const expected of web.furniture) {
      const item = floor.furniture.find(f => f.id === expected.id)!;
      expect(item.catalogId).toBe(expected.catalogId);
      expect(item.position.x).toBeCloseTo(expected.position.x, 6); expect(item.position.y).toBeCloseTo(expected.position.y, 6);
      expect(item.rotation).toBeCloseTo(expected.rotation, 6);
      const size = getCatalogItem(expected.catalogId)!;
      expect(item).toMatchObject({ width: size.width, depth: size.depth, height: size.height, scale: { x: 1, y: 1, z: 1 } });
    }
  });
});

describe('SKILL.md', () => {
  it('declares the skill name and stays within the loadable size', () => {
    expect(skill.startsWith('---\nname: openplan3d-plan-authoring\n')).toBe(true);
    expect(skill.split('\n').length).toBeLessThanOrEqual(400);
  });
  it('inlines each example file verbatim', () => {
    for (const name of ['two-room-web-project.json', 'two-room-interchange.openplan3d.json']) {
      const match = skill.match(new RegExp(`<!-- example:examples/${name.replace(/\./g, '\\.')} -->\\n\`\`\`json\\n([\\s\\S]*?)\`\`\``));
      expect(match, `inline copy of ${name}`).not.toBeNull();
      expect(JSON.parse(match![1])).toEqual(example(name));
    }
  });
  it('only names catalog ids that exist, with their catalog sizes', () => {
    const block = skill.match(/<!-- catalog-ids:start -->([\s\S]*?)<!-- catalog-ids:end -->/)?.[1];
    expect(block).toBeDefined();
    const ids = [...block!.matchAll(/`([^`]+)`(?: (\d+)×(\d+)×(\d+))?/g)];
    expect(ids.length).toBeGreaterThanOrEqual(80);
    for (const [, id, width, depth, height] of ids) {
      const item = getCatalogItem(id);
      expect(item, `catalog id ${id}`).toBeDefined();
      if (width) expect([item!.width, item!.depth, item!.height], `size of ${id}`).toEqual([Number(width), Number(depth), Number(height)]);
    }
    expect(new Set(ids.map(([, id]) => id)).size).toBe(ids.length);
  });
});
