import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Project } from '$lib/models/types';
import { getCatalogItem, getFurnitureSize } from '$lib/utils/furnitureCatalog';
import { projectToPreparedRoomPlan } from '$lib/utils/interchange';
import { readProject } from '$lib/utils/projectValidation';
import { createProjectFromRoomPlan, isRoomPlanJson, validateRoomPlan } from '$lib/utils/roomplanImport';

// Copied unchanged from the sibling repositories; see tests/fixtures/siblings/README.md.
const fixtures: [string, 'openkitchen3d' | 'openlandscape3d' | 'opencatio3d'][] = [
  ['ios-sample-kitchen.openplan3d.json', 'openkitchen3d'],
  ['roundtrip-web-na-u-kitchen.openplan3d.json', 'openkitchen3d'],
  ['web-all-rules.openplan3d.json', 'openlandscape3d'],
  ['roundtrip-web-all-rules.openplan3d.json', 'openlandscape3d'],
  ['sample-lean-to-window.openplan3d.json', 'opencatio3d'],
  ['tunnel-default.openplan3d.json', 'opencatio3d'],
];
const load = (name: string): any => JSON.parse(readFileSync(new URL(`./fixtures/siblings/${name}`, import.meta.url), 'utf8'));
const near = (actual: number, expected: number, tolerance = 1e-6) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
const wrap = (degrees: number) => ((degrees % 360) + 360) % 360;
const heading = (t: number[]) => wrap(Math.atan2(t[2], t[0]) * 180 / Math.PI);
const story = (item: any) => item.story ?? 0;
const key = (category: any) => typeof category === 'string' ? category : Object.keys(category ?? {})[0] ?? '';
const elements = (file: any) => ['walls', 'doors', 'windows', 'openings', 'objects', 'sections'].flatMap(k => file[k] ?? []);
const hasAttributes = (object: any) => object.attributes && typeof object.attributes === 'object' && Object.keys(object.attributes).length > 0;
/** Export keeps the file's defaults but makes the ceiling follow the walls (most common height, first seen on ties). */
const exportedDefaults = (file: any) => {
  const counts = new Map<number, number>();
  let common: number | undefined;
  for (const wall of file.walls) {
    const height = Math.round(wall.dimensions[1] * 1e8) / 1e8, n = (counts.get(height) ?? 0) + 1;
    counts.set(height, n);
    if (common === undefined || n > counts.get(common)!) common = height;
  }
  return common === undefined ? file.defaults : { ...file.defaults, ceilingHeight: common };
};
const find = <T extends { id: string }>(project: Project, kind: 'walls' | 'doors' | 'windows' | 'furniture', id: string): T => {
  const item = project.floors.flatMap(f => f[kind] as unknown as T[]).find(item => item.id === id);
  expect(item, `${kind} ${id}`).toBeDefined();
  return item!;
};

