import { expect, it } from 'vitest';
import { dimensionPlanGeometry } from '$lib/utils/dimensionPlanGeometry';
it('preserves zero and signed offsets without changing the annotation',()=>{
 const note={id:'a',x1:-300,y1:-200,x2:100,y2:-200,offset:0},before=JSON.stringify(note);
 expect(dimensionPlanGeometry(note)?.start).toEqual({x:-300,y:-200});
 expect(dimensionPlanGeometry({...note,offset:-150})?.center).toEqual({x:-100,y:-350});
 expect(dimensionPlanGeometry({...note,x2:-300,y2:200,offset:100})?.start).toEqual({x:-400,y:-200});
 expect(JSON.stringify(note)).toBe(before);
 expect(dimensionPlanGeometry({...note,x2:-300})).toBeNull();
});
it.each([1,2])('draws zero-offset annotations and bounded gaps at zoom %s',async zoom=>{
 const {drawAnnotation}=await import('$lib/utils/canvasRenderer');
 const calls: {name:string,args:unknown[]}[]=[];
 const ctx=new Proxy({measureText:()=>({width:1000})},{get:(target,key)=>target[key as keyof typeof target]??((...args:unknown[])=>calls.push({name:String(key),args}))}) as unknown as CanvasRenderingContext2D;
 drawAnnotation({ctx,width:0,height:0,zoom,camX:0,camY:0},{id:'dim',x1:0,y1:0,x2:100,y2:0,offset:0,label:'Long label'},false,{units:'metric'} as never);
 expect(calls.find(c=>c.name==='fillText')?.args).toEqual(['Long label',50*zoom,0]);
 const lines=calls.filter(c=>c.name==='lineTo');
 expect(lines.slice(0,4).map(c=>c.args)).toEqual([[0,4*zoom],[100*zoom,4*zoom],[0,0],[100*zoom,0]]);
});

it('hit tests a zero-offset callout at its displayed position',async()=>{
 const {hitTestAnnotation}=await import('$lib/utils/hitTesting');
 const {roomProject}=await import('./fixtures/project');
 const floor=roomProject().floors[0];floor.annotations=[{id:'zero',x1:0,y1:0,x2:100,y2:0,offset:0}];
 expect(hitTestAnnotation({x:50,y:0},floor,1)).toBe('zero');
 expect(hitTestAnnotation({x:50,y:40},floor,1)).toBeNull();
});
