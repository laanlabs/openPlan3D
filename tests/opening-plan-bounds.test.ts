import { expect, it } from 'vitest';
import { openingPlanBounds } from '$lib/utils/openingPlanBounds';
import { drawDoorOnWall, drawWindowOnWall } from '$lib/utils/canvasRenderer';
import type { Wall, Door, Window as PlanWindow } from '$lib/models/types';
for (const [kind,types] of [['door',['single','double','french','sliding','pocket','bifold','opening','garage']],['window',['standard','fixed','bay','sliding','casement']]] as const) {
  it.each(types)(`${kind} %s bounds enclose renderer paths at small zoom and on curved walls`, type => {
    for (const zoom of [.03,1,3]) for (const width of [2,180]) for (const curved of [false,true]) for (const flip of [false,true]) {
      const wall:Wall={id:'wall',start:{x:100,y:200},end:{x:600,y:700},thickness:10,height:250,color:'#000',...(curved?{curvePoint:{x:50,y:800}}:{})};
      const opening={id:'o',wallId:'wall',position:.3,width,type,flipSide:flip,swingDirection:flip?'right':'left'} as Door & PlanWindow;
      const bounds=openingPlanBounds(wall,opening,kind,zoom),points:number[][]=[];
      const ctx={beginPath(){},closePath(){},stroke(){},fill(){},setLineDash(){},
        moveTo(x:number,y:number){points.push([x/zoom,y/zoom]);},lineTo(x:number,y:number){points.push([x/zoom,y/zoom]);},
        arc(x:number,y:number,r:number,a:number,b:number){for(let i=0;i<=32;i++){const t=a+(b-a)*i/32;points.push([(x+r*Math.cos(t))/zoom,(y+r*Math.sin(t))/zoom]);}}
      } as unknown as CanvasRenderingContext2D;
      const cs={ctx,width:0,height:0,camX:0,camY:0,zoom};
      if(kind==='door') drawDoorOnWall(cs,wall,opening);else drawWindowOnWall(cs,wall,opening);
      expect(points.length).toBeGreaterThan(0);
      for(const [x,y] of points){expect(x).toBeGreaterThanOrEqual(bounds.minX);expect(x).toBeLessThanOrEqual(bounds.maxX);expect(y).toBeGreaterThanOrEqual(bounds.minY);expect(y).toBeLessThanOrEqual(bounds.maxY);}
    }
  });
}
