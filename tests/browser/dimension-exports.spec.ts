import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { benchmarkProject } from '../fixtures/render-benchmark';
test('saved dimensions export with signed and zero offsets',async({page},testInfo)=>{
 await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 const project=benchmarkProject('small'),floor=project.floors[0];floor.furniture=[];floor.doors=[];floor.windows=[];
 floor.annotations=[{id:'dim',x1:-600,y1:-400,x2:-200,y2:-400,offset:-200,label:'Saved dimension'},{id:'zero',x1:-600,y1:-200,x2:-200,y2:-200,offset:0,label:'Zero offset'}];
 await(await chooser).setFiles({name:'dimensions.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForLoadState('networkidle');
 async function download(name:string){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await pending).path())!);}
 const svg=(await download('Export as SVG')).toString();
 const result=await page.evaluate(svg=>{
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
  const labels=[...doc.querySelectorAll('text')].filter(t=>['Saved dimension','Zero offset'].includes(t.textContent!));
  const lines=[...doc.querySelectorAll('line[stroke="#6366f1"]')];
  return {ys:labels.map(t=>Number(t.getAttribute('y'))),ysLines:lines.map(l=>[Number(l.getAttribute('y1')),Number(l.getAttribute('y2'))]),view:doc.documentElement.getAttribute('viewBox')!.split(' ').map(Number)};
 },svg);
 expect(result.ys[1]-result.ys[0]).toBeCloseTo(400);
 for(const y of result.ys){expect(y).toBeGreaterThan(0);expect(y).toBeLessThan(result.view[3]);expect(result.ysLines.some(line=>line[0]===y+4&&line[1]===y+4)).toBe(true);}
 const png=await download('Export 2D as PNG');
 const purple=await page.evaluate(async data=>{
  const image=new Image();image.src=data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let count=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i]<150&&pixels[i+1]<150&&pixels[i+2]>180)count++;return count;
 },`data:image/png;base64,${png.toString('base64')}`);expect(purple).toBeGreaterThan(50);
 const dxf=(await download('Export as DXF')).toString();expect(dxf).toContain('Saved dimension');expect(dxf).toContain('Zero offset');
 const pdf=await download('Export as PDF');expect(pdf.subarray(0,5).toString()).toBe('%PDF-');
 await testInfo.attach('dimensions.png',{body:png,contentType:'image/png'});
});
