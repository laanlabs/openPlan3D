import type { Wall, Door, Window as PlanWindow } from '$lib/models/types';
import { wallPointAt, wallTangentAt } from './canvasRenderer';

/** Conservative symbol envelope, including screen-sized strokes and decorations. */
export function openingPlanBounds(wall: Wall, opening: Door | PlanWindow, kind: 'door' | 'window', zoom = 1) {
  const pixel = 1 / (Number.isFinite(zoom) && zoom > 0 ? zoom : 1);
  const thickness = Math.max(wall.thickness, 4 * pixel), half = opening.width / 2;
  let minU = -half, maxU = half, reach = thickness / 2 + 2 * pixel;
  if (kind === 'door') {
    const door = opening as Door, type = door.type || 'single';
    if (type === 'single') reach = Math.max(reach,door.width);
    if (type === 'double' || type === 'french') reach = Math.max(reach,half);
    if (type === 'garage') reach = Math.max(reach,half*.8);
    if (type === 'bifold') reach = Math.max(reach,door.width/4);
    if (type === 'sliding') reach = Math.max(reach,thickness*.4+4*pixel);
    if (type === 'pocket') {
      if (door.swingDirection === 'left') maxU += door.width;
      else minU -= door.width;
    }
  } else {
    const gap = Math.max(2*pixel,thickness*.25);
    const type = opening.type;
    reach = Math.max(reach,type === 'bay' ? gap*3 : type === 'casement' ? gap*2.5 : type === 'sliding' ? gap*1.5+3*pixel : gap);
  }
  const p = wallPointAt(wall,opening.position), tangent = wallTangentAt(wall,opening.position);
  const points = [[minU,-reach],[minU,reach],[maxU,-reach],[maxU,reach]].map(([u,v]) => ({x:p.x+tangent.x*u-tangent.y*v,y:p.y+tangent.y*u+tangent.x*v}));
  const margin = 6*pixel;
  return {minX:Math.min(...points.map(p=>p.x))-margin,maxX:Math.max(...points.map(p=>p.x))+margin,
    minY:Math.min(...points.map(p=>p.y))-margin,maxY:Math.max(...points.map(p=>p.y))+margin};
}
