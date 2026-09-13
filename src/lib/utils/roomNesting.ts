import type { Point } from '$lib/models/types';

/** Keep a valid centroid; otherwise choose an interior scanline midpoint with
 * the greatest boundary clearance. Rings may have either winding. */
export function roomInteriorPoint(polygon: Point[], holes: Point[][] = []): Point {
  if (!polygon.length) return {x:0,y:0};
  const center={x:polygon.reduce((s,p)=>s+p.x,0)/polygon.length,y:polygon.reduce((s,p)=>s+p.y,0)/polygon.length};
  const rings=[polygon,...holes];
  function clearance(p: Point): number {
    let inside=false, distance=Infinity;
    for(const ring of rings) for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
      const a=ring[j],b=ring[i], dx=b.x-a.x,dy=b.y-a.y;
      const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
      distance=Math.min(distance,Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy));
      if((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
    }
    return inside ? distance : -distance;
  }
  if(clearance(center)>1e-7) return center;
  let best=center, bestDistance=-Infinity;
  for(const swapped of [false,true]) {
    const mapped=rings.map(r=>r.map(p=>swapped?{x:p.y,y:p.x}:p));
    const levels=[...new Set(mapped.flatMap(r=>r.map(p=>p.y)))].sort((a,b)=>a-b);
    for(let k=1;k<levels.length;k++) {
      const y=(levels[k-1]+levels[k])/2, xs:number[]=[];
      for(const ring of mapped) for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
        const a=ring[j],b=ring[i];
        if((a.y>y)!==(b.y>y)) xs.push(a.x+(b.x-a.x)*(y-a.y)/(b.y-a.y));
      }
      xs.sort((a,b)=>a-b);
      for(let i=0;i+1<xs.length;i+=2) {
        const x=(xs[i]+xs[i+1])/2, p=swapped?{x:y,y:x}:{x,y}, d=clearance(p);
        if(d>bestDistance) {best=p;bestDistance=d;}
      }
    }
  }
  return best;
}

/** Append separate closed rings to a fresh canvas path; fill/clip with evenodd. */
export function traceRoomRings(ctx: Pick<CanvasRenderingContext2D, 'beginPath' | 'moveTo' | 'lineTo' | 'closePath'>,
  polygon: Point[], holes: Point[][] = [], transform: (p: Point) => Point = p => p) {
  ctx.beginPath();
  for (const ring of [polygon, ...holes]) {
    if (ring.length < 3) continue;
    const first = transform(ring[0]);
    ctx.moveTo(first.x, first.y);
    for (const p of ring.slice(1)) { const q = transform(p); ctx.lineTo(q.x, q.y); }
    ctx.closePath();
  }
}

/** Immediate, strictly contained rings. Touching or crossing rings are not holes. */
export function roomHoles(polygons: Point[][]): Point[][][] {
  const cross = (a: Point, b: Point, c: Point) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const on = (p: Point, a: Point, b: Point) => Math.abs(cross(a,b,p)) < 1e-7 &&
    p.x >= Math.min(a.x,b.x)-1e-7 && p.x <= Math.max(a.x,b.x)+1e-7 &&
    p.y >= Math.min(a.y,b.y)-1e-7 && p.y <= Math.max(a.y,b.y)+1e-7;
  const intersects = (a: Point,b: Point,c: Point,d: Point) =>
    on(a,c,d) || on(b,c,d) || on(c,a,b) || on(d,a,b) ||
    (cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0);
  function inside(p: Point, ring: Point[]) {
    let result = false;
    for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
      const a=ring[j], b=ring[i];
      if (on(p,a,b)) return false;
      if ((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) result=!result;
    }
    return result;
  }
  const bounds = polygons.map(r => ({ minX:Math.min(...r.map(p=>p.x)), maxX:Math.max(...r.map(p=>p.x)),
    minY:Math.min(...r.map(p=>p.y)), maxY:Math.max(...r.map(p=>p.y)) }));
  const areas = polygons.map(r => Math.abs(r.reduce((sum,p,i) => {
    const q=r[(i+1)%r.length]; return sum+p.x*q.y-q.x*p.y;
  },0)));
  const holes: Point[][][] = polygons.map(()=>[]);
  polygons.forEach((child,ci) => {
    if (child.length<3) return;
    let parent=-1;
    polygons.forEach((outer,oi) => {
      if (oi===ci || outer.length<3 || areas[oi]<=areas[ci] || (parent>=0 && areas[oi]>=areas[parent])) return;
      const a=bounds[oi], b=bounds[ci];
      if (b.minX<=a.minX || b.maxX>=a.maxX || b.minY<=a.minY || b.maxY>=a.maxY) return;
      if (!child.every(p=>inside(p,outer))) return;
      if (child.some((p,i)=>outer.some((q,j)=>intersects(p,child[(i+1)%child.length],q,outer[(j+1)%outer.length])))) return;
      parent=oi;
    });
    if (parent>=0) holes[parent].push(child);
  });
  return holes;
}
