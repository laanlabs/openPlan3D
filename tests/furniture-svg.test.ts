import {expect,it} from 'vitest';
import {furnitureSvg} from '$lib/utils/furnitureSvg';
import {furnitureCatalog} from '$lib/utils/furnitureCatalog';
it('supports every catalog symbol without raster images or invalid coordinates',()=>{
 for(const item of furnitureCatalog){const svg=furnitureSvg(item.id,item.width,item.depth,item.color);expect(svg.length).toBeGreaterThan(0);expect(svg).not.toMatch(/NaN|Infinity|<image|undefined/);}
});
it('retains curved symbol paths and safely escapes styles',()=>{
 const chair=furnitureSvg('chair',80,80,'#123456');expect((chair.match(/<path/g)??[]).length).toBeGreaterThan(4);expect(chair).toContain('Q ');
 const toilet=furnitureSvg('toilet',40,65,'#ffffff');expect((toilet.match(/A /g)??[]).length).toBeGreaterThanOrEqual(4);
 expect(furnitureSvg('unknown',50,50,'" onload="bad')).not.toContain('fill="" onload=');
});