describe.each(fixtures)('%s', (name, block) => {
  const file = load(name);
  const project = createProjectFromRoomPlan(load(name), name);

  it('is recognised and valid', () => {
    expect(isRoomPlanJson(file)).toBe(true);
    expect(() => validateRoomPlan(file)).not.toThrow();
    expect(file[block]).toBeTypeOf('object');
  });

  it('imports every story, element and identifier', () => {
    const stories = new Set<number>([...elements(file).map(story), ...(file.stories ?? []).map((s: any) => s.index)]);
    expect(project.floors.map(f => f.level).sort((a, b) => a - b)).toEqual([...stories].sort((a, b) => a - b));
    for (const floor of project.floors) {
      const on = (k: string) => (file[k] ?? []).filter((item: any) => story(item) === floor.level);
      expect(floor.walls.map(w => w.id)).toEqual(on('walls').map((w: any) => w.identifier));
      expect(floor.doors.map(d => d.id)).toEqual([...on('doors'), ...on('openings')].map((d: any) => d.identifier));
      expect(floor.windows.map(w => w.id)).toEqual(on('windows').map((w: any) => w.identifier));
      expect(floor.furniture.map(f => f.id)).toEqual(on('objects').map((o: any) => o.identifier));
    }
    for (const door of [...file.doors, ...(file.openings ?? [])]) expect(find<any>(project, 'doors', door.identifier).wallId).toBe(door.parentIdentifier);
    for (const window of file.windows) expect(find<any>(project, 'windows', window.identifier).wallId).toBe(window.parentIdentifier);
  });

  it('maps objects to catalog items at the exported size, position and heading', () => {
    for (const object of file.objects) {
      const item = find<any>(project, 'furniture', object.identifier), category = key(object.category);
      if (getCatalogItem(category)) expect(item).toMatchObject({ catalogId: category });
      else expect(item).toMatchObject({ catalogId: 'imported_object', sourceCategory: category });
      near(item.width, object.dimensions[0] * 100); near(item.height, object.dimensions[1] * 100); near(item.depth, object.dimensions[2] * 100);
      near(item.position.x, object.transform[12] * 100); near(item.position.y, object.transform[14] * 100);
      near(wrap(item.rotation), heading(object.transform));
      expect(item.scale).toEqual({ x: 1, y: 1, z: 1 });
    }
  });

  it('retains the sibling block and object attributes through save and reload', () => {
    expect(project.interchange).toBeDefined();
    expect(project.interchange!.version).toBe(1);
    expect(Object.keys(project.interchange!.blocks)).toEqual([block]);
    expect(project.interchange!.blocks[block]).toEqual(file[block]);
    expect(project.interchange!.blocks[block]).not.toBe(file[block]);
    const attributed = file.objects.filter(hasAttributes);
    expect(attributed.length).toBeGreaterThan(0);
    for (const object of attributed) expect(project.interchange!.attributes?.[object.identifier]).toEqual(object.attributes);
    expect(Object.keys(project.interchange!.attributes ?? {})).toHaveLength(attributed.length);
    expect(project.interchange!.defaults).toEqual(file.defaults);
    expect(project.interchange!.planNotes).toBe(file.planNotes);
    for (const key of ['coreModel', 'floors', 'walls', 'openplanPrepared']) expect(project.interchange!.blocks).not.toHaveProperty(key);

    const reloaded = readProject(JSON.parse(JSON.stringify(project)));
    expect(reloaded.interchange).toEqual(project.interchange);
    expect(reloaded.floors).toEqual(project.floors);
  });

  it('exports a valid prepared file that keeps the block, attributes and geometry', () => {
    const out: any = projectToPreparedRoomPlan(project);
    expect(() => validateRoomPlan(out)).not.toThrow();
    expect(isRoomPlanJson(out)).toBe(true);
    expect(out).toMatchObject({ openplanPrepared: true, openplanHandoffVersion: 1, version: 2, floors: [], defaults: exportedDefaults(file), planNotes: file.planNotes });
    expect(out[block]).toEqual(file[block]);
    expect(out[block]).not.toBe(project.interchange!.blocks[block]);
    expect(out.stories).toEqual(project.floors.map(f => ({ index: f.level, name: f.name })));

    expect(out.objects.map((o: any) => o.identifier)).toEqual(file.objects.map((o: any) => o.identifier));
    for (const object of file.objects) {
      const exported = out.objects.find((o: any) => o.identifier === object.identifier);
      expect(exported.category).toEqual(object.category);
      expect(exported.story).toBe(story(object));
      for (let i = 0; i < 3; i++) near(exported.dimensions[i], object.dimensions[i]);
      near(exported.transform[12], object.transform[12]); near(exported.transform[14], object.transform[14]);
      near(exported.transform[13], object.dimensions[1] / 2);
      near(heading(exported.transform), heading(object.transform));
      if (hasAttributes(object)) expect(exported.attributes).toEqual(object.attributes);
      else expect(exported).not.toHaveProperty('attributes');
    }
    expect(out.walls.map((w: any) => w.identifier)).toEqual(file.walls.map((w: any) => w.identifier));
    for (const wall of file.walls) {
      const exported = out.walls.find((w: any) => w.identifier === wall.identifier);
      expect(exported).toMatchObject({ category: { wall: {} }, story: story(wall) });
      near(exported.dimensions[0], wall.dimensions[0]); near(exported.dimensions[1], wall.dimensions[1]);
      near(exported.dimensions[2], wall.dimensions[2] > 0 ? wall.dimensions[2] : 0.15);
      near(exported.transform[12], wall.transform[12]); near(exported.transform[14], wall.transform[14]);
      near(heading(exported.transform), heading(wall.transform));
    }
    for (const [kind, list] of [['doors', file.doors], ['windows', file.windows], ['openings', file.openings ?? []]] as const) {
      expect(out[kind].map((o: any) => o.identifier)).toEqual(list.map((o: any) => o.identifier));
      for (const opening of list) {
        const exported = out[kind].find((o: any) => o.identifier === opening.identifier);
        expect(exported).toMatchObject({ parentIdentifier: opening.parentIdentifier, story: story(opening) });
        near(exported.dimensions[0], opening.dimensions[0]); near(exported.dimensions[1], opening.dimensions[1]);
        if (kind === 'windows') near(exported.sillHeight, opening.sillHeight ?? opening.transform[13] - opening.dimensions[1] / 2);
      }
    }
    const named = project.floors.flatMap(f => f.rooms.filter(r => r.walls.length > 0).map(r => [r.name, f.level]));
    expect(named).toHaveLength(file.sections.length);
    expect(out.sections.map((s: any) => [s.displayName, s.story])).toEqual(named);
    // Labels derive from the room name, so the original key survives only when the name is that room type.
    for (const section of file.sections) {
      const exported = out.sections.find((s: any) => s.displayName === section.displayName);
      expect(exported).toMatchObject({ label: 'room', story: story(section) });
      near(exported.center[0], section.center[0]); expect(exported.center[1]).toBe(0); near(exported.center[2], section.center[2]);
    }
  });

  it('imports its own export identically', () => {
    const again = createProjectFromRoomPlan(JSON.parse(JSON.stringify(projectToPreparedRoomPlan(project))), 'again');
    expect(again.floors.map(f => [f.level, f.name])).toEqual(project.floors.map(f => [f.level, f.name]));
    for (const [index, floor] of project.floors.entries()) {
      const twice = again.floors[index];
      expect(twice.walls.map(w => w.id)).toEqual(floor.walls.map(w => w.id));
      floor.walls.forEach((wall, i) => {
        const w = twice.walls[i];
        for (const end of ['start', 'end'] as const) { near(w[end].x, wall[end].x); near(w[end].y, wall[end].y); }
        near(w.thickness, wall.thickness); near(w.height, wall.height);
      });
      expect(twice.doors.map(d => d.id)).toEqual(floor.doors.map(d => d.id));
      floor.doors.forEach((door, i) => {
        expect(twice.doors[i]).toMatchObject({ wallId: door.wallId, type: door.type, swingDirection: door.swingDirection, flipSide: door.flipSide });
        near(twice.doors[i].position, door.position); near(twice.doors[i].width, door.width); near(twice.doors[i].height, door.height);
      });
      expect(twice.windows.map(w => w.id)).toEqual(floor.windows.map(w => w.id));
      floor.windows.forEach((window, i) => {
        // A style-less window imports as 'standard' and exports as the format's 'fixed'.
        expect(twice.windows[i]).toMatchObject({ wallId: window.wallId, type: window.type === 'sliding' ? 'sliding' : 'fixed' });
        near(twice.windows[i].position, window.position); near(twice.windows[i].width, window.width); near(twice.windows[i].height, window.height); near(twice.windows[i].sillHeight, window.sillHeight);
      });
      expect(twice.furniture.map(f => f.id)).toEqual(floor.furniture.map(f => f.id));
      floor.furniture.forEach((item, i) => {
        const f = twice.furniture[i], size = getFurnitureSize(item), again = getFurnitureSize(f);
        expect(f).toMatchObject({ catalogId: item.catalogId, scale: item.scale, ...(item.sourceCategory ? { sourceCategory: item.sourceCategory } : {}) });
        near(f.position.x, item.position.x); near(f.position.y, item.position.y); near(wrap(f.rotation), wrap(item.rotation));
        near(again.width, size.width); near(again.depth, size.depth); near(again.height, size.height);
      });
      expect(twice.rooms.map(r => [r.name, r.walls.length, r.color])).toEqual(floor.rooms.map(r => [r.name, r.walls.length, r.color]));
    }
    // The ceiling default now follows the walls; everything else is retained unchanged.
    expect(again.interchange).toEqual({ ...project.interchange, defaults: exportedDefaults(file) });
  });
});
