import { expect, it } from 'vitest';
import type { FurnitureItem } from '$lib/models/types';
import { furniturePlanBounds } from '$lib/utils/furniturePlanBounds';
const item: FurnitureItem={id:'item',catalogId:'unknown',position:{x:-600,y:800},rotation:45,width:800,depth:300,scale:{x:1,y:1,z:1}};
it('contains all transformed stroke corners without changing the source',()=>{
 const before=JSON.stringify(item);
 for(const rotation of [0,45,90,135,-30,360]) {
  const b=furniturePlanBounds({...item,rotation}), angle=rotation*Math.PI/180;
  for(const x of [-400.25,400.25])for(const y of [-150.25,150.25]) {
   const px=item.position.x+x*Math.cos(angle)-y*Math.sin(angle),py=item.position.y+x*Math.sin(angle)+y*Math.cos(angle);
   expect(px).toBeGreaterThanOrEqual(b.minX-1e-9);expect(px).toBeLessThanOrEqual(b.maxX+1e-9);
   expect(py).toBeGreaterThanOrEqual(b.minY-1e-9);expect(py).toBeLessThanOrEqual(b.maxY+1e-9);
  }
 }
 expect(JSON.stringify(item)).toBe(before);
});
it('uses the existing unknown-catalog fallback',()=>{
 expect(furniturePlanBounds({...item,rotation:0,width:undefined,depth:undefined})).toEqual({minX:-615.25,maxX:-584.75,minY:784.75,maxY:815.25});
});
