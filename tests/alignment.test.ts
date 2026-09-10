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

it.each(['align-left','align-right','align-top','align-bottom','align-center-h','align-center-v','distribute-h','distribute-v'] as AlignmentOp[])('%s preserves wall curves, heights and hosted openings',async op=>{
  const {wallPlanBounds}=await import('$lib/utils/wallPlanGeometry');
  const project=createDefaultProject(),floor=project.floors[0];
  floor.walls=[
    {id:'a',start:{x:0,y:0},end:{x:200,y:0},height:250,thickness:20,color:'#123456'},
    {id:'b',start:{x:350,y:200},end:{x:550,y:220},curvePoint:{x:480,y:340},height:260,startHeight:240,endHeight:280,thickness:30,color:'#234567'},
    {id:'c',start:{x:900,y:500},end:{x:1200,y:540},curvePoint:{x:1000,y:380},height:270,thickness:10,color:'#345678'},
  ];
  floor.doors=[{id:'door',wallId:'b',position:0.2,width:60,height:200,type:'single',swingDirection:'left',flipSide:false}];
  floor.windows=[{id:'window',wallId:'c',position:0.6,width:80,height:120,sillHeight:90,type:'standard'}];
  loadProject(project);const before=structuredClone(get(currentProject)!.floors[0]);
  alignElements(new Set(['a','b','c']),op,annotationContext);
  const after=structuredClone(get(currentProject)!.floors[0]);expect(after).not.toEqual(before);
  expect(after.doors).toEqual(before.doors);expect(after.windows).toEqual(before.windows);
  after.walls.forEach((wall,i)=>{
    const a=before.walls[i],dx=wall.start.x-a.start.x,dy=wall.start.y-a.start.y;
    expect(wall.end.x-a.end.x).toBeCloseTo(dx);expect(wall.end.y-a.end.y).toBeCloseTo(dy);
    if(a.curvePoint) {expect(wall.curvePoint!.x-a.curvePoint.x).toBeCloseTo(dx);expect(wall.curvePoint!.y-a.curvePoint.y).toBeCloseTo(dy);}
    expect({...wall,start:a.start,end:a.end,...(a.curvePoint?{curvePoint:a.curvePoint}:{})}).toEqual(a);
  });
  const values=after.walls.map(wallPlanBounds).map(b=>op==='align-left'?b.minX:op==='align-right'?b.maxX:op==='align-top'?b.minY:op==='align-bottom'?b.maxY:['align-center-h','distribute-h'].includes(op)?(b.minX+b.maxX)/2:(b.minY+b.maxY)/2);
  if(op.startsWith('distribute')){values.sort((a,b)=>a-b);expect(values[1]-values[0]).toBeCloseTo(values[2]-values[1]);}
  else for(const v of values)expect(v).toBeCloseTo(values[0]);
  alignElements(new Set(['a','b','c']),op,annotationContext);undo();expect(get(currentProject)!.floors[0]).toEqual(before);
  redo();expect(get(currentProject)!.floors[0]).toEqual(after);
});

