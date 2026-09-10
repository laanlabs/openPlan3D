import { get } from 'svelte/store';
import { createDefaultProject, loadProject, currentProject, removeElement, undo } from '$lib/stores/project';
import { expect, it } from 'vitest';
import type { Floor } from '$lib/models/types';
import { duplicatePlanSelection } from '$lib/utils/duplicateSelection';

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
  const floor = {walls:[],furniture:[],doors:[{id:'d',wallId:'w',position:.95}],windows:[],groups:[{id:'g',elementIds:['d','missing']}]} as unknown as Floor;
  expect(duplicatePlanSelection(floor,new Set(['d','missing']),()=> 'copy')).toEqual(['copy']);
  expect(floor.doors[1]).toMatchObject({wallId:'w',position:1});
  expect(floor.groups).toHaveLength(1);
  const before = structuredClone(floor);
  expect(duplicatePlanSelection(floor,new Set(['absent']),()=> 'unused')).toEqual([]);
  expect(floor).toEqual(before);
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
