import { describe, expect, it } from 'vitest';
import type { Project } from '$lib/models/types';
import { createDefaultFloor, createDefaultProject } from '$lib/stores/project';
import { floorElevations } from '$lib/utils/floors';
import { getFurnitureSize } from '$lib/utils/furnitureCatalog';
import { INTERCHANGE_BLOCK_KEYS, interchangeFileName, interchangeProjectName, projectToPreparedRoomPlan, sortedJson } from '$lib/utils/interchange';
import { resolveRooms } from '$lib/utils/roomDetection';
import { readProject } from '$lib/utils/projectValidation';
import { createProjectFromRoomPlan, isRoomPlanJson, validateRoomPlan } from '$lib/utils/roomplanImport';
import { rectangleWalls } from './fixtures/project';

const near = (actual: number, expected: number, tolerance = 1e-6) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
const wrap = (degrees: number) => ((degrees % 360) + 360) % 360;
const byId = (items: { identifier?: string }[], id: string): any => items.find(item => item.identifier === id);

/** A web-authored plan with every exported element kind, a curved wall and repeated ids on a second floor. */
function webProject(): Project {
  const project = createDefaultProject('Lake House / Draft #2');
  project.description = '  Client notes  ';
  const ground = project.floors[0];
  ground.walls = [...rectangleWalls('g'), { id: 'g-curve', start: { x: 500, y: 0 }, end: { x: 800, y: 0 }, curvePoint: { x: 650, y: 120 }, thickness: 12, height: 250, color: '#eee' }];
  ground.doors = [
    { id: 'front', wallId: 'g-0', position: 0.3, width: 90, height: 210, type: 'french', swingDirection: 'right', flipSide: false },
    { id: 'pass', wallId: 'g-1', position: 0.5, width: 100, height: 205, type: 'opening', swingDirection: 'left', flipSide: true },
  ];
  ground.windows = [{ id: 'win', wallId: 'g-2', position: 0.6, width: 120, height: 130, sillHeight: 90, type: 'sliding' }];
  ground.furniture = [
    { id: 'sofa', catalogId: 'sofa', position: { x: 150, y: 120 }, rotation: 30, scale: { x: 1, y: 1, z: 1 } },
    { id: 'desk', catalogId: 'desk', position: { x: 300, y: 200 }, rotation: 45, scale: { x: 1, y: -1, z: 1 }, width: 140, depth: 70 },
    { id: 'crate', catalogId: 'imported_object', sourceCategory: 'base_cabinet', position: { x: 50, y: 250 }, rotation: 0, scale: { x: 1, y: 1, z: 1 }, width: 60, depth: 58, height: 87 },
  ];
  ground.rooms = [{ id: 'room-g', name: 'Living Room', walls: ['g-0', 'g-1', 'g-2', 'g-3'], floorTexture: 'oak', area: 12, color: '#aabbcc' }];
  const upper = createDefaultFloor(1);
  upper.name = 'Upper';
  upper.walls = rectangleWalls('g', 1000); // same wall ids as the ground floor
  upper.doors = [{ id: 'front', wallId: 'g-0', position: 0.5, width: 80, height: 200, type: 'single', swingDirection: 'left', flipSide: true }];
  upper.rooms = [{ id: 'room-u', name: 'Studio', walls: ['g-0', 'g-1', 'g-2', 'g-3'], floorTexture: 'oak', area: 12 }];
  project.floors.push(upper);
  return project;
}

