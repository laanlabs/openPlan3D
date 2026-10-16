import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import { activeFloor, addFloor, addFurniture, currentProject, loadProject, redo, setActiveFloor, undo, updateWall } from '$lib/stores/project';
import { projectSettings } from '$lib/stores/settings';
import { framingContext, shouldFrameScene, type FramingContext } from '$lib/utils/sceneFraming';
import { benchmarkProject } from './fixtures/render-benchmark';

const home: FramingContext = { projectId: 'home', floorId: 'ground', stacked: false };

it('fits the first build and every new project, active floor or stacking choice', () => {
  expect(shouldFrameScene(null, home)).toBe(true);
  expect(shouldFrameScene(home, { ...home, floorId: 'upper' })).toBe(true);
  expect(shouldFrameScene(home, { ...home, stacked: true })).toBe(true);
  expect(shouldFrameScene({ ...home, stacked: true }, home)).toBe(true);
  // A saved copy keeps its floor ids, but it is another project.
  expect(shouldFrameScene(home, { ...home, projectId: 'home-copy' })).toBe(true);
});

it('keeps the viewpoint when the same context rebuilds', () => {
  expect(shouldFrameScene(home, { ...home })).toBe(false);
  expect(shouldFrameScene(home, framingContext({ id: 'home' }, { id: 'ground' }, false))).toBe(false);
});

// Mirrors the viewer: each activeFloor emission, unit change, arriving photo texture and stacking
// toggle rebuilds the scene, and the context of that rebuild decides whether the camera is fitted.
it('re-frames for floor, stacking and project changes, never for edits, history, units or textures', () => {
  let step = 'open', stacked = false, framed: FramingContext | null = null;
  const rebuilt = new Set<string>(), frames: string[] = [];
  const rebuild = () => {
    const project = get(currentProject), floor = get(activeFloor);
    if (!project || !floor) return;
    rebuilt.add(step);
    const context = framingContext(project, floor, stacked);
    if (shouldFrameScene(framed, context)) frames.push(step);
    framed = context;
  };
  const act = (name: string, action: () => void) => { step = name; action(); };
  loadProject(structuredClone(benchmarkProject('medium')));
  const stopFloor = activeFloor.subscribe(floor => { if (floor) rebuild(); });
  const stopSettings = projectSettings.subscribe(rebuild);
  try {
    const wall = get(activeFloor)!.walls[0].id;
    act('furniture', () => addFurniture('armchair', { x: 200, y: 200 }));
    act('wall colour', () => updateWall(wall, { color: '#336699' }));
    act('wall height', () => updateWall(wall, { height: 300 }));
    act('undo', undo);
    act('redo', redo);
    act('texture', rebuild);
    act('units', () => projectSettings.update(settings => ({ ...settings, units: 'imperial' })));
    act('stack', () => { stacked = true; rebuild(); });
    act('furniture while stacked', () => addFurniture('sofa', { x: 600, y: 200 }));
    act('unstack', () => { stacked = false; rebuild(); });
    act('switch floor', () => setActiveFloor('bench-medium-1'));
    act('add floor', () => addFloor());
    // Undoing the new floor shows a different floor again, which is a floor switch.
    act('undo add floor', undo);
    act('other project', () => loadProject(structuredClone(benchmarkProject('small'))));
    expect([...rebuilt]).toEqual(['open', 'furniture', 'wall colour', 'wall height', 'undo', 'redo', 'texture', 'units',
      'stack', 'furniture while stacked', 'unstack', 'switch floor', 'add floor', 'undo add floor', 'other project']);
    expect(frames).toEqual(['open', 'stack', 'unstack', 'switch floor', 'add floor', 'undo add floor', 'other project']);
  } finally {
    stopFloor(); stopSettings(); projectSettings.reset();
  }
});
