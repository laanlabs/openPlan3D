import type { Annotation } from '$lib/models/types';
export function dimensionPlanGeometry(a: Annotation) {
  const dx=a.x2-a.x1,dy=a.y2-a.y1,length=Math.hypot(dx,dy);
  if(length<1)return null;
  const ux=dx/length,uy=dy/length,nx=-uy,ny=ux,offset=a.offset??40;
  const start={x:a.x1+nx*offset,y:a.y1+ny*offset},end={x:a.x2+nx*offset,y:a.y2+ny*offset};
  return {length,ux,uy,nx,ny,start,end,center:{x:(start.x+end.x)/2,y:(start.y+end.y)/2}};
}
