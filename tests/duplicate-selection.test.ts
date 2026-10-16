import { get } from 'svelte/store';
import { createDefaultProject, loadProject, currentProject, removeElement, undo, duplicateDoor, duplicateWindow, duplicateSelection, pasteSelection } from '$lib/stores/project';
import { expect, it } from 'vitest';
import type { Floor, Wall } from '$lib/models/types';
import { duplicatePlanSelection, pastePlanSelection, shiftedOpeningPosition } from '$lib/utils/duplicateSelection';
import { pathOpening, wallPathProfile } from '$lib/utils/wallProfiles';

it('copies mixed geometry, carried openings and complete groups without aliasing originals', () => {
  const floor = { walls:[{id:'w',start:{x:0,y:0},end:{x:200,y:0},curvePoint:{x:100,y:80}}],
    doors:[{id:'d',wallId:'w',position:.4}],windows:[{id:'win',wallId:'w',position:.6}],
    furniture:[{id:'f',position:{x:50,y:40},details:{note:'keep'},locked:true}],
    stairs:[{id:'s',position:{x:60,y:70},stairType:'l-shaped'}],
    columns:[{id:'c',position:{x:80,y:90},rotation:35}],
    entourage:[{id:'e',defId:'custom',position:{x:100,y:120},opacity:.6}],
    groups:[{id:'g',elementIds:['f','e']}]
  } as unknown as Floor;
  const original = structuredClone(floor); let counter = 0;
  const ids = duplicatePlanSelection(floor,new Set(['w','d','f','s','c','e']),()=>`new-${++counter}`);
  expect(ids).toHaveLength(7); expect(new Set(ids).size).toBe(7);
  expect(floor.walls[1]).toMatchObject({start:{x:30,y:30},end:{x:230,y:30},curvePoint:{x:130,y:110}});
  expect(floor.doors[1]).toMatchObject({wallId:floor.walls[1].id,position:.4});
  expect(floor.windows[1]).toMatchObject({wallId:floor.walls[1].id,position:.6});
  for (const key of ['furniture','stairs','columns','entourage'] as const) {
    expect(floor[key]![1].position).toEqual({x:original[key]![0].position.x+30,y:original[key]![0].position.y+30});
    expect(floor[key]![0]).toEqual(original[key]![0]);
  }
  expect(floor.groups![1].elementIds).toEqual([floor.furniture[1].id,floor.entourage![1].id]);
  expect(floor.furniture[1].details).not.toBe(floor.furniture[0].details);
  expect(floor.furniture[1].locked).toBe(true);
  expect(floor.entourage![1]).toMatchObject({defId:'custom',opacity:.6});
});

it('keeps standalone openings on their wall and skips missing selections and partial groups', () => {
  const floor = {walls:[{id:'w',start:{x:0,y:0},end:{x:200,y:0}}],furniture:[],doors:[{id:'d',wallId:'w',position:.95,width:90}],windows:[],groups:[{id:'g',elementIds:['d','missing']}]} as unknown as Floor;
  expect(duplicatePlanSelection(floor,new Set(['d','missing']),()=> 'copy')).toEqual(['copy']);
  // The copy's centre stops 45 cm (half the door) short of the 200 cm wall's end.
  expect(floor.doors[1]).toMatchObject({wallId:'w',position:155/200});
  expect(floor.groups).toHaveLength(1);
  const before = structuredClone(floor);
  expect(duplicatePlanSelection(floor,new Set(['absent']),()=> 'unused')).toEqual([]);
  expect(floor).toEqual(before);
});

it('stops pasted openings at the wall end so their whole width stays on a straight wall', () => {
  const floor = {walls:[{id:'w',start:{x:0,y:0},end:{x:200,y:0}}],furniture:[],groups:[],
    doors:[{id:'d',wallId:'w',position:.5,width:90}],windows:[{id:'win',wallId:'w',position:.5,width:100}]} as unknown as Floor;
  const source = structuredClone(floor); let i = 0;
  for (const step of [1,2,3,4]) pastePlanSelection(source,floor,new Set(['d','win']),()=>`copy-${++i}`,step);
  expect(floor.doors.slice(1).map(d => d.position)).toEqual([.5+.1,.5+.2,155/200,155/200]);
  expect(floor.windows.slice(1).map(w => w.position)).toEqual([.5+.1,.5+.2,150/200,150/200]);
  for (const opening of [...floor.doors,...floor.windows]) {
    expect(opening.position*200-opening.width/2).toBeGreaterThanOrEqual(0);
    expect(opening.position*200+opening.width/2).toBeLessThanOrEqual(200+1e-9);
  }
});

it('measures the clamp along a curved wall and centres an opening wider than its wall', () => {
  const curved = {id:'c',start:{x:0,y:0},end:{x:400,y:0},curvePoint:{x:200,y:160}} as Wall;
  const floor = {walls:[curved,{id:'s',start:{x:0,y:0},end:{x:0,y:200}}],furniture:[],groups:[],windows:[],
    doors:[{id:'d',wallId:'c',position:.95,width:90},{id:'wide',wallId:'c',position:.2,width:600},{id:'short',wallId:'s',position:.5,width:240}]} as unknown as Floor;
  let i = 0;
  duplicatePlanSelection(floor,new Set(['d','wide','short']),()=>`copy-${++i}`);
  const [door,wide,short] = floor.doors.slice(3).map(d => d.position);
  // The curve is about 10% longer than its 400 cm chord; the jamb must land on the path's end.
  const path = wallPathProfile(curved);
  expect(path.distanceAt(door)).toBeCloseTo(path.length-45,9);
  const cut = pathOpening(path,path.distanceAt(door),90,0,210)!;
  expect(cut.right-cut.left).toBeCloseTo(90,9);
  expect(wide).toBeCloseTo(.5,9);
  expect(short).toBe(.5);
  expect(shiftedOpeningPosition(curved,{position:.95,width:90})).toBe(door);
});

