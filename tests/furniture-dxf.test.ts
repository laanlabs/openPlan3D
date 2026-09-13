import {expect,it,vi} from 'vitest';
import Drawing from 'dxf-writer';
import {drawFurnitureDxf,type SplineDrawing} from '$lib/utils/furnitureDxf';
import {furnitureCatalog} from '$lib/utils/furnitureCatalog';
it('exports every catalog symbol as finite native CAD linework',()=>{
 for(const cat of furnitureCatalog){const d=new Drawing() as SplineDrawing;drawFurnitureDxf(d,{id:cat.id,catalogId:cat.id,position:{x:100,y:200},rotation:30,scale:{x:-1,y:1,z:1}});const text=d.toDxfString();expect(text).not.toMatch(/NaN|Infinity|undefined/);expect(text).toMatch(/\n(?:LINE|SPLINE|TEXT)\n/);}
});
it('keeps elliptical segments exact with rational quadratic weights',()=>{
 const d=new Drawing() as SplineDrawing,spline=vi.spyOn(d,'drawSpline');
 drawFurnitureDxf(d,{id:'toilet',catalogId:'toilet',position:{x:0,y:0},rotation:0,scale:{x:1,y:1,z:1}});
 const arcs=spline.mock.calls.filter(call=>call[3]);expect(arcs.length).toBeGreaterThanOrEqual(8);
 for(const call of arcs){expect(call[1]).toBe(2);expect(call[3]![1]).toBeCloseTo(Math.SQRT1_2);}
});
it('transforms native spline controls with rotation, mirroring and the CAD vertical axis',()=>{
 const source={id:'chair',catalogId:'chair',position:{x:0,y:0},rotation:0,scale:{x:1,y:1,z:1}};
 const a=new Drawing() as SplineDrawing,first=vi.spyOn(a,'drawSpline');drawFurnitureDxf(a,source);
 const b=new Drawing() as SplineDrawing,second=vi.spyOn(b,'drawSpline');const item={...source,position:{x:100,y:200},rotation:30,scale:{x:-1,y:1,z:1}};const before=structuredClone(item);drawFurnitureDxf(b,item);
 expect(second.mock.calls.length).toBe(first.mock.calls.length);
 first.mock.calls.forEach((call,i)=>call[0].forEach(([x,y],j)=>{
  // The base controls already have their canvas Y coordinate inverted.
  expect(second.mock.calls[i][0][j][0]).toBeCloseTo(100-x*Math.cos(Math.PI/6)+y*.5);
  expect(second.mock.calls[i][0][j][1]).toBeCloseTo(-200+x*.5+y*Math.cos(Math.PI/6));
 }));expect(item).toEqual(before);
});
