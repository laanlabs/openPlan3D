import { expect, it } from 'vitest';
import { textAnnotationBounds, textAnnotationLines } from '$lib/utils/textAnnotationLayout';
const note={id:'note',x:-100,y:300,text:'First\n\nLast',fontSize:20,color:'#000',rotation:90};
it('preserves blank lines and centered spacing',()=>{
 expect(textAnnotationLines(note)).toEqual({fontSize:20,lines:[{text:'First',y:-24},{text:'',y:0},{text:'Last',y:24}]});
});
it('rotates measured text ink bounds without changing the note',()=>{
 const before=JSON.stringify(note),ctx={measureText:()=>({width:80,actualBoundingBoxLeft:42,actualBoundingBoxRight:41,actualBoundingBoxAscent:10,actualBoundingBoxDescent:8})} as unknown as CanvasRenderingContext2D;
 const bounds=textAnnotationBounds(note,ctx);
 expect(bounds.minX).toBeCloseTo(-133);expect(bounds.maxX).toBeCloseTo(-65);
 expect(bounds.minY).toBeCloseTo(257);expect(bounds.maxY).toBeCloseTo(342);
 expect(JSON.stringify(note)).toBe(before);
});
