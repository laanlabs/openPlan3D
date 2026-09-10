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
it('measures the minimum screen font at low zoom and converts rotated ink to world units', () => {
 const ctx = { font: '', measureText: () => ({ width: 20, actualBoundingBoxLeft: 10, actualBoundingBoxRight: 10, actualBoundingBoxAscent: 4, actualBoundingBoxDescent: 4 }) } as unknown as CanvasRenderingContext2D;
 const single = { ...note, text: 'Note', rotation: 90 };
 const before = JSON.stringify(single);
 const bounds = textAnnotationBounds(single, ctx, .1);
 expect(ctx.font).toBe('8px sans-serif');
 expect(bounds.minX).toBeCloseTo(-150); expect(bounds.maxX).toBeCloseTo(-50);
 expect(bounds.minY).toBeCloseTo(190); expect(bounds.maxY).toBeCloseTo(410);
 expect(JSON.stringify(single)).toBe(before);
});
