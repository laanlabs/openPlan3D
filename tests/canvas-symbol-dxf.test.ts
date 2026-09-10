import {expect,it,vi} from 'vitest';
import Drawing from 'dxf-writer';
import {canvasSymbolDxf,type SplineDrawing} from '$lib/utils/canvasSymbolDxf';
import {drawStair} from '$lib/utils/canvasRenderer';
it('restores CAD transforms and text orientation after a saved group',()=>{
 const drawing=new Drawing(),line=vi.spyOn(drawing,'drawLine'),text=vi.spyOn(drawing,'drawText');
 canvasSymbolDxf(drawing,ctx=>{ctx.save();ctx.translate(100,200);ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(10,0);ctx.stroke();ctx.fillText('turned',0,0);ctx.restore();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(10,0);ctx.stroke();ctx.fillText('plain',0,0);});
 expect(line.mock.calls[0]).toEqual([100,-200,100,-210]);expect(line.mock.calls[1]).toEqual([0,-0,10,-0]);
 expect(text.mock.calls.map(c=>c[3])).toEqual([-90,-0]);
});
it.each(['straight','l-shaped','u-shaped','spiral'] as const)('exports %s stairs in both directions as finite editable CAD entities',stairType=>{
 const results=(['up','down'] as const).map(direction=>{const drawing=new Drawing() as SplineDrawing,spline=vi.spyOn(drawing,'drawSpline'),line=vi.spyOn(drawing,'drawLine');
 const stair={id:'s',position:{x:100,y:200},rotation:35,width:120,depth:300,riserCount:15,stairType,direction};const before=structuredClone(stair);
 canvasSymbolDxf(drawing,ctx=>drawStair({ctx,width:0,height:0,zoom:1,camX:0,camY:0},stair,false));
 expect(stair).toEqual(before);expect(line.mock.calls.length).toBeGreaterThan(10);
 if(stairType==='spiral'){expect(spline.mock.calls.length).toBeGreaterThanOrEqual(11);for(const call of spline.mock.calls){expect(call[1]).toBe(2);expect(call[3]?.[1]).toBeGreaterThanOrEqual(Math.SQRT1_2-1e-10);}}
 const result=drawing.toDxfString();expect(result).not.toMatch(/NaN|Infinity|undefined/);expect(result).toContain(direction==='up'?'UP':'DN');return result;});
 expect(results[0]).not.toEqual(results[1]);
});