describe('web project → prepared RoomPlan JSON → web project', () => {
  it('exports a valid prepared file that imports back with the same geometry', () => {
    const project = webProject(), before = JSON.stringify(project);
    const file: any = projectToPreparedRoomPlan(project);
    expect(JSON.stringify(project)).toBe(before);
    expect(isRoomPlanJson(file)).toBe(true);
    expect(() => validateRoomPlan(file)).not.toThrow();
    expect(file).toMatchObject({ openplanPrepared: true, openplanHandoffVersion: 1, version: 2, floors: [] });
    expect(file.stories).toEqual([{ index: 0, name: 'Ground Floor' }, { index: 1, name: 'Upper' }]);

    const back = createProjectFromRoomPlan(JSON.parse(JSON.stringify(file)), 'Back');
    expect(back.floors.map(f => [f.level, f.name])).toEqual([[0, 'Ground Floor'], [1, 'Upper']]);
    for (const [index, floor] of project.floors.entries()) {
      const imported = back.floors[index];
      expect(imported.walls).toHaveLength(floor.walls.length);
      floor.walls.forEach((wall, i) => {
        const w = imported.walls[i];
        for (const end of ['start', 'end'] as const) { near(w[end].x, wall[end].x); near(w[end].y, wall[end].y); }
        near(w.thickness, wall.thickness); near(w.height, wall.height);
        expect(w.curvePoint).toBeUndefined(); // curved walls travel as their chord
      });
      expect(imported.doors).toHaveLength(floor.doors.length);
      floor.doors.forEach((door, i) => {
        const d = imported.doors[i];
        expect(d.wallId).toBe(imported.walls[floor.walls.findIndex(w => w.id === door.wallId)].id);
        near(d.position, door.position); near(d.width, door.width); near(d.height, door.height);
        if (door.type === 'opening') { expect(d.type).toBe('opening'); return; }
        // french → double is lossy: the format only knows single/double/sliding/patio.
        expect(d.type).toBe(door.type === 'french' ? 'double' : door.type);
        expect(d.swingDirection).toBe(door.swingDirection); expect(d.flipSide).toBe(door.flipSide);
      });
      expect(imported.windows).toHaveLength(floor.windows.length);
      floor.windows.forEach((window, i) => {
        const w = imported.windows[i];
        expect(w).toMatchObject({ type: window.type, wallId: imported.walls[floor.walls.findIndex(x => x.id === window.wallId)].id });
        near(w.position, window.position); near(w.width, window.width); near(w.height, window.height); near(w.sillHeight, window.sillHeight);
      });
      expect(imported.furniture).toHaveLength(floor.furniture.length);
      floor.furniture.forEach((item, i) => {
        const f = imported.furniture[i], size = getFurnitureSize(item), got = getFurnitureSize(f);
        expect(f).toMatchObject({ id: item.id, catalogId: item.catalogId, ...(item.sourceCategory ? { sourceCategory: item.sourceCategory } : {}) });
        near(f.position.x, item.position.x); near(f.position.y, item.position.y);
        near(wrap(f.rotation), wrap(item.rotation));
        expect(Math.sign(f.scale.y)).toBe(Math.sign(item.scale.y));
        near(got.width, size.width); near(got.depth, size.depth); near(got.height, size.height);
      });
    }
    expect(back.floors[0].rooms).toHaveLength(1);
    expect(back.floors[0].rooms[0]).toMatchObject({ name: 'Living Room', color: '#aabbcc' });
    expect(back.floors[0].rooms[0].walls).toHaveLength(4);
    expect(back.floors[1].rooms.map(r => r.name)).toEqual(['Studio']);
    expect(back.interchange).toBeUndefined();
  });

  it('leaves floor openings, floor elevations and slab thicknesses out, as the format notes say', () => {
    // docs/handoff-format-v1.md lists these as unrepresented; carrying them changes the family format.
    const project = webProject();
    project.floors[0].rooms[0].floorOpening = true;
    Object.assign(project.floors[1], { elevation: 350, slabThickness: 25 });
    const file: any = projectToPreparedRoomPlan(project);
    expect(file.sections.map((section: any) => section.displayName)).toContain('Living Room');
    expect(file.sections.filter((section: object) => 'floorOpening' in section)).toEqual([]);
    expect(file.stories).toEqual([{ index: 0, name: 'Ground Floor' }, { index: 1, name: 'Upper' }]);

    const back = createProjectFromRoomPlan(JSON.parse(JSON.stringify(file)), 'Back');
    expect(back.floors[0].rooms[0].name).toBe('Living Room');
    expect(back.floors[0].rooms[0].floorOpening).toBeUndefined();
    expect(back.floors.map(floor => [floor.elevation, floor.slabThickness])).toEqual([[undefined, undefined], [undefined, undefined]]);
    expect(floorElevations(back.floors).map(entry => entry.elevation)).toEqual([0, 300]);
  });

  it('writes the documented element fields', () => {
    const file: any = projectToPreparedRoomPlan(webProject());
    expect(byId(file.walls, 'g-0')).toEqual({ identifier: 'g-0', dimensions: [4, 2.5, 0.15], transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 1.25, 0, 1], category: { wall: {} }, story: 0 });
    const chord = byId(file.walls, 'g-curve');
    expect(chord.dimensions).toEqual([3, 2.5, 0.12]);
    expect(chord.transform.slice(12, 15)).toEqual([6.5, 1.25, 0]);
    expect(byId(file.doors, 'front')).toEqual({ identifier: 'front', parentIdentifier: 'g-0', dimensions: [0.9, 2.1, 0.15], transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1.2, 1.05, 0, 1], category: { door: {} }, story: 0, style: 'double', hingeLeft: true, opensInward: true });
    const passage = byId(file.openings, 'pass');
    expect(passage).toMatchObject({ parentIdentifier: 'g-1', dimensions: [1, 2.05, 0.15], category: { opening: {} }, story: 0 });
    expect(passage.transform.slice(12, 15)).toEqual([4, 1.025, 1.5]);
    for (const key of ['style', 'hingeLeft', 'opensInward']) expect(passage).not.toHaveProperty(key);
    expect(byId(file.doors, 'pass')).toBeUndefined();
    const window = byId(file.windows, 'win');
    expect(window).toMatchObject({ parentIdentifier: 'g-2', dimensions: [1.2, 1.3, 0.15], category: { window: {} }, style: 'sliding', sillHeight: 0.9, story: 0 });
    expect(window.transform.slice(12, 15)).toEqual([1.6, 1.55, 3]);
    const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
    expect(byId(file.objects, 'sofa')).toEqual({ identifier: 'sofa', dimensions: [2, 0.8, 0.9], transform: [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 1.5, 0.4, 1.2, 1], category: { sofa: {} }, story: 0 });
    const desk = byId(file.objects, 'desk'), c45 = Math.cos(Math.PI / 4), s45 = Math.sin(Math.PI / 4);
    expect(desk.dimensions).toEqual([1.4, 0.75, 0.7]);
    expect(desk.transform.slice(0, 3)).toEqual([c45, 0, s45]);
    expect(desk.transform.slice(8, 11)).toEqual([s45, 0, -c45]); // scale.y < 0 negates the local Z column
    expect(byId(file.objects, 'crate')).toMatchObject({ dimensions: [0.6, 0.87, 0.58], category: { base_cabinet: {} } });
    expect(file.sections).toEqual([
      { center: [2, 0, 1.5], label: 'livingRoom', displayName: 'Living Room', color: '#aabbcc', story: 0 },
      { center: [12, 0, 1.5], label: 'room', displayName: 'Studio', story: 1 },
    ]);
    expect(file.defaults).toEqual({ ceilingHeight: 2.5, interiorWallThickness: 0.12, exteriorWallThickness: 0.2 });
    expect(file.planNotes).toBe('Client notes');
    // JSON.stringify would hide a −0, so check the values themselves.
    for (const item of [...file.walls, ...file.doors, ...file.windows, ...file.openings, ...file.objects]) for (const v of item.transform) expect(Object.is(v, -0)).toBe(false);
    for (const section of file.sections) for (const v of section.center) expect(Object.is(v, -0)).toBe(false);
  });

  it('labels sections from the native room type, then the room name', () => {
    const project = webProject(), rooms = project.floors[0].rooms;
    const labels = () => (projectToPreparedRoomPlan(project) as any).sections.map((s: any) => s.label);
    rooms[0].details = { roomType: 'kitchen' };
    expect(labels()).toEqual(['kitchen', 'room']);
    rooms[0].details = { roomType: null };
    for (const [name, label] of [['living room', 'livingRoom'], ['DINING ROOM', 'diningRoom'], ['laundryRoom', 'laundryRoom'], ['Laundry', 'laundryRoom'], ['Kitchen 2', 'room'], ['', 'room']]) {
      rooms[0].name = name;
      expect(labels()[0], name).toBe(label);
    }
    expect((projectToPreparedRoomPlan(project) as any).sections[0]).not.toHaveProperty('displayName');
  });

  it('disambiguates identifiers repeated across floors and remaps their parents', () => {
    const file: any = projectToPreparedRoomPlan(webProject());
    const ids = [...file.walls, ...file.doors, ...file.windows, ...file.openings, ...file.objects].map(item => item.identifier);
    expect(new Set(ids).size).toBe(ids.length);
    expect(file.walls.filter((w: any) => w.story === 1).map((w: any) => w.identifier)).toEqual(['g-0-s1', 'g-1-s1', 'g-2-s1', 'g-3-s1']);
    expect(byId(file.doors, 'front-s1')).toMatchObject({ parentIdentifier: 'g-0-s1', story: 1, style: 'single', hingeLeft: false, opensInward: false });
    const back = createProjectFromRoomPlan(file, 'Back');
    expect(back.floors[1].doors[0]).toMatchObject({ id: 'front-s1', wallId: 'g-0-s1', type: 'single', swingDirection: 'left', flipSide: true });

    const upper: any = projectToPreparedRoomPlan(webProject(), { floorIds: [webProject().floors[1].id] });
    expect(upper.stories).toEqual([]);
    const project = webProject(), only: any = projectToPreparedRoomPlan(project, { floorIds: [project.floors[1].id] });
    expect(only.stories).toEqual([{ index: 1, name: 'Upper' }]);
    expect(only.walls.map((w: any) => w.identifier)).toEqual(['g-0', 'g-1', 'g-2', 'g-3']);
    expect(only.doors[0]).toMatchObject({ identifier: 'front', parentIdentifier: 'g-0', story: 1 });
    expect(only.sections).toEqual([{ center: [12, 0, 1.5], label: 'room', displayName: 'Studio', story: 1 }]);
    expect(() => validateRoomPlan(only)).not.toThrow();
  });

  it('bumps floors that share a level like the native package', () => {
    const project = webProject();
    project.floors[1].level = 0;
    const file: any = projectToPreparedRoomPlan(project);
    expect(file.stories).toEqual([{ index: 0, name: 'Ground Floor' }, { index: 1, name: 'Upper' }]);
    expect(file.walls.map((w: any) => w.story)).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1]);
    expect(() => validateRoomPlan(file)).not.toThrow();
    expect(createProjectFromRoomPlan(file, 'Back').floors.map(f => f.level)).toEqual([0, 1]);
  });

  it.each([[1, 1], [1, -1], [-1, 1], [-1, -1]])('reproduces the furniture pose for scale signs (%i, %i)', (sx, sy) => {
    const project = createDefaultProject('Mirror');
    project.floors[0].furniture = [{ id: 'chair', catalogId: 'chair', position: { x: 90, y: 40 }, rotation: 30, scale: { x: sx, y: sy, z: 1 } }];
    const file: any = projectToPreparedRoomPlan(project);
    const t = file.objects[0].transform, c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
    expect([t[0], t[2], t[8], t[10]].map(v => Math.round(v * 1e12) / 1e12)).toEqual([c * sx, s * sx, -s * sy, c * sy].map(v => Math.round(v * 1e12) / 1e12));
    const item = createProjectFromRoomPlan(file, 'Back').floors[0].furniture[0];
    expect(item.scale.y).toBe(sy === 1 && sx === 1 || sy === -1 && sx === -1 ? 1 : -1);
    const rotation = item.rotation * Math.PI / 180;
    for (const [x, y] of [[0.4, 0.7], [-0.3, 0.2]]) {
      near(Math.cos(rotation) * item.scale.x * x - Math.sin(rotation) * item.scale.y * y, c * sx * x - s * sy * y, 1e-9);
      near(Math.sin(rotation) * item.scale.x * x + Math.cos(rotation) * item.scale.y * y, s * sx * x + c * sy * y, 1e-9);
    }
  });

  it('chooses defaults and plan notes by rule', () => {
    const project = webProject();
    project.floors[0].walls[0].height = 300; project.floors[0].walls[1].height = 300;
    project.floors[0].walls[2].startHeight = 320; // the taller end counts
    let file: any = projectToPreparedRoomPlan(project);
    expect(file.defaults.ceilingHeight).toBe(2.5); // 250 cm still wins 5 to 2 to 1
    expect(byId(file.walls, 'g-2').dimensions[1]).toBe(3.2);
    project.floors[0].walls.forEach(w => { w.height = 300; delete w.startHeight; });
    expect(projectToPreparedRoomPlan(project, { floorIds: [project.floors[0].id] }).defaults).toEqual({ ceilingHeight: 3, interiorWallThickness: 0.12, exteriorWallThickness: 0.2 });
    expect(projectToPreparedRoomPlan(createDefaultProject('Empty')).defaults).toEqual({ ceilingHeight: 2.4, interiorWallThickness: 0.12, exteriorWallThickness: 0.2 });

    project.description = '   ';
    expect(projectToPreparedRoomPlan(project).planNotes).toBe('Created with OpenPlan3D (web editor).');
    project.interchange = { version: 1, blocks: {}, planNotes: 'From a sibling' };
    expect(projectToPreparedRoomPlan(project).planNotes).toBe('From a sibling');
    project.description = 'Web notes win';
    file = projectToPreparedRoomPlan(project);
    expect(file.planNotes).toBe('Web notes win');
    expect(() => validateRoomPlan(file)).not.toThrow();
  });

  it('re-emits retained sibling blocks, attributes and defaults and nothing else', () => {
    const project = webProject();
    const block = { schema: 'openkitchen3d/ios-project@0.1', producer: 'ios', cabinets: [{ id: 'crate', sku: 'B1D-600', nested: { deep: [1, 2, { three: 3 }] } }] };
    project.interchange = {
      version: 1,
      blocks: { openkitchen3d: block, coreModel: { ignored: true }, walls: { never: 'spread' } },
      attributes: { crate: { openkitchen3dRole: 'proposed', sku: 'B1D-600' }, missing: { openkitchen3dRole: 'existing' } },
      defaults: { ceilingHeight: 2.7, interiorWallThickness: 0.1, exteriorWallThickness: 0.25, future: 'kept' },
    };
    const file: any = projectToPreparedRoomPlan(project);
    expect(() => validateRoomPlan(file)).not.toThrow();
    expect(file.openkitchen3d).toEqual(block);
    expect(file.openkitchen3d).not.toBe(block);
    expect(file.openkitchen3d.cabinets[0].nested).not.toBe(block.cabinets[0].nested);
    expect(file).not.toHaveProperty('coreModel');
    expect(Array.isArray(file.walls)).toBe(true);
    expect(byId(file.objects, 'crate').attributes).toEqual({ openkitchen3dRole: 'proposed', sku: 'B1D-600' });
    expect(byId(file.objects, 'sofa')).not.toHaveProperty('attributes');
    // Other retained defaults are kept; the ceiling follows the current walls (250 cm).
    expect(file.defaults).toEqual({ ...project.interchange.defaults, ceilingHeight: 2.5 });
    expect(file.defaults).not.toBe(project.interchange.defaults);
    for (const key of INTERCHANGE_BLOCK_KEYS) if (key !== 'openkitchen3d') expect(file).not.toHaveProperty(key);

    const back = createProjectFromRoomPlan(file, 'Back');
    expect(back.interchange).toEqual({ version: 1, blocks: { openkitchen3d: block }, attributes: { crate: { openkitchen3dRole: 'proposed', sku: 'B1D-600' } }, defaults: { ...project.interchange.defaults, ceilingHeight: 2.5 }, planNotes: 'Client notes' });
  });

  it('never writes back a sibling webProject snapshot and refreshes a retained building with the edited geometry', () => {
    const project = webProject();
    const landscape = { schema: 'openlandscape3d/project@0.1', producer: 'web', name: 'Garden', plants: [{ id: 'p1' }], webProject: { schema: 'openlandscape3d/web-project@0.1', plants: [] }, building: { walls: [{ identifier: 'old-wall' }], doors: [], objects: [{ identifier: 'old-object' }] } };
    const catio = { schema: 'opencatio3d/project@0.1', producer: 'web', building: null, site: { walls: [] }, webProject: { schema: 'opencatio3d/project@0.1', structures: [] } };
    project.interchange = { version: 1, blocks: { openlandscape3d: landscape, opencatio3d: catio } };
    const file: any = projectToPreparedRoomPlan(project);
    expect(() => validateRoomPlan(file)).not.toThrow();
    expect(file.openlandscape3d).not.toHaveProperty('webProject');
    expect(file.opencatio3d).not.toHaveProperty('webProject');
    expect(file.openlandscape3d.plants).toEqual([{ id: 'p1' }]);
    expect(file.openlandscape3d.producer).toBe('web');
    // A verbatim copy of our arrays is replaced by the arrays being written; a null building stays null.
    expect(file.openlandscape3d.building).toEqual({ walls: file.walls, doors: file.doors, windows: file.windows, openings: file.openings, sections: file.sections, stories: file.stories, floors: [], defaults: file.defaults });
    expect(file.openlandscape3d.building.walls).not.toBe(file.walls);
    expect(file.opencatio3d.building).toBeNull();
    // The project keeps what it imported; only the written file is adjusted.
    expect(project.interchange.blocks.openlandscape3d).toBe(landscape);
    expect(landscape.webProject).toBeDefined();
  });

  it('applies the family link rules only when exporting for a link', () => {
    const project = webProject();
    project.interchange = { version: 1, blocks: { openlandscape3d: {
      schema: 'openlandscape3d/project@0.1', producer: 'ios',
      site: { regionId: 'us-northeast', location: { lat: 41.123456, lon: -72.987654, precision: 'precise' } },
      observations: [{ id: 'o1', kind: 'photo', text: 'Standing water', lat: 41.123456, lon: -72.987654, headingDeg: 120, photoFile: 'obs-o1.jpg', resolved: false }],
      ios: { palette: 'dusk', geoOrigin: { lat: 41.1234567, lon: -72.9876543 } },
    } } };
    const file: any = projectToPreparedRoomPlan(project);
    expect(file.openlandscape3d.site.location).toEqual({ lat: 41.123456, lon: -72.987654, precision: 'precise' });
    expect(file.openlandscape3d.observations[0]).toMatchObject({ lat: 41.123456, photoFile: 'obs-o1.jpg' });
    expect(file.openlandscape3d.ios.geoOrigin).toBeDefined();
    const link: any = projectToPreparedRoomPlan(project, { forLink: true });
    expect(link.openlandscape3d.site.location).toEqual({ lat: 41.12, lon: -72.99, precision: 'coarse' });
    expect(link.openlandscape3d.observations).toEqual([{ id: 'o1', kind: 'photo', text: 'Standing water', resolved: false }]);
    expect(link.openlandscape3d.ios).toEqual({ palette: 'dusk' });
    expect(link.walls).toEqual(file.walls);
  });

  it('anchors each section inside its room even when the label was dragged into a neighbour', () => {
    const project = createDefaultProject('Two rooms');
    const floor = project.floors[0];
    floor.walls = [...rectangleWalls('a'), ...rectangleWalls('b', 400).filter(w => w.id !== 'b-3')]; // b-3 would duplicate the shared wall a-1
    const rooms = resolveRooms(floor);
    expect(rooms).toHaveLength(2);
    floor.rooms = rooms.map(room => ({ ...room, name: room.walls.includes('a-3') ? 'West' : 'East' }));
    // Drag West's label deep into East.
    floor.rooms.find(r => r.name === 'West')!.labelOffset = { x: 400, y: 0 };
    const file: any = projectToPreparedRoomPlan(project);
    const west = file.sections.find((s: any) => s.displayName === 'West'), east = file.sections.find((s: any) => s.displayName === 'East');
    expect(west.center[0]).toBeGreaterThan(0); expect(west.center[0]).toBeLessThan(4);
    expect(east.center[0]).toBeGreaterThan(4); expect(east.center[0]).toBeLessThan(8);
    const back = createProjectFromRoomPlan(JSON.parse(JSON.stringify(file)), 'Back');
    const named = (name: string) => back.floors[0].rooms.find(r => r.name === name)!;
    expect(named('West').walls).toContain('a-3');
    expect(named('East').walls).toContain('b-1');
  });

  it('keeps the names of a hall and of the office built against its outer wall', () => {
    const project = createDefaultProject('Hall');
    const floor = project.floors[0];
    const leg = (id: string, x: number, y: number, xx: number, yy: number) => ({ ...rectangleWalls()[0], id, start: { x, y }, end: { x: xx, y: yy } });
    floor.walls = [leg('north', 0, 0, 4000, 0), leg('east', 4000, 0, 4000, 3000), leg('south', 4000, 3000, 0, 3000), leg('west', 0, 3000, 0, 0),
      leg('office-west', 1500, 0, 1500, 1700), leg('office-south', 1500, 1700, 2500, 1700), leg('office-east', 2500, 1700, 2500, 0)];
    floor.rooms = resolveRooms(floor).map(room => ({ ...room, name: room.walls.includes('south') ? 'Hall' : 'Office' }));
    // The hall's section anchor must not land in the office, which its outline used to include.
    const back = createProjectFromRoomPlan(JSON.parse(JSON.stringify(projectToPreparedRoomPlan(project))), 'Back');
    expect(back.floors[0].rooms.map(({ name, area, walls }) => ({ name, area, south: walls.includes('south') }))
      .sort((a, b) => a.name.localeCompare(b.name))).toEqual([{ name: 'Hall', area: 1030, south: true }, { name: 'Office', area: 170, south: false }]);
  });

  it('keeps retained interchange state through the native project reader and rejects damaged state', () => {
    const project = webProject();
    project.interchange = { version: 1, blocks: { opencatio3d: { schema: 'opencatio3d/project@0.1', structures: [] } }, attributes: { crate: { opencatio3dKind: 'tunnel', segment: 0 } }, defaults: { ceilingHeight: 2.4 }, planNotes: 'Catio' };
    const loaded = readProject(JSON.parse(JSON.stringify(project)));
    expect(loaded.interchange).toEqual(project.interchange);
    expect(loaded.interchange).not.toBe(project.interchange);
    expect(readProject(JSON.parse(JSON.stringify(createDefaultProject('Plain'))))).not.toHaveProperty('interchange');
    const bad: [string, (state: any) => void, string][] = [
      ['unsupported version', s => { s.version = 2; }, 'interchange.version'],
      ['missing blocks', s => { delete s.blocks; }, 'interchange.blocks'],
      ['array blocks', s => { s.blocks = []; }, 'interchange.blocks'],
      ['text block', s => { s.blocks.opencatio3d = 'text'; }, 'interchange.blocks.opencatio3d'],
      ['array attributes', s => { s.attributes = []; }, 'interchange.attributes'],
      ['text attributes entry', s => { s.attributes.crate = 'tunnel'; }, 'interchange.attributes.crate'],
      ['text defaults', s => { s.defaults = '2.4'; }, 'interchange.defaults'],
      ['numeric notes', s => { s.planNotes = 7; }, 'interchange.planNotes'],
      ['null state', s => { Object.keys(s).forEach(k => delete s[k]); }, 'interchange.version'],
    ];
    for (const [, damage, path] of bad) {
      const copy = JSON.parse(JSON.stringify(project)), before = JSON.stringify(copy);
      damage(copy.interchange);
      expect(() => readProject(copy), path).toThrow(path);
      expect(JSON.stringify(copy)).not.toBe(before);
    }
    const copy = JSON.parse(JSON.stringify(project));
    copy.interchange = null;
    expect(() => readProject(copy)).toThrow('interchange');
  });

  it('formats sorted JSON and safe file names', () => {
    expect(sortedJson({ b: 1, a: [{ d: null, c: [3, { z: 0, y: 'y' }] }] })).toBe('{"a":[{"c":[3,{"y":"y","z":0}],"d":null}],"b":1}');
    expect(sortedJson({ b: 1, a: 2 }, 2)).toBe('{\n  "a": 2,\n  "b": 1\n}');
    expect(interchangeFileName({ name: 'Lake House / Draft #2' })).toBe('Lake-House-Draft-2-openplan3d.json');
    expect(interchangeFileName({ name: '  ' })).toBe('plan-openplan3d.json');
    expect(interchangeFileName({ name: 'Cozinha à beira-mar' })).toBe('Cozinha-beira-mar-openplan3d.json');
    expect(interchangeFileName(webProject())).toBe('Lake-House-Draft-2-openplan3d.json');
  });
});

