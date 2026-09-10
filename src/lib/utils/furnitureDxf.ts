import Drawing from 'dxf-writer';
import type { FurnitureItem } from '$lib/models/types';
import { getCatalogItem, getFurnitureSize } from './furnitureCatalog';
import { drawFurnitureIcon } from './furnitureIcons';
type P = [number,number];
// dxf-writer 1.18.4 implements this method but omits it from its declarations.
export type SplineDrawing = Drawing & { drawSpline(points:P[],degree?:number,knots?:number[],weights?:number[]):Drawing };
type Segment = {points:P[];weights?:number[]};
/** Monochrome CAD linework from the shared symbol registry, retaining exact curves. */
export function drawFurnitureDxf(drawing: Drawing, item: FurnitureItem) {
  const size=getFurnitureSize(item), color=item.color??getCatalogItem(item.catalogId)?.color??'#888888';
  const angle=item.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),sx=Math.sign(item.scale?.x??1)||1,sy=Math.sign(item.scale?.y??1)||1;
  const world=([x,y]:P):P=>[item.position.x+x*sx*c-y*sy*s,-item.position.y-x*sx*s-y*sy*c];
  let paths:{start:P;end:P;segments:Segment[]}[]=[];
  const emitted=new Set<string>();
  const emit=(segment:Segment)=>{
    const points=segment.points.map(world),key=JSON.stringify([points,segment.weights]);
    if(emitted.has(key))return;emitted.add(key);
    if(points.length===2)drawing.drawLine(...points[0],...points[1]);
    else (drawing as SplineDrawing).drawSpline(points,2,undefined,segment.weights);
  };
  const context={
    fillStyle:color,strokeStyle:color,lineWidth:1,font:'10px sans-serif',textAlign:'start',textBaseline:'alphabetic',
    beginPath(){paths=[];},
    moveTo(x:number,y:number){paths.push({start:[x,y],end:[x,y],segments:[]});},
    lineTo(x:number,y:number){const p=paths.at(-1);if(!p){this.moveTo(x,y);return;}p.segments.push({points:[p.end,[x,y]]});p.end=[x,y];},
    quadraticCurveTo(cx:number,cy:number,x:number,y:number){const p=paths.at(-1)!;p.segments.push({points:[p.end,[cx,cy],[x,y]]});p.end=[x,y];},
    closePath(){const p=paths.at(-1);if(p)this.lineTo(...p.start);},
    stroke(){for(const p of paths)for(const segment of p.segments)emit(segment);},
    fill(){this.stroke();for(const p of paths)if(p.end[0]!==p.start[0]||p.end[1]!==p.start[1])emit({points:[p.end,p.start]});},
    fillRect(x:number,y:number,w:number,h:number){const p:P[]=[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];for(let i=1;i<p.length;i++)emit({points:[p[i-1],p[i]]});},
    strokeRect(x:number,y:number,w:number,h:number){this.fillRect(x,y,w,h);},
    fillText(text:string,x:number,y:number){const p=world([x,y]),height=Number(this.font.match(/([\d.]+)px/)?.[1]??10);drawing.drawText(p[0],p[1],height,-item.rotation,text,this.textAlign==='center'?'center':this.textAlign==='right'?'right':'left',this.textBaseline==='middle'?'middle':'baseline');},
    arc(x:number,y:number,r:number,start:number,end:number,ccw=false){this.ellipse(x,y,r,r,0,start,end,ccw);},
    ellipse(x:number,y:number,rx:number,ry:number,rotation:number,start:number,end:number,ccw=false){
      const tau=2*Math.PI;let sweep=end-start;
      if(!ccw&&sweep>=tau)sweep=tau;else if(ccw&&sweep<=-tau)sweep=-tau;
      else if(ccw){sweep%=tau;if(sweep>0)sweep-=tau;}else{sweep%=tau;if(sweep<0)sweep+=tau;}
      const point=(a:number,weight=1):P=>[x+(rx*Math.cos(a)*Math.cos(rotation)-ry*Math.sin(a)*Math.sin(rotation))/weight,y+(rx*Math.cos(a)*Math.sin(rotation)+ry*Math.sin(a)*Math.cos(rotation))/weight];
      this.lineTo(...point(start));const count=Math.ceil(Math.abs(sweep)/(Math.PI/2));
      for(let i=0;i<count;i++){const a=start+sweep*i/count,b=start+sweep*(i+1)/count,w=Math.cos((b-a)/2),p=paths.at(-1)!;const endPoint=point(b);p.segments.push({points:[p.end,point((a+b)/2,w),endPoint],weights:[1,w,1]});p.end=endPoint;}
    },
  };
  const adapter=new Proxy(context,{get(target,key,receiver){if(!(key in target))throw new Error(`Unsupported furniture DXF command: ${String(key)}`);return Reflect.get(target,key,receiver);}});
  drawFurnitureIcon(adapter as unknown as CanvasRenderingContext2D,item.catalogId,size.width,size.depth,color,color);
}
