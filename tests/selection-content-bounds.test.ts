import { expect,it } from 'vitest';
import { selectionContentBounds } from '$lib/utils/selectionContentBounds';
import { createDefaultFloor } from '$lib/stores/project';
const context={save(){},restore(){},measureText(text:string){return {width:text.length*10};}} as unknown as CanvasRenderingContext2D;
const options={context,entourageAspect:()=>2};
it('frames selected scaled/rotated content without background or distant objects',()=>{
  const floor=createDefaultFloor();
  floor.entourage=[{id:'e',defId:'custom',position:{x:100,y:200},width:100,rotation:90},
    {id:'far',defId:'custom',position:{x:1e6,y:1e6},width:100,rotation:0}];
  const before=structuredClone(floor),b=selectionContentBounds(floor,new Set(['e']),options)!;
  expect(b.minX).toBeCloseTo(0);expect(b.maxX).toBeCloseTo(200);expect(b.minY).toBeCloseTo(150);expect(b.maxY).toBeCloseTo(250);
  expect(floor).toEqual(before);expect(selectionContentBounds(floor,new Set(),options)).toBeNull();
  expect(selectionContentBounds(floor,new Set(['missing']),options)).toBeNull();
});
it('uses an opening host for its tangent without including the full wall',()=>{
  const floor=createDefaultFloor();
  floor.walls=[{id:'wall',start:{x:-1e6,y:0},end:{x:1e6,y:0},thickness:20,height:250,color:'#444'}];
  floor.doors=[{id:'d',wallId:'wall',position:.5,width:100,height:210,type:'pocket',swingDirection:'left',flipSide:false}];
  const b=selectionContentBounds(floor,new Set(['d']),options)!;
  expect(b.minX).toBe(-56);expect(b.maxX).toBe(156);
  expect(selectionContentBounds(floor,new Set(['wall']),options)!.maxX).toBeGreaterThanOrEqual(1e6);
});
it('frames room walls even when room labels are hidden',()=>{
  const floor=createDefaultFloor();
  floor.walls=[{id:'w',start:{x:0,y:0},end:{x:200,y:0},thickness:20,height:250,color:'#444'},
    {id:'far',start:{x:1e6,y:0},end:{x:2e6,y:0},thickness:20,height:250,color:'#444'}];
  floor.rooms=[{id:'r',name:'Room',walls:['w'],color:'#fff',floorTexture:'',area:0}];
  const b=selectionContentBounds(floor,new Set(['r']),options)!;
  expect(b.minX).toBe(-10);expect(b.maxX).toBe(210);
});