it.each(['align-left','align-right','align-top','align-bottom','align-center-h','align-center-v','distribute-h','distribute-v'] as AlignmentOp[])('%s aligns independent openings along their hosts with one history step', async op=>{
  const {openingPlanBounds}=await import('$lib/utils/openingPlanBounds');
  const project=createDefaultProject(),floor=project.floors[0];
  floor.walls=[{id:'host',start:{x:0,y:0},end:{x:1000,y:1000},thickness:20,height:250,color:'#123456'}];
  floor.windows=[.2,.35,.8].map((position,i)=>({id:`o${i}`,wallId:'host',position,width:60,height:120,sillHeight:90,type:'standard'}));
  const ids=new Set(floor.windows.map(w=>w.id));loadProject(project);
  const before=structuredClone(get(currentProject)!.floors[0]);alignElements(ids,op);
  const after=structuredClone(get(currentProject)!.floors[0]);expect(after).not.toEqual(before);
  expect(after.walls).toEqual(before.walls);
  const values=after.windows.map(w=>openingPlanBounds(after.walls[0],w,'window')).map(b=>op==='align-left'?b.minX:op==='align-right'?b.maxX:op==='align-top'?b.minY:op==='align-bottom'?b.maxY:['align-center-h','distribute-h'].includes(op)?(b.minX+b.maxX)/2:(b.minY+b.maxY)/2);
  if(op.startsWith('distribute'))expect(values[1]-values[0]).toBeCloseTo(values[2]-values[1],5);
  else for(const v of values)expect(v).toBeCloseTo(values[0],5);
  after.windows.forEach((w,i)=>expect({...w,position:before.windows[i].position}).toEqual(before.windows[i]));
  alignElements(ids,op);undo();expect(get(currentProject)!.floors[0]).toEqual(before);redo();expect(get(currentProject)!.floors[0]).toEqual(after);
});
it('solves curved opening alignment without rehosting and keeps unreachable perpendicular targets fixed',async()=>{
 const {openingAlignmentPosition}=await import('$lib/utils/openingAlignment');
 const {openingPlanBounds}=await import('$lib/utils/openingPlanBounds');
 const wall={id:'w',start:{x:0,y:0},end:{x:1000,y:0},curvePoint:{x:500,y:500},thickness:20,height:250,color:'#123456'};
 const opening={id:'d',wallId:'w',position:.2,width:60,height:200,type:'single' as const,swingDirection:'left' as const,flipSide:false};
 const value=(b:ReturnType<typeof openingPlanBounds>)=>b.minX;
 const target=value(openingPlanBounds(wall,{...opening,position:.63},'door'));
 const pos=openingAlignmentPosition(wall,opening,'door',value,target);
 expect(pos).toBeCloseTo(.63,6);
 const centerY=(b:ReturnType<typeof openingPlanBounds>)=>(b.minY+b.maxY)/2;
 const verticalTarget=centerY(openingPlanBounds(wall,{...opening,position:.7},'door'));
 expect(openingAlignmentPosition(wall,opening,'door',centerY,verticalTarget)).toBeCloseTo(.3,6);
 expect(openingAlignmentPosition({...wall,curvePoint:undefined},opening,'door',b=>b.minY,500)).toBe(.2);
 expect(openingAlignmentPosition({...wall,curvePoint:undefined},opening,'door',value,5000)).toBeCloseTo(.9,6);
});
it('selected hosts carry openings once and orphan openings do not enable alignment',async()=>{
 const {alignmentItems}=await import('$lib/utils/alignment');
 const project=createDefaultProject(),floor=project.floors[0];
 floor.walls=[{id:'w',start:{x:0,y:0},end:{x:1000,y:0},thickness:20,height:250,color:'#123456'}];
 floor.windows=[{id:'o',wallId:'w',position:.2,width:60,height:120,sillHeight:90,type:'standard'},{id:'orphan',wallId:'missing',position:.5,width:60,height:120,sillHeight:90,type:'standard'}];
 expect(alignmentItems(floor,new Set(['w','o','orphan'])).map(i=>i.id)).toEqual(['w']);
});
it('aligns an opening to a locked furniture anchor without changing unrelated data',()=>{
 const project=createDefaultProject(),floor=project.floors[0];
 floor.walls=[{id:'host',start:{x:0,y:0},end:{x:1000,y:0},thickness:20,height:250,color:'#123456'}];
 floor.windows=[{id:'o',wallId:'host',position:.2,width:60,height:120,sillHeight:90,type:'standard'}];
 floor.furniture=[{id:'anchor',catalogId:'chair',position:{x:700,y:0},rotation:0,width:60,depth:60,locked:true}];
 loadProject(project);const before=structuredClone(get(currentProject)!.floors[0]);
 alignElements(new Set(['o','anchor']),'align-right');
 const after=structuredClone(get(currentProject)!.floors[0]);
 // Furniture maxX=730.25 including its outline; the window envelope extends 36 units past its center.
 expect(after.windows[0].position).toBeCloseTo(.69425,6);
 expect({...after,windows:before.windows}).toEqual(before);
 undo();expect(get(currentProject)!.floors[0]).toEqual(before);
});
