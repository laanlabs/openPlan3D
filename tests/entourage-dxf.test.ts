import {expect,it,vi} from 'vitest';
import Drawing from 'dxf-writer';
import {drawEntourageDxf} from '$lib/utils/entourageDxf';
import {entourageCatalog} from '$lib/utils/entourageCatalog';
import type {SplineDrawing} from '$lib/utils/canvasSymbolDxf';
it.each(entourageCatalog)('exports $id catalog curves as finite native CAD geometry',def=>{
 const d=new Drawing();const item={id:'e',defId:def.id,position:{x:-500,y:800},width:def.width,rotation:35,opacity:.6};const before=structuredClone(item);
 drawEntourageDxf(d,item);const result=d.toDxfString();expect(result).toMatch(/\n(?:LINE|SPLINE)\n/);expect(result).not.toMatch(/NaN|Infinity|undefined/);expect(item).toEqual(before);
});
it('retains exact ellipse geometry under scaled and rotated placement',()=>{
 const d=new Drawing() as SplineDrawing,spline=vi.spyOn(d,'drawSpline');
 drawEntourageDxf(d,{id:'person',defId:'person',position:{x:100,y:200},width:100,rotation:90});
 const arc=spline.mock.calls.find(c=>c[3])!;expect(arc[1]).toBe(2);expect(arc[3]![1]).toBeCloseTo(Math.SQRT1_2);
 // Person shoulder ellipse starts at local (4,30), centered on (50,30).
 expect(arc[0][0][0]).toBeCloseTo(100);expect(arc[0][0][1]).toBeCloseTo(-154);
});
it('omits invisible and unresolved definitions without fabricating a symbol',()=>{
 for(const item of [{id:'e',defId:'person',opacity:0},{id:'e',defId:'custom'}]){
  const d=new Drawing(),line=vi.spyOn(d,'drawLine');drawEntourageDxf(d,{...item,position:{x:0,y:0},width:100,rotation:0});expect(line).not.toHaveBeenCalled();expect(d.toDxfString()).not.toContain('\nSPLINE\n');
 }
});
