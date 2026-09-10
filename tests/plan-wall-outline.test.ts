import { expect, it } from 'vitest';
import type { Wall } from '$lib/models/types';
import { planWallOutlines } from '$lib/utils/planWallOutline';
import { wallPathProfile } from '$lib/utils/wallProfiles';
const wall: Wall = {id:'curve',start:{x:0,y:0},end:{x:600,y:0},curvePoint:{x:300,y:-300},thickness:40,height:280,color:'#333'};
it('joins curve facets into a single outline at constant perpendicular thickness', () => {
 const before=JSON.stringify(wall), [outline]=planWallOutlines(wall,[]);
 expect(planWallOutlines(wall,[])).toHaveLength(1); expect(outline).toHaveLength(34);
 const spans=wallPathProfile(wall).spans;
 for (let i=0;i<spans.length;i++) {
  const s=spans[i],dx=s.end.x-s.start.x,dy=s.end.y-s.start.y;
  for (const p of [outline[i],outline[i+1]]) {
   expect((dx*(p.y-s.start.y)-dy*(p.x-s.start.x))/s.length).toBeCloseTo(20);
  }
 }
 expect(JSON.stringify(wall)).toBe(before);
});
it('keeps opening-separated outlines disconnected and handles straight walls', () => {
 const outlines=planWallOutlines(wall,[{position:.5,width:200}]); expect(outlines).toHaveLength(2);
 expect(Math.max(...outlines[0].map(p=>p.x))).toBeLessThan(Math.min(...outlines[1].map(p=>p.x)));
 expect(planWallOutlines({...wall,curvePoint:undefined},[])).toEqual([[{x:0,y:20},{x:600,y:20},{x:600,y:-20},{x:0,y:-20}]]);
 expect(planWallOutlines(wall,[{position:.5,width:2000}])).toEqual([]);
});
it('bounds sharp reversal joins and rejects empty thickness', () => {
 const bent={...wall,end:{x:1,y:0},curvePoint:{x:600,y:0}};
 const outlines=planWallOutlines(bent,[]);
 expect(outlines.flat().every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.y)<=80)).toBe(true);
 expect(planWallOutlines({...wall,thickness:0},[])).toEqual([]);
});
