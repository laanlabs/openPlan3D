import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { readProject } from '$lib/utils/projectValidation';
import { houseTemplates } from '$lib/utils/houseTemplates';
import { createProjectFromRoomPlan } from '$lib/utils/roomplanImport';
import { roomProject } from './fixtures/project';

function completeProject(): any {
  const project: any = roomProject(), floor = project.floors[0];
  project.description = 'Preserve notes'; project.extensions = { version: 7, note: 'future metadata' };
  floor.elevation = -325.125;
  floor.walls[0] = { ...floor.walls[0], thickness: 21.125, startHeight: 0, endHeight: 290.75, curvePoint: { x: 200.25, y: -45.125 }, extensions: { source: 'survey' } };
  floor.doors = [{ id: 'door', wallId: floor.walls[0].id, position: 0, width: 95.125, height: 207.25, type: 'double', swingDirection: 'right', flipSide: true }];
  floor.windows = [{ id: 'window', wallId: floor.walls[1].id, position: 1, width: 100.5, height: 120.25, sillHeight: 0, type: 'casement' }];
  floor.furniture = [{ id: 'chair', catalogId: 'future-catalog-item', position: { x: 80.5, y: -20.25 }, rotation: -45.5, scale: { x: -1, y: 2.5, z: -1 }, width: 81.125, depth: 60.25, height: 85.75, elevation: 72.5, locked: true, material: 'Wood' }];
  floor.stairs = [{ id: 'stair', position: { x: 50, y: 75 }, rotation: 90, elevation: -12.25, width: 95.5, depth: 302.5, riserCount: 14, direction: 'down', stairType: 'l-shaped' }];
  floor.columns = [{ id: 'column', position: { x: 40, y: 30 }, rotation: 0, elevation: 0, shape: 'round', diameter: 25.5, height: 270.25, color: '#ccc' }];
  floor.rooms = [{ id: 'room', name: 'Kitchen', walls: floor.walls.map((wall: any) => wall.id), area: 12.5, floorTexture: 'oak', color: '#fff', roomType: 'kitchen', labelOffset: { x: 2.25, y: -4.5 } }];
  floor.guides = [{ id: 'guide', orientation: 'vertical', position: -2.5 }];
  floor.measurements = [{ id: 'measurement', x1: 0, y1: 0, x2: 10.25, y2: -4.5 }];
  floor.annotations = [{ id: 'dimension', x1: 0, y1: 0, x2: 50.75, y2: 0, offset: -40.25, label: 'Entry' }];
  floor.textAnnotations = [{ id: 'text', x: 20.25, y: 30.75, text: 'Kitchen notes', fontSize: 16, color: '#111', rotation: 90, elevation: 150.5 }];
  floor.groups = [{ id: 'group', elementIds: ['chair', 'column'] }];
  floor.backgroundImage = { dataUrl: 'data:image/png;base64,AA==', position: { x: -30, y: 10 }, scale: 0.5, opacity: 0, rotation: -25, locked: true };
  floor.entourage = [{ id: 'symbol', defId: 'custom-tree', position: { x: 20, y: 30 }, rotation: 45, elevation: 5.25, width: 70.125, opacity: 0, locked: true }];
  project.customEntourage = [{ id: 'custom-tree', name: 'Tree', dataUrl: 'data:image/png;base64,AA==', aspect: 1.25 }];
  return project;
}

