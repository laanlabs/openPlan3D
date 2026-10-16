import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import type { Floor } from '$lib/models/types';
import { selectionRotation } from '$lib/utils/selectionRotation';
import { createDefaultProject, loadProject, currentProject, rotateSelection, undo, redo, undoHistoryStore } from '$lib/stores/project';
import { rectangleWalls } from './fixtures/project';

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

it('rotates walls rigidly with the selection: lengths and shared corners survive, openings ride along, one undo restores', () => {
  const project=createDefaultProject(),floor=project.floors[0];
  floor.walls=[...rectangleWalls('w'),{id:'apart',start:{x:600,y:0},end:{x:800,y:0},curvePoint:{x:700,y:50},thickness:15,height:250,color:'#eee'}];
  floor.doors=[{id:'door',wallId:'w-0',position:0.25,width:90,height:210,type:'single',swingDirection:'left',flipSide:false}];
  floor.windows=[{id:'win',wallId:'w-2',position:0.6,width:120,height:120,sillHeight:90,type:'standard'}];
  floor.furniture=[{id:'chair',catalogId:'chair',position:{x:200,y:150},rotation:10,scale:{x:1,y:1,z:1},width:60,depth:40}];
  loadProject(project);const before=structuredClone(get(currentProject)!.floors[0]);
  const ids=new Set(['w-0','w-1','w-2','w-3','door','win','chair']);
  const updates=selectionRotation(before,ids,90);
  expect([...updates.keys()].sort()).toEqual(['chair','w-0','w-1','w-2','w-3']);
  expect(get(currentProject)!.floors[0]).toEqual(before);
  rotateSelection(ids,90);
  const after=structuredClone(get(currentProject)!.floors[0]);
  // The pivot is the centre of the wall endpoints and the chair, (200,150), so the 400×300 rectangle turns in place.
  const length=(wall:{start:{x:number;y:number};end:{x:number;y:number}})=>Math.hypot(wall.end.x-wall.start.x,wall.end.y-wall.start.y);
  before.walls.slice(0,4).forEach((wall,i)=>{
    const rotated=after.walls[i],next=after.walls[(i+1)%4];
    expect(length(rotated)).toBeCloseTo(length(wall),9);
    expect(rotated.end.x).toBeCloseTo(next.start.x,9);expect(rotated.end.y).toBeCloseTo(next.start.y,9);
    expect(rotated).toMatchObject({id:wall.id,thickness:wall.thickness,height:wall.height,color:wall.color});
    expect(rotated.curvePoint).toBeUndefined();
  });
  expect(after.walls[0].start.x).toBeCloseTo(350,9);expect(after.walls[0].start.y).toBeCloseTo(-50,9);
  expect(after.walls[0].end.x).toBeCloseTo(350,9);expect(after.walls[0].end.y).toBeCloseTo(350,9);
  expect(after.walls[2].start.x).toBeCloseTo(50,9);expect(after.walls[2].start.y).toBeCloseTo(350,9);
  expect(after.walls[4]).toEqual(before.walls[4]);
  expect(after.furniture[0].position.x).toBeCloseTo(200,9);expect(after.furniture[0].position.y).toBeCloseTo(150,9);
  expect(after.furniture[0].rotation).toBe(100);
  expect(after.doors).toEqual(before.doors);expect(after.windows).toEqual(before.windows);
  expect(get(undoHistoryStore).entries.map(entry=>entry.description)).toEqual(['Rotated selection']);
  undo();expect(get(currentProject)!.floors[0]).toEqual(before);
  redo();expect(get(currentProject)!.floors[0]).toEqual(after);
});
it('rotates a curved wall and its control point around the wall midpoint', () => {
  const project=createDefaultProject();
  project.floors[0].walls=[{id:'arc',start:{x:0,y:0},end:{x:200,y:0},curvePoint:{x:100,y:50},thickness:15,height:250,color:'#eee'}];
  const update=selectionRotation(project.floors[0],new Set(['arc']),90).get('arc')!;
  expect(update.rotation).toBe(90);
  expect(update.wall!.start.x).toBeCloseTo(100,9);expect(update.wall!.start.y).toBeCloseTo(-100,9);
  expect(update.wall!.end.x).toBeCloseTo(100,9);expect(update.wall!.end.y).toBeCloseTo(100,9);
  expect(update.wall!.curvePoint!.x).toBeCloseTo(50,9);expect(update.wall!.curvePoint!.y).toBeCloseTo(0,9);
  const original=structuredClone(project.floors[0].walls[0]);
  loadProject(project);rotateSelection(new Set(['arc']),90);
  const wall=get(currentProject)!.floors[0].walls[0];
  expect(wall.curvePoint!.x).toBeCloseTo(50,9);expect(wall.curvePoint!.y).toBeCloseTo(0,9);
  expect(wall.start.y).toBeCloseTo(-100,9);expect(wall.end.y).toBeCloseTo(100,9);
  undo();expect(get(currentProject)!.floors[0].walls[0]).toEqual(original);
});

it('turns walls only as a closed group: a corner shared with an unselected wall keeps every wall still', () => {
  const floor={walls:[...rectangleWalls('w'),{id:'free',start:{x:900,y:0},end:{x:1100,y:0},thickness:15,height:250,color:'#eee'}],doors:[],windows:[],furniture:[
    {id:'chair',catalogId:'chair',position:{x:200,y:150},rotation:0,scale:{x:1,y:1,z:1}}]} as unknown as Floor;
  // R with one wall of the room selected: nothing happens, as before this change.
  expect(selectionRotation(floor,new Set(['w-0']),15).size).toBe(0);
  // Two of four walls: the chair still turns, the walls stay (their other corners are shared with w-2/w-3).
  const partial=selectionRotation(floor,new Set(['w-0','w-1','chair']),90);
  expect([...partial.keys()]).toEqual(['chair']);
  // The whole loop turns together.
  const whole=selectionRotation(floor,new Set(['w-0','w-1','w-2','w-3']),90);
  expect([...whole.keys()].sort()).toEqual(['w-0','w-1','w-2','w-3']);
  // A wall joined to nothing may turn on its own.
  const lone=selectionRotation(floor,new Set(['free']),90).get('free')!;
  expect(lone.wall!.start.x).toBeCloseTo(1000,9);expect(lone.wall!.start.y).toBeCloseTo(-100,9);
  expect(lone.wall!.end.x).toBeCloseTo(1000,9);expect(lone.wall!.end.y).toBeCloseTo(100,9);
});
