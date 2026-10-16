import {expect,it} from 'vitest';
import {get} from 'svelte/store';
import {createDefaultProject,loadProject,currentProject,moveWallGeometryDuringDrag,moveWallEndpoint,addWall,beginUndoGroup,endUndoGroup,undo,redo} from '$lib/stores/project';
import type {Point} from '$lib/models/types';

it('moves a curved wall atomically without adding height fields and groups drag history',()=>{
  const project=createDefaultProject();project.floors[0].walls=[{id:'curve',start:{x:0,y:0},end:{x:200,y:0},curvePoint:{x:100,y:120},height:250,thickness:20,color:'#123456'}];
  loadProject(project);const before=structuredClone(get(currentProject)!.floors[0]);
  beginUndoGroup();
  for(const delta of [10,30])moveWallGeometryDuringDrag('curve',{start:{x:delta,y:delta},end:{x:200+delta,y:delta},curvePoint:{x:100+delta,y:120+delta}});
  endUndoGroup();
  const moved=structuredClone(get(currentProject)!.floors[0]);
  expect(moved.walls[0]).toEqual({...before.walls[0],start:{x:30,y:30},end:{x:230,y:30},curvePoint:{x:130,y:150}});
  undo();expect(get(currentProject)!.floors[0]).toEqual(before);
  redo();expect(get(currentProject)!.floors[0]).toEqual(moved);
});
it('stores plain coordinates from magnet-snapped points and keeps joined corners independent',()=>{
  const project=createDefaultProject();project.floors[0].walls=[
    {id:'a',start:{x:0,y:0},end:{x:200,y:0},height:250,thickness:20,color:'#123456'},
    {id:'b',start:{x:200,y:0},end:{x:200,y:200},height:250,thickness:20,color:'#123456'}];
  loadProject(project);
  // The canvas passes magneticSnap's result, flags included, and the same object to every joined corner.
  const snapped={x:210,y:5,snappedToEndpoint:true,snappedToWall:true,snappedWallId:'b'} as Point;
  moveWallEndpoint('a','end',snapped);moveWallEndpoint('b','start',snapped);
  const [a,b]=get(currentProject)!.floors[0].walls;
  expect(a.end).toEqual({x:210,y:5});expect(b.start).toEqual({x:210,y:5});
  expect(a.end).not.toBe(b.start);expect(a.end).not.toBe(snapped);
  const id=addWall(snapped,{x:400,y:5,snappedToWall:true} as Point);
  const added=get(currentProject)!.floors[0].walls.find(w=>w.id===id)!;
  expect(added.start).toEqual({x:210,y:5});expect(added.end).toEqual({x:400,y:5});expect(added.start).not.toBe(snapped);
  expect(JSON.stringify(get(currentProject))).not.toContain('snapped');
  moveWallGeometryDuringDrag('a',{start:snapped,end:{x:400,y:5,snappedToWall:true} as Point});
  expect(JSON.stringify(get(currentProject)!.floors[0].walls[0])).not.toContain('snapped');
  moveWallEndpoint('a','end',{x:Number.NaN,y:5});
  expect(get(currentProject)!.floors[0].walls[0].end).toEqual({x:400,y:5});
});
it('rejects non-finite geometry without partially moving the wall',()=>{
  const project=createDefaultProject();project.floors[0].walls=[{id:'wall',start:{x:0,y:0},end:{x:200,y:0},height:250,thickness:20,color:'#123456'}];
  loadProject(project);const before=structuredClone(get(currentProject)!.floors[0]);
  moveWallGeometryDuringDrag('wall',{start:{x:10,y:10},end:{x:210,y:10},curvePoint:{x:NaN,y:100}});
  expect(get(currentProject)!.floors[0]).toEqual(before);
});