describe('native project reader', () => {
  it('round trips complete geometry, mirrored objects, zero heights/sills, attachments and extension metadata without mutation', () => {
    const source = completeProject(), before = structuredClone(source);
    const loaded = readProject(JSON.parse(JSON.stringify(source)));
    expect(loaded).toEqual(source); expect(source).toEqual(before);
    expect(loaded.floors[0]).not.toBe(source.floors[0]);
    expect(loaded.createdAt).toBeInstanceOf(Date);
  });
  it.each(houseTemplates.map(template => [template.name, template.create] as const))('accepts the shipped %s template unchanged', (_, create) => {
    const source = create(); expect(readProject(source)).toEqual(source);
  });
  it.each(['connected-dimensions.openplan.json', 'sloped-walls.openplan.json'])('keeps %s stable after the first legacy migration', name => {
    const value = JSON.parse(readFileSync(`tests/fixtures/${name}`, 'utf8'));
    const loaded = readProject(value); expect(readProject(JSON.parse(JSON.stringify(loaded)))).toEqual(loaded);
  });
  it('accepts generated iPhone handoff geometry and preserves every floor', () => {
    const source = createProjectFromRoomPlan(JSON.parse(readFileSync('tests/fixtures/handoff-roomplan.json', 'utf8')), 'iPhone');
    expect(readProject(source)).toEqual(source);
  });
  it('migrates only missing legacy fields and keeps input bytes unchanged', () => {
    const source: any = { id: 'legacy', floors: [{ id: 'ground', walls: [{ id: 'wall', start: { x: 0, y: 0 }, end: { x: 250.75, y: 0 }, thickness: 15 }], doors: [{ id: 'door', wallId: 'wall', position: 0.5, width: 90.25 }] }] };
    const before = JSON.stringify(source), loaded = readProject(source), floor = loaded.floors[0];
    expect(JSON.stringify(source)).toBe(before);
    expect(loaded).toMatchObject({ id: 'legacy', name: 'Untitled Project', activeFloorId: 'ground', createdAt: new Date(0), updatedAt: new Date(0) });
    expect(floor).toMatchObject({ name: 'Ground Floor', level: 0, rooms: [], furniture: [], windows: [], stairs: [], columns: [], guides: [], measurements: [], annotations: [], textAnnotations: [], groups: [] });
    expect(floor.walls[0]).toMatchObject({ height: 280, color: '#444444', end: { x: 250.75, y: 0 } });
    expect(floor.doors[0]).toMatchObject({ width: 90.25, height: 210, flipSide: false, swingDirection: 'left', type: 'single' });
  });
  it('allows floor-local repeated IDs, obsolete metadata memberships and legacy active-floor fallback', () => {
    const project = completeProject();
    project.floors.push({ ...structuredClone(project.floors[0]), id: 'upper', level: 1 });
    project.activeFloorId = 'removed-floor';
    project.floors[0].rooms[0].walls.push('removed-wall'); project.floors[0].groups[0].elementIds.push('removed-chair');
    const loaded = readProject(project);
    expect(loaded.activeFloorId).toBe(project.floors[0].id);
    expect(loaded.floors).toEqual(project.floors);
  });
  const bad: [string, (p: any) => void, string][] = [
    ['null point', p => p.floors[0].walls[0].start = null, 'walls[0].start'],
    ['string coordinate', p => p.floors[0].walls[0].end.x = '20', 'walls[0].end.x'],
    ['nonfinite coordinate', p => p.floors[0].walls[0].end.y = Infinity, 'walls[0].end.y'],
    ['NaN coordinate', p => p.floors[0].furniture[0].position.x = NaN, 'furniture[0].position.x'],
    ['negative thickness', p => p.floors[0].walls[0].thickness = -1, 'walls[0].thickness'],
    ['null height', p => p.floors[0].walls[0].height = null, 'walls[0].height'],
    ['negative endpoint height', p => p.floors[0].walls[0].startHeight = -1, 'walls[0].startHeight'],
    ['invalid curve', p => p.floors[0].walls[0].curvePoint.y = null, 'walls[0].curvePoint.y'],
    ['zero opening width', p => p.floors[0].doors[0].width = 0, 'doors[0].width'],
    ['invalid opening position', p => p.floors[0].doors[0].position = 1.01, 'doors[0].position'],
    ['missing parent wall', p => p.floors[0].doors[0].wallId = 'missing', 'doors[0].wallId'],
    ['negative sill', p => p.floors[0].windows[0].sillHeight = -1, 'windows[0].sillHeight'],
    ['unsupported door type', p => p.floors[0].doors[0].type = 'future-door', 'doors[0].type'],
    ['invalid flip', p => p.floors[0].doors[0].flipSide = 1, 'doors[0].flipSide'],
    ['null array', p => p.floors[0].rooms = null, 'floors[0].rooms'],
    ['object array', p => p.floors[0].furniture = {}, 'floors[0].furniture'],
    ['null array entry', p => p.floors[0].columns = [null], 'columns[0]'],
    ['duplicate floor', p => p.floors.push(structuredClone(p.floors[0])), 'floors[1].id'],
    ['duplicate element', p => p.floors[0].doors[0].id = p.floors[0].walls[0].id, 'doors[0].id'],
    ['null scale', p => p.floors[0].furniture[0].scale = null, 'furniture[0].scale'],
    ['invalid scale', p => p.floors[0].furniture[0].scale.z = Infinity, 'furniture[0].scale.z'],
    ['invalid dimension override', p => p.floors[0].furniture[0].width = -50, 'furniture[0].width'],
    ['fractional risers', p => p.floors[0].stairs[0].riserCount = 1.5, 'stairs[0].riserCount'],
    ['null column height', p => p.floors[0].columns[0].height = null, 'columns[0].height'],
    ['invalid guide', p => p.floors[0].guides[0].orientation = 'diagonal', 'guides[0].orientation'],
    ['invalid measurement', p => p.floors[0].measurements[0].x1 = '0', 'measurements[0].x1'],
    ['invalid annotation', p => p.floors[0].annotations[0].offset = null, 'annotations[0].offset'],
    ['invalid text size', p => p.floors[0].textAnnotations[0].fontSize = -16, 'textAnnotations[0].fontSize'],
    ['invalid group', p => p.floors[0].groups[0].elementIds = 'chair', 'groups[0].elementIds'],
    ['invalid image scale', p => p.floors[0].backgroundImage.scale = 0, 'backgroundImage.scale'],
    ['invalid symbol opacity', p => p.floors[0].entourage[0].opacity = 2, 'entourage[0].opacity'],
    ['invalid attachment', p => p.customEntourage[0].aspect = 0, 'customEntourage[0].aspect'],
    ['duplicate custom symbol', p => p.customEntourage.push({ ...p.customEntourage[0] }), 'customEntourage[1].id'],
    ['invalid date', p => p.createdAt = 'not a date', 'createdAt'],
    ['null date', p => p.updatedAt = null, 'updatedAt'],
    ['nonfinite elevation', p => p.floors[0].elevation = Infinity, 'floors[0].elevation'],
    ['nonfinite furniture elevation', p => p.floors[0].furniture[0].elevation = Infinity, 'furniture[0].elevation'],
    ['invalid stair elevation', p => p.floors[0].stairs[0].elevation = null, 'stairs[0].elevation'],
    ['invalid column elevation', p => p.floors[0].columns[0].elevation = NaN, 'columns[0].elevation'],
    ['invalid text elevation', p => p.floors[0].textAnnotations[0].elevation = 'high', 'textAnnotations[0].elevation'],
    ['invalid symbol elevation', p => p.floors[0].entourage[0].elevation = Infinity, 'entourage[0].elevation'],
  ];
  it.each(bad)('rejects %s before changing the input', (_, change, path) => {
    const project = completeProject(); change(project); const before = structuredClone(project);
    expect(() => readProject(project)).toThrow(path); expect(project).toEqual(before);
  });
  it.each([null, [], {}, { id: 'bad', floors: [] }, { id: 'bad', floors: [null] }, { id: 'bad', floors: [{ id: 'floor' }] }])('rejects an incomplete top-level structure: %s', data => {
    expect(() => readProject(data)).toThrow('Invalid project:');
  });
});
