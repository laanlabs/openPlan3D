import Drawing from 'dxf-writer';
type P = [number,number];
// dxf-writer 1.18.4 implements this method but omits it from its declarations.
export type SplineDrawing = Drawing & { drawSpline(points:P[],degree?:number,knots?:number[],weights?:number[]):Drawing };
type Segment = {points:P[];weights?:number[]};
/** Monochrome CAD symbol linework with exact curves. Consumers set transforms before paths. */
export function canvasSymbolDxf(drawing: Drawing, draw: (context: CanvasRenderingContext2D) => void) {
  let matrix=[1,0,0,1,0,0], rotation=0;
  const stack: {matrix:number[];rotation:number;styles:Record<string,unknown>}[]=[];
  const world=([x,y]:P):P=>[matrix[0]*x+matrix[2]*y+matrix[4],-(matrix[1]*x+matrix[3]*y+matrix[5])];
  let paths:{start:P;end:P;segments:Segment[]}[]=[];
  const emitted=new Set<string>();
  const emit=(segment:Segment)=>{
    const points=segment.points.map(world),key=JSON.stringify([points,segment.weights]);
    if(emitted.has(key))return;emitted.add(key);
    if(points.length===2)drawing.drawLine(...points[0],...points[1]);
    else (drawing as SplineDrawing).drawSpline(points,2,undefined,segment.weights);
  };
  const context={
    fillStyle:'#000',strokeStyle:'#000',lineWidth:1,font:'10px sans-serif',textAlign:'start',textBaseline:'alphabetic',
    save(){stack.push({matrix:[...matrix],rotation,styles:Object.fromEntries(Object.entries(this).filter(([,v])=>typeof v!=='function'))});},
    restore(){const state=stack.pop();if(state){matrix=state.matrix;rotation=state.rotation;Object.assign(this,state.styles);}},
    translate(x:number,y:number){matrix[4]+=matrix[0]*x+matrix[2]*y;matrix[5]+=matrix[1]*x+matrix[3]*y;},
    rotate(angle:number){const [a,b,c,d]=matrix,cos=Math.cos(angle),sin=Math.sin(angle);matrix[0]=a*cos+c*sin;matrix[1]=b*cos+d*sin;matrix[2]=c*cos-a*sin;matrix[3]=d*cos-b*sin;rotation+=angle*180/Math.PI;},
    scale(x:number,y:number){matrix[0]*=x;matrix[1]*=x;matrix[2]*=y;matrix[3]*=y;},
    beginPath(){paths=[];},
    moveTo(x:number,y:number){paths.push({start:[x,y],end:[x,y],segments:[]});},
    lineTo(x:number,y:number){const p=paths.at(-1);if(!p){this.moveTo(x,y);return;}p.segments.push({points:[p.end,[x,y]]});p.end=[x,y];},
    quadraticCurveTo(cx:number,cy:number,x:number,y:number){const p=paths.at(-1)!;p.segments.push({points:[p.end,[cx,cy],[x,y]]});p.end=[x,y];},
    closePath(){const p=paths.at(-1);if(p)this.lineTo(...p.start);},
    stroke(){for(const p of paths)for(const segment of p.segments)emit(segment);},
    fill(){this.stroke();for(const p of paths)if(p.end[0]!==p.start[0]||p.end[1]!==p.start[1])emit({points:[p.end,p.start]});},
    fillRect(x:number,y:number,w:number,h:number){const p:P[]=[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];for(let i=1;i<p.length;i++)emit({points:[p[i-1],p[i]]});},
    strokeRect(x:number,y:number,w:number,h:number){this.fillRect(x,y,w,h);},
    fillText(text:string,x:number,y:number){const p=world([x,y]),height=Number(this.font.match(/([\d.]+)px/)?.[1]??10);drawing.drawText(p[0],p[1],height,-rotation,text,this.textAlign==='center'?'center':this.textAlign==='right'?'right':'left',this.textBaseline==='middle'?'middle':'baseline');},
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
  const adapter=new Proxy(context,{get(target,key,receiver){if(!(key in target))throw new Error(`Unsupported symbol DXF command: ${String(key)}`);return Reflect.get(target,key,receiver);}});
  draw(adapter as unknown as CanvasRenderingContext2D);
}
