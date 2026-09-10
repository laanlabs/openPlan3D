import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { Floor } from '$lib/models/types';
import { selectionRotation } from '$lib/utils/selectionRotation';
import { createDefaultProject, loadProject, currentProject, rotateSelection, undo, redo } from '$lib/stores/project';

it('rotates a group rigidly around its movable bounds and excludes locked/unselected objects', () => {
  const floor={walls:[],doors:[],windows:[],furniture:[],entourage:[
    {id:'a',defId:'person',position:{x:0,y:0},width:50,rotation:0},
    {id:'b',defId:'person',position:{x:100,y:0},width:50,rotation:0},
    {id:'locked',defId:'person',position:{x:1e6,y:1e6},width:50,rotation:0,locked:true},
    {id:'ignored',defId:'person',position:{x:-1e6,y:-1e6},width:50,rotation:0}
  ]} as unknown as Floor;
  const before=structuredClone(floor),updates=selectionRotation(floor,new Set(['a','b','locked']),90);
  expect([...updates.keys()]).toEqual(['a','b']);
  expect(updates.get('a')!.position.x).toBeCloseTo(50);expect(updates.get('a')!.position.y).toBeCloseTo(-50);
  expect(updates.get('b')!.position.x).toBeCloseTo(50);expect(updates.get('b')!.position.y).toBeCloseTo(50);
  expect(updates.get('a')!.rotation).toBe(90);expect(floor).toEqual(before);
});
it.each(['furniture','stairs','columns','entourage'])('rotates a single %s in place and normalizes negative angles', kind => {
  const floor={walls:[],doors:[],windows:[],furniture:[],[kind]:[{id:'item',position:{x:123,y:456},rotation:10}]} as unknown as Floor;
  expect(selectionRotation(floor,new Set(['item']),-30).get('item')).toEqual({position:{x:123,y:456},rotation:340});
});
it('preserves no-op history and undoes the whole rotation in one step', () => {
  const project=createDefaultProject();project.floors[0].entourage=[
    {id:'a',defId:'person',position:{x:0,y:0},width:50,rotation:0},
    {id:'b',defId:'person',position:{x:100,y:0},width:50,rotation:0}];
  loadProject(project);const before=structuredClone(get(currentProject)!.floors[0]);
  rotateSelection(new Set(['a','b']),90);const rotated=structuredClone(get(currentProject)!.floors[0]);
  rotateSelection(new Set(['a','b']),360);rotateSelection(new Set(['a']),NaN);rotateSelection(new Set(['absent']));
  undo();expect(get(currentProject)!.floors[0]).toEqual(before);redo();expect(get(currentProject)!.floors[0]).toEqual(rotated);
});
