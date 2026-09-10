import {expect,it} from 'vitest';
import {get} from 'svelte/store';
import {createDefaultProject,loadProject,currentProject,moveWallGeometryDuringDrag,beginUndoGroup,endUndoGroup,undo,redo} from '$lib/stores/project';

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
it('rejects non-finite geometry without partially moving the wall',()=>{
  const project=createDefaultProject();project.floors[0].walls=[{id:'wall',start:{x:0,y:0},end:{x:200,y:0},height:250,thickness:20,color:'#123456'}];
  loadProject(project);const before=structuredClone(get(currentProject)!.floors[0]);
  moveWallGeometryDuringDrag('wall',{start:{x:10,y:10},end:{x:210,y:10},curvePoint:{x:NaN,y:100}});
  expect(get(currentProject)!.floors[0]).toEqual(before);
});
