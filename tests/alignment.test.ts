import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import { planAlignment, alignElements, type AlignmentOp } from '$lib/utils/alignment';
import { furniturePlanBounds } from '$lib/utils/furniturePlanBounds';
import { stairPlanBounds } from '$lib/utils/stairPlanGeometry';
import { entouragePlanBounds } from '$lib/utils/entouragePlanBounds';
import { createDefaultProject, loadProject, currentProject, undo, redo } from '$lib/stores/project';
import type { Floor } from '$lib/models/types';
function fixture() {
  const floor = createDefaultProject().floors[0];
  floor.furniture = [{id:'f',catalogId:'sofa',position:{x:100,y:70},width:100,depth:40,rotation:35,scale:{x:-2,y:.5,z:1}}];
  floor.stairs = [{id:'s',position:{x:400,y:300},width:100,depth:600,rotation:90,stairType:'l-shaped',riserCount:14,direction:'up'}];
  floor.entourage = [{id:'e',defId:'custom',position:{x:800,y:900},width:100,rotation:30}];
  return floor;
}
const defs = [{id:'custom',name:'Custom',aspect:3,dataUrl:''}];
function bounds(floor: Floor) { return [furniturePlanBounds(floor.furniture[0]),stairPlanBounds(floor.stairs![0]),entouragePlanBounds(floor.entourage![0],3)]; }
it.each(['align-left','align-right','align-top','align-bottom','align-center-h','align-center-v'] as AlignmentOp[])('%s aligns visual geometry including scale and asymmetric footprints', op => {
  const floor = fixture(), before = structuredClone(floor), updates = planAlignment(floor,new Set(['f','s','e']),op,defs);
  expect(floor).toEqual(before);
  for (const item of [floor.furniture[0],floor.stairs![0],floor.entourage![0]]) item.position = updates.get(item.id) ?? item.position;
  const values = bounds(floor).map(b => op==='align-left'?b.minX:op==='align-right'?b.maxX:op==='align-top'?b.minY:op==='align-bottom'?b.maxY:op==='align-center-h'?(b.minX+b.maxX)/2:(b.minY+b.maxY)/2);
  for (const v of values) expect(v).toBeCloseTo(values[0],8);
});
it.each(['distribute-h','distribute-v'] as AlignmentOp[])('%s spaces centers between fixed endpoints and locked anchors', op => {
  const floor = createDefaultProject().floors[0];
  floor.entourage = [0,10,100,120,300].map((n,i)=>({id:String(i),defId:'person',position:{x:n,y:n},width:50,rotation:0,locked:i===2}));
  const updates = planAlignment(floor,new Set(['0','1','2','3','4']),op);
  expect([...updates.keys()]).toEqual(['1','3']);
  expect(updates.get('1')).toEqual(op==='distribute-h'?{x:50,y:10}:{x:10,y:50});
  expect(updates.get('3')).toEqual(op==='distribute-h'?{x:200,y:120}:{x:120,y:200});
});
it('leaves locked alignment anchors unchanged and skips insufficient or already aligned operations', () => {
  const floor = fixture(); floor.entourage![0].locked=true;
  expect(planAlignment(floor,new Set(['f','e']),'align-right',defs).has('e')).toBe(false);
  expect(planAlignment(floor,new Set(['f','e']),'distribute-h',defs).size).toBe(0);
  floor.furniture[0].position={x:0,y:0}; floor.furniture[0].locked=true;
  expect(planAlignment(floor,new Set(['f','e']),'align-left',defs).size).toBe(0);
});
it('aligns in one undoable action without adding history for an insufficient selection', () => {
  const project=createDefaultProject(); project.floors[0]=fixture();project.activeFloorId=project.floors[0].id;project.customEntourage=defs;
  loadProject(project); const before=structuredClone(get(currentProject)!.floors[0]);
  alignElements(new Set(['f','s','e']),'align-left');const moved=structuredClone(get(currentProject)!.floors[0]);
  expect(moved).not.toEqual(before);
  alignElements(new Set(['f','s','e']),'align-left');
  alignElements(new Set(['f']),'align-left');undo();expect(get(currentProject)!.floors[0]).toEqual(before);
  redo();expect(get(currentProject)!.floors[0]).toEqual(moved);
});
