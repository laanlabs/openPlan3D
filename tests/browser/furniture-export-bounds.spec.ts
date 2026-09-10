import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { benchmarkProject } from '../fixtures/render-benchmark';
for (const scaled of [false, true]) test(`exports ${scaled ? 'scaled' : 'unscaled'} include oversized rotated furniture outside the wall bounds`,async({page},testInfo)=>{
 await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 const project=benchmarkProject('small'), floor=project.floors[0];floor.doors=[];floor.windows=[];
 floor.furniture=[{id:'large',catalogId:'unknown',position:{x:-600,y:-600},rotation:45,width:800,depth:300,color:'#e00000',scale:{x:scaled ? -2 : 1,y:scaled ? 0.5 : 1,z:1}}];
 await(await chooser).setFiles({name:'large-furniture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForLoadState('networkidle');
 async function download(name:string){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await pending).path())!);}
 const svg=(await download('Export as SVG')).toString();
 expect(svg).toContain('Unknown furniture');
 const size=await page.evaluate(({svg,scaled})=>{
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
  const view=doc.documentElement.getAttribute('viewBox')!.split(' ').map(Number);
  const width=scaled ? 1600 : 800, depth=scaled ? 150 : 300;
  const rect=doc.querySelector(`rect[width="${width}"]`)!, transform=rect.parentElement!.getAttribute('transform')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const angle=transform[2]*Math.PI/180;
  const points=[-width/2,width/2].flatMap(x=>[-depth/2,depth/2].map(y=>({x:transform[0]+x*Math.cos(angle)-y*Math.sin(angle),y:transform[1]+x*Math.sin(angle)+y*Math.cos(angle)})));
  return {width:view[2],height:view[3],points};
 },{svg,scaled});
 for(const p of size.points){expect(p.x).toBeGreaterThan(49);expect(p.y).toBeGreaterThan(49);expect(p.x).toBeLessThan(size.width-49);expect(p.y).toBeLessThan(size.height-49);}
 const png=await download('Export 2D as PNG');
 const scale=Math.min(2,4096/Math.max(size.width+60,size.height+60));
 expect(png.readUInt32BE(16)).toBe(Math.floor((size.width+60)*scale));expect(png.readUInt32BE(20)).toBe(Math.floor((size.height+60)*scale));
 const pdf=await download('Export as PDF');expect(pdf.subarray(0,5).toString()).toBe('%PDF-');
 await testInfo.attach('large-furniture.png',{body:png,contentType:'image/png'});
});
