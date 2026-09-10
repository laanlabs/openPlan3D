import {expect,it} from 'vitest';
import {canvasSymbolSvg} from '$lib/utils/canvasSymbolSvg';
import {drawStair} from '$lib/utils/canvasRenderer';
it('restores styles and transforms between symbol drawing groups',()=>{
 const svg=canvasSymbolSvg(ctx=>{ctx.fillStyle='red';ctx.save();ctx.translate(10,20);ctx.rotate(Math.PI/2);ctx.fillStyle='blue';ctx.fillRect(0,0,10,20);ctx.restore();ctx.fillRect(0,0,5,5);});
 expect(svg).toContain('translate(10,20) rotate(90)');expect(svg).toContain('fill="blue"');
 expect(svg.trim().endsWith('<rect x="0" y="0" width="5" height="5" fill="red"/>')).toBe(true);
});
it.each(['straight','l-shaped','u-shaped','spiral'] as const)('preserves %s stair geometry and both directions in vector output',stairType=>{
 const variants=['up','down'].map(direction=>canvasSymbolSvg(ctx=>drawStair({ctx,width:0,height:0,zoom:1,camX:0,camY:0},{id:'s',position:{x:100,y:200},width:120,depth:300,rotation:30,stairType,riserCount:15,direction:direction as 'up'|'down'},false)));
 expect(variants[0]).not.toEqual(variants[1]);
 for(const svg of variants){expect(svg).not.toMatch(/NaN|Infinity|<image/);expect((svg.match(/<path/g)??[]).length).toBeGreaterThan(10);expect(svg).toContain('translate(100,200)');}
 if(stairType==='spiral'){expect(variants[0]).toMatch(/A 42 42 0 0 1/);expect(variants[1]).toMatch(/A 42 42 0 0 0/);}
});
