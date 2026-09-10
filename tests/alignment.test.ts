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

const annotationContext = { save() {}, restore() {}, measureText(text: string) { return { width: text.length*8 }; } } as unknown as CanvasRenderingContext2D;
function annotationFixture() {
  const project=createDefaultProject(), floor=project.floors[0];
  floor.textAnnotations=[{id:'note',x:100,y:50,text:'Two\nlines',fontSize:16,rotation:30,color:'#123456'}];
  floor.measurements=[{id:'measure',x1:250,y1:200,x2:350,y2:240}];
  floor.annotations=[{id:'dimension',x1:500,y1:300,x2:700,y2:340,offset:40,label:'Dimension'}];
  return project;
}
it.each(['align-left','align-right','align-top','align-bottom','align-center-h','align-center-v','distribute-h','distribute-v'] as AlignmentOp[])('%s moves annotation geometry together and is one undoable action', async op => {
  const { planContentBounds } = await import('$lib/utils/planContentBounds');
  const project=annotationFixture(), ids=new Set(['note','measure','dimension']);
  loadProject(project); const before=structuredClone(get(currentProject)!.floors[0]);
  alignElements(ids,op,annotationContext);
  const moved=structuredClone(get(currentProject)!.floors[0]);
  expect(moved).not.toEqual(before);
  for(const key of ['measurements','annotations'] as const) {
    const a=before[key]![0], b=moved[key]![0];
    expect(b.x2-b.x1).toBeCloseTo(a.x2-a.x1); expect(b.y2-b.y1).toBeCloseTo(a.y2-a.y1);
    expect({...b,x1:a.x1,x2:a.x2,y1:a.y1,y2:a.y2}).toEqual(a);
  }
  expect({...moved.textAnnotations![0],x:before.textAnnotations![0].x,y:before.textAnnotations![0].y}).toEqual(before.textAnnotations![0]);
  const boxes=['textAnnotations','measurements','annotations'].map(key=>planContentBounds({...moved,
    textAnnotations:key==='textAnnotations'?moved.textAnnotations:[],measurements:key==='measurements'?moved.measurements:[],annotations:key==='annotations'?moved.annotations:[],
  },{context:annotationContext,entourageAspect:()=>1})!);
  const values=boxes.map(b=>op==='align-left'?b.minX:op==='align-right'?b.maxX:op==='align-top'?b.minY:op==='align-bottom'?b.maxY:['align-center-h','distribute-h'].includes(op)?(b.minX+b.maxX)/2:(b.minY+b.maxY)/2);
  if(op.startsWith('distribute')) { values.sort((a,b)=>a-b);expect(values[1]-values[0]).toBeCloseTo(values[2]-values[1]); }
  else for(const value of values)expect(value).toBeCloseTo(values[0]);
  alignElements(ids,op,annotationContext); // no extra history for a repeated operation
  undo();expect(get(currentProject)!.floors[0]).toEqual(before);
  redo();expect(get(currentProject)!.floors[0]).toEqual(moved);
});
