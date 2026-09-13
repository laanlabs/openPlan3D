import { expect, it } from 'vitest';
import type { Wall } from '$lib/models/types';
import { planOpening, planWallSpans } from '$lib/utils/planOpening';
const wall: Wall = { id:'curve',start:{x:0,y:0},end:{x:600,y:0},curvePoint:{x:300,y:-300},thickness:20,height:280,color:'#fff' };
it('places jambs and exact subcurve on the wall without changing saved opening dimensions', () => {
 const before=JSON.stringify(wall), frame=planOpening(wall,.5,200)!;
 expect(frame.position).toBe(.5); expect(frame.width).toBeLessThan(200);
 for (const p of [frame.wall.start,frame.wall.end]) {
  const t=p.x/600; expect(p.y).toBeCloseTo(-600*t*(1-t));
 }
 const q=frame.curve!;
 expect(.25*q.start.y+.5*q.control.y+.25*q.end.y).toBeCloseTo(-150);
 expect(frame.wall.start.y).toBeCloseTo(frame.wall.end.y);
 expect(JSON.stringify(wall)).toBe(before);
});
it('clips end openings and preserves straight-wall symbol behavior', () => {
 const frame=planOpening(wall,0,200)!; expect(frame.wall.start).toEqual(wall.start); expect(frame.width).toBeLessThan(100);
 const straight={...wall,curvePoint:undefined}; expect(planOpening(straight,.25,80)).toEqual({wall:straight,position:.25,width:80,curve:null});
 expect(planOpening(wall,.5,NaN)).toBeNull(); expect(planOpening(wall,.5,-20)).toBeNull();
});
it('cuts the union of CAD opening intervals across facets and straight spans', () => {
 const holes=[{position:.5,width:200},{position:.5,width:100}];
 const sum=(spans: ReturnType<typeof planWallSpans>) => spans.reduce((s,p)=>s+Math.hypot(p.end.x-p.start.x,p.end.y-p.start.y),0);
 expect(sum(planWallSpans(wall,[]))-sum(planWallSpans(wall,holes))).toBeCloseTo(200);
 expect(sum(planWallSpans(wall,[]))-sum(planWallSpans(wall,[{position:0,width:200}]))).toBeCloseTo(100);
 const straight={...wall,curvePoint:undefined};
 expect(planWallSpans(straight,holes)).toEqual([{start:{x:0,y:0},end:{x:200,y:0}},{start:{x:400,y:0},end:{x:600,y:0}}]);
});
