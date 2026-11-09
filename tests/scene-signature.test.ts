import { expect, it } from 'vitest';
import { sceneSignature } from '$lib/utils/sceneSignature';
import { benchmarkProject } from './fixtures/render-benchmark';
import type { Project } from '$lib/models/types';

const signature = (project: Project, stacked = false) => sceneSignature(project, project.floors[0], stacked, 'metric');

it('ignores project metadata, item details and 2D payloads without serializing photos', () => {
  const project = benchmarkProject('medium'), before = signature(project, true);
  project.name = 'Renamed'; project.description = 'New description'; project.updatedAt = new Date();
  const unread = { toJSON() { throw new Error('Large photo payload must not be visited'); } };
  Object.assign(project, { projectPackage: unread, attachmentNames: unread, customEntourage: unread });
  for (const floor of project.floors) {
    for (const key of ['walls', 'rooms', 'doors', 'windows', 'furniture'] as const)
      for (const item of floor[key]) item.details = { note: 'New note', price: 45, material: 'Metadata only', ceilingHeight: 240, photos: ['assets/photo.jpg'] };
    Object.assign(floor, { backgroundImage: unread, guides: unread, measurements: unread,
      annotations: unread, textAnnotations: unread, groups: unread, entourage: unread });
  }
  expect(signature(project, true)).toBe(before);
});

it('detects in-place geometry edits and the same values after history restores cloned objects', () => {
  const project = benchmarkProject('small'), history = structuredClone(project), before = signature(project);
  project.floors[0].walls[0].end.x += 25;
  const after = signature(project);
  expect(after).not.toBe(before);
  expect(signature(structuredClone(history))).toBe(before);
  expect(signature(structuredClone(project))).toBe(after);
});

for (const [name, edit] of Object.entries({
  'wall slope': (p: Project) => { p.floors[0].walls[0].endHeight = 150; },
  'wall curve': (p: Project) => { p.floors[0].walls[0].curvePoint = { x: 200, y: 50 }; },
  'wall finish': (p: Project) => { p.floors[0].walls[0].interiorTexture = 'brick'; },
  'door swing': (p: Project) => { p.floors[0].doors[0].flipSide = true; },
  'window height': (p: Project) => { p.floors[0].windows[0].sillHeight = 10; },
  'furniture finish': (p: Project) => { p.floors[0].furniture[0].material = 'wood'; },
  'furniture size': (p: Project) => { p.floors[0].furniture[0].width = 110; },
  'room label': (p: Project) => { p.floors[0].rooms[0].name = 'Kitchen'; },
  'room finish': (p: Project) => { p.floors[0].rooms[0].floorTexture = 'wood'; },
  'column': (p: Project) => { p.floors[0].columns.push({ id: 'column', shape: 'round', position: { x: 0, y: 0 }, rotation: 0, diameter: 30, height: 280, color: '#aaa' }); },
  'future render field': (p: Project) => { Object.assign(p.floors[0].walls[0], { futureRenderField: true }); },
})) it(`invalidates ${name}`, () => {
  const project = benchmarkProject('small'), before = signature(project);
  edit(project); expect(signature(project)).not.toBe(before);
});

it('includes other floor geometry, names, elevations and order only when stacked', () => {
  const project = benchmarkProject('medium'), active = signature(project);
  for (const edit of [
    () => { project.floors[1].walls[0].thickness += 5; },
    () => { project.floors[1].elevation = -300; },
    () => { project.floors[1].name = 'Basement'; },
  ]) {
    const stacked = signature(project, true); edit();
    expect(signature(project)).toBe(active); expect(signature(project, true)).not.toBe(stacked);
  }
  const floor = project.floors[0], before = sceneSignature(project, floor, true, 'metric');
  project.floors.reverse();
  expect(sceneSignature(project, floor, true, 'metric')).not.toBe(before);
});

it('invalidates project replacement, active floor, stacking and label units', () => {
  const project = benchmarkProject('medium'), before = signature(project);
  expect(sceneSignature(project, project.floors[1], false, 'metric')).not.toBe(before);
  expect(sceneSignature(project, project.floors[0], true, 'metric')).not.toBe(before);
  expect(sceneSignature(project, project.floors[0], false, 'imperial')).not.toBe(before);
  project.id = 'replacement'; expect(signature(project)).not.toBe(before);
});

it('rebuilds for the other-floors style only while floors are stacked (issue #130)', () => {
  const project = benchmarkProject('medium'), floor = project.floors[0];
  expect(sceneSignature(project, floor, true, 'metric', 'solid'))
    .not.toBe(sceneSignature(project, floor, true, 'metric', 'translucent'));
  expect(sceneSignature(project, floor, true, 'metric')).toBe(sceneSignature(project, floor, true, 'metric', 'translucent'));
  expect(sceneSignature(project, floor, false, 'metric', 'solid')).toBe(sceneSignature(project, floor, false, 'metric', 'translucent'));
});
