import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import { roomProject } from './fixtures/project';
import { resolveRooms } from '$lib/utils/roomDetection';
import { readProject } from '$lib/utils/projectValidation';
import { currentProject, detectedRoomsStore, loadProject, updateRoom, undo, redo } from '$lib/stores/project';
import { webToNative, nativeToWeb, applyNativeEdits, validatePackagePlan } from '$lib/utils/projectPackageBridge';

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

it('direct native JSON retains nested boundary identity, opening flags and resets', () => {
  const source=roomProject(),floor=source.floors[0];
  floor.walls.push(...floor.walls.map(w=>({...w,id:`inner-${w.id}`,
    start:{x:100+w.start.x/2,y:75+w.start.y/2},end:{x:100+w.end.x/2,y:75+w.end.y/2}})));
  floor.rooms=resolveRooms(floor).map((r,i)=>({...r,name:`Room ${i}`,floorOpening:r.walls[0].startsWith('inner-')}));
  const {plan,mapping}=webToNative(source,undefined);
  const native=validatePackagePlan(JSON.parse(JSON.stringify(plan)));
  const restored=nativeToWeb(native,mapping,source.name);
  expect(restored.floors[0].rooms.map(r=>({walls:r.walls.sort(),opening:r.floorOpening})))
    .toEqual(floor.rooms.map(r=>({walls:[...r.walls].sort(),opening:r.floorOpening})));
  expect(resolveRooms(restored.floors[0]).map(r=>r.area).sort((a,b)=>a-b)).toEqual([0,9]);
  restored.floors[0].rooms.forEach(r=>delete r.floorOpening);
  const reset=webToNative(restored,native,mapping).plan;
  expect(reset.rooms.every((r:any)=>r.floorOpening===undefined)).toBe(true);
  for(const value of [1,'true',{}]) {
    const invalid=structuredClone(native);invalid.rooms[0].floorOpening=value;
    expect(()=>validatePackagePlan(invalid)).toThrow();
  }
  const invalid=structuredClone(native);invalid.rooms[0].boundaryWallIDs=['not-a-uuid'];
  expect(()=>validatePackagePlan(invalid)).toThrow();
});