it('keeps store duplicates and pastes of doors and windows wholly on their wall', () => {
  const project = createDefaultProject();
  const floor = project.floors[0];
  floor.walls = [{id:'w',start:{x:0,y:0},end:{x:200,y:0},thickness:20,height:250,color:'#fff'}];
  floor.doors = [{id:'d',wallId:'w',position:.95,width:90,height:210,type:'single',swingDirection:'left',flipSide:false}];
  floor.windows = [{id:'win',wallId:'w',position:.65,width:120,height:120,sillHeight:90,type:'standard'}];
  loadProject(project);
  const clipboard = structuredClone(get(currentProject)!.floors[0]);
  const door = duplicateDoor('d'), win = duplicateWindow('win');
  const [selected] = duplicateSelection(new Set(['d'])); // the canvas Duplicate button
  const [pasted] = pasteSelection(clipboard,new Set(['win']),3); // the third Ctrl+V
  const copied = get(currentProject)!.floors[0];
  for (const id of [door,selected]) expect(copied.doors.find(d => d.id === id)).toMatchObject({wallId:'w',position:155/200});
  for (const id of [win,pasted]) expect(copied.windows.find(w => w.id === id)).toMatchObject({wallId:'w',position:140/200});
});

it('deletion removes carried opening references and undo restores complete groups', () => {
  const project = createDefaultProject();
  const floor = project.floors[0];
  floor.walls = [{id:'w',start:{x:0,y:0},end:{x:200,y:0},thickness:20,height:250,color:'#fff'}];
  floor.doors = [{id:'d',wallId:'w',position:.5,width:80,height:210,type:'single',swingDirection:'left',flipSide:false}];
  floor.entourage = [{id:'e',defId:'person',position:{x:100,y:100},width:50,rotation:0}];
  floor.groups = [{id:'g',elementIds:['w','d','e']}];
  loadProject(project);
  removeElement('w');
  expect(get(currentProject)!.floors[0].doors).toEqual([]);
  expect(get(currentProject)!.floors[0].groups).toEqual([]);
  undo();
  expect(get(currentProject)!.floors[0].groups).toEqual([{id:'g',elementIds:['w','d','e']}]);
  expect(get(currentProject)!.floors[0].doors).toHaveLength(1);
});

it('pastes immutable saved geometry after source deletion with independent successive offsets', () => {
  const source = {walls:[],doors:[],windows:[],furniture:[],entourage:[{id:'e',defId:'person',position:{x:10,y:20},width:50,rotation:35}]} as unknown as Floor;
  const captured = structuredClone(source);
  source.entourage![0].width = 200;
  source.entourage = [];
  let i = 0;
  pastePlanSelection(captured,source,new Set(['e']),()=>`copy-${++i}`);
  pastePlanSelection(captured,source,new Set(['e']),()=>`copy-${++i}`,2);
  expect(source.entourage).toMatchObject([
    {id:'copy-1',width:50,position:{x:40,y:50},rotation:35},
    {id:'copy-2',width:50,position:{x:70,y:80},rotation:35}
  ]);
  expect(captured.entourage![0].position).toEqual({x:10,y:20});
});

it('does not create orphan standalone openings on a different floor', () => {
  const source = {walls:[],doors:[{id:'d',wallId:'missing',position:.5}],windows:[],furniture:[]} as unknown as Floor;
  const target = {walls:[],doors:[],windows:[],furniture:[]} as unknown as Floor;
  expect(pastePlanSelection(source,target,new Set(['d']),()=> 'unused')).toEqual([]);
  expect(target.doors).toEqual([]);
});

it('copies notes and dimensions without changing their styling, offsets or measured lengths', () => {
  const source = createDefaultProject().floors[0];
  source.textAnnotations=[{id:'t',x:10,y:20,text:'Keep\nthese lines',fontSize:16,rotation:35,color:'#123456'}];
  source.measurements=[{id:'m',x1:0,y1:10,x2:100,y2:210}];
  source.annotations=[{id:'a',x1:20,y1:30,x2:120,y2:230,label:'Custom',offset:-60}];
  source.groups=[{id:'g',elementIds:['t','a']}];
  const target=createDefaultProject().floors[0],before=structuredClone(source);let count=0;
  expect(pastePlanSelection(source,target,new Set(['t','m','a']),()=>`new-${++count}`,2)).toHaveLength(3);
  expect(target.textAnnotations![0]).toEqual({...source.textAnnotations[0],id:'new-1',x:70,y:80});
  expect(target.measurements![0]).toEqual({id:'new-2',x1:60,y1:70,x2:160,y2:270});
  expect(target.annotations![0]).toEqual({id:'new-3',x1:80,y1:90,x2:180,y2:290,label:'Custom',offset:-60});
  expect(target.groups![0].elementIds).toEqual(['new-1','new-3']);expect(source).toEqual(before);
});
