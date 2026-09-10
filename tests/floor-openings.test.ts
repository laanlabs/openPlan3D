import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import { roomProject } from './fixtures/project';
import { resolveRooms } from '$lib/utils/roomDetection';
import { readProject } from '$lib/utils/projectValidation';
import { currentProject, detectedRoomsStore, loadProject, updateRoom, undo, redo } from '$lib/stores/project';
import { webToNative, nativeToWeb, applyNativeEdits } from '$lib/utils/projectPackageBridge';

it('saves a detected floor opening with one undo and restores its usable area', () => {
  const project=roomProject();loadProject(project);
  const rooms=resolveRooms(project.floors[0]);detectedRoomsStore.set(rooms);
  updateRoom(rooms[0].id,{floorOpening:true});
  let floor=get(currentProject)!.floors[0];
  expect(floor.rooms[0].floorOpening).toBe(true);
  expect(resolveRooms(floor)[0].area).toBe(0);
  expect(floor.walls).toEqual(project.floors[0].walls);
  undo();expect(resolveRooms(get(currentProject)!.floors[0])[0].area).toBe(12);
  redo();expect(resolveRooms(get(currentProject)!.floors[0])[0].area).toBe(0);
  updateRoom(rooms[0].id,{floorOpening:false});
  expect(resolveRooms(get(currentProject)!.floors[0])[0].area).toBe(12);
});

it('validates floor openings and preserves the optional flag through JSON', () => {
  const project=roomProject();project.floors[0].rooms=resolveRooms(project.floors[0]);
  for(const value of [undefined,false,true]) {
    project.floors[0].rooms[0].floorOpening=value;
    expect(readProject(JSON.parse(JSON.stringify(project))).floors[0].rooms[0].floorOpening).toBe(value);
  }
  for(const value of [null,1,'true',{}]) {
    project.floors[0].rooms[0].floorOpening=value as boolean;
    expect(()=>readProject(project)).toThrow(/floorOpening/);
  }
});

it('retains the web floor opening when native room edits return through a package', () => {
  const source=roomProject();source.floors[0].rooms=resolveRooms(source.floors[0]);
  source.floors[0].rooms[0].floorOpening=true;
  const {plan,mapping}=webToNative(source,undefined);
  const before=nativeToWeb(plan,mapping,source.name);
  const edited=structuredClone(plan);edited.rooms[0].name='Stairwell';
  const merged=applyNativeEdits(source,before,nativeToWeb(edited,mapping,source.name));
  expect(merged.floors[0].rooms[0]).toMatchObject({floorOpening:true,name:'Stairwell'});
  expect(resolveRooms(merged.floors[0])[0].area).toBe(0);
});
