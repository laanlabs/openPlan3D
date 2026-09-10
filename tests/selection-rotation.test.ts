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

it.each(['measurements','annotations'])('rotates a single %s around its endpoint midpoint while preserving metadata', kind => {
  const project=createDefaultProject(),floor=project.floors[0];
  floor.measurements=[];floor.annotations=[];
  const item={id:'dimension',x1:100,y1:200,x2:300,y2:200,...(kind==='annotations'?{offset:40,label:'Keep label'}:{})};
  (floor as any)[kind]=[structuredClone(item)];loadProject(project);
  rotateSelection(new Set(['dimension']),90);
  const result=(get(currentProject)!.floors[0] as any)[kind][0];
  expect(result).toEqual({...item,x1:200,y1:100,x2:200,y2:300});
  undo();expect((get(currentProject)!.floors[0] as any)[kind][0]).toEqual(item);
});
it('rotates a note in place without changing its text, font or color', () => {
  const project=createDefaultProject();
  const note={id:'note',x:123,y:456,text:'Two\nlines',fontSize:16,color:'#123456',rotation:350};
  project.floors[0].textAnnotations=[note];loadProject(project);
  rotateSelection(new Set(['note']),30);
  expect(get(currentProject)!.floors[0].textAnnotations).toEqual([{...note,rotation:20}]);
});
it('rotates notes and dimension endpoints rigidly with an object and ignores locked objects', () => {
  const project=createDefaultProject(),floor=project.floors[0];
  floor.furniture=[];floor.entourage=[{id:'object',defId:'person',position:{x:0,y:0},width:100,rotation:0},
    {id:'locked',defId:'person',position:{x:1e6,y:1e6},width:50,rotation:0,locked:true}];
  floor.textAnnotations=[{id:'note',x:200,y:0,text:'Note',fontSize:16,color:'#123456',rotation:25}];
  floor.annotations=[{id:'dimension',x1:100,y1:100,x2:300,y2:100,offset:40,label:'Keep'}];
  loadProject(project);const before=structuredClone(get(currentProject)!.floors[0]);
  rotateSelection(new Set(['object','locked','note','dimension']),90);
  const after=structuredClone(get(currentProject)!.floors[0]),origin=after.entourage![0].position;
  expect(after.textAnnotations![0].x-origin.x).toBeCloseTo(0);
  expect(after.textAnnotations![0].y-origin.y).toBeCloseTo(200);
  expect(after.annotations![0].x1-origin.x).toBeCloseTo(-100);
  expect(after.annotations![0].y1-origin.y).toBeCloseTo(100);
  expect(after.annotations![0].x2-origin.x).toBeCloseTo(-100);
  expect(after.annotations![0].y2-origin.y).toBeCloseTo(300);
  expect(after.annotations![0].offset).toBe(40);expect(after.annotations![0].label).toBe('Keep');
  expect(after.entourage![1]).toEqual(before.entourage![1]);
  undo();expect(get(currentProject)!.floors[0]).toEqual(before);
  redo();expect(get(currentProject)!.floors[0]).toEqual(after);
});
