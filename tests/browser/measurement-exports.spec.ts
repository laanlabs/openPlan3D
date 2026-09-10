import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { benchmarkProject } from '../fixtures/render-benchmark';
test('standalone measurements export outside wall bounds',async({page},testInfo)=>{
 await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 const project=benchmarkProject('small'),floor=project.floors[0];floor.furniture=[];floor.doors=[];floor.windows=[];
 floor.measurements=[{id:'measurement',x1:-1000,y1:-600,x2:-600,y2:-600}];
 await(await chooser).setFiles({name:'measurements.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForLoadState('networkidle');
 async function download(name:string){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await pending).path())!);}
 const svg=(await download('Export as SVG')).toString();expect(svg).toContain('4 m</text>');
 const bounds=await page.evaluate(svg=>{
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml');return {view:doc.documentElement.getAttribute('viewBox')!.split(' ').map(Number),points:[...doc.querySelectorAll('circle[fill="#ef4444"]')].map(c=>({x:Number(c.getAttribute('cx')),y:Number(c.getAttribute('cy'))}))};
 },svg);
 expect(bounds.points).toHaveLength(2);for(const p of bounds.points){expect(p.x-3).toBeGreaterThanOrEqual(50);expect(p.y-20).toBeGreaterThanOrEqual(50);expect(p.x+3).toBeLessThan(bounds.view[2]);}
 const png=await download('Export 2D as PNG');
 const red=await page.evaluate(async data=>{
  const image=new Image();image.src=data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let count=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i]>180&&pixels[i+1]<120&&pixels[i+2]<120)count++;return count;
 },`data:image/png;base64,${png.toString('base64')}`);expect(red).toBeGreaterThan(100);
 const dxf=(await download('Export as DXF')).toString();expect(dxf).toContain('MEASUREMENTS');expect(dxf).toContain('4 m');
 const pdf=await download('Export as PDF');expect(pdf.subarray(0,5).toString()).toBe('%PDF-');
 await testInfo.attach('measurements.png',{body:png,contentType:'image/png'});
});