describe('interchangeProjectName', () => {
  it('prefers the sibling block title, cleaned, over the caller fallback', () => {
    expect(interchangeProjectName({ walls: [], openkitchen3d: { name: '  Sample Kitchen\u0000 ' } }, 'Room Capture ABCD2345')).toBe('Sample Kitchen');
    expect(interchangeProjectName({ walls: [], openlandscape3d: { name: 'Back garden' }, opencatio3d: { name: 'Catio' } }, 'x')).toBe('Back garden');
    expect(interchangeProjectName({ walls: [], opencatio3d: { name: 'x'.repeat(200) } }, 'x').length).toBe(120);
  });
  it('keeps the fallback for plain captures, missing or blank titles and non-objects', () => {
    expect(interchangeProjectName({ walls: [], sections: [{ displayName: 'Kitchen' }] }, 'Room Capture ABCD2345')).toBe('Room Capture ABCD2345');
    expect(interchangeProjectName({ walls: [], openkitchen3d: { name: '   ' } }, 'fallback')).toBe('fallback');
    expect(interchangeProjectName({ walls: [], openkitchen3d: { name: 7 } }, 'fallback')).toBe('fallback');
    expect(interchangeProjectName(null, 'fallback')).toBe('fallback');
    expect(interchangeProjectName('text', 'fallback')).toBe('fallback');
  });
});
