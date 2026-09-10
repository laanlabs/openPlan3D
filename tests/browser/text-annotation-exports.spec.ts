import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { benchmarkProject } from '../fixtures/render-benchmark';
test('rotated multiline notes are visible and framed in plan exports',async({page},testInfo)=>{
 await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 const project=benchmarkProject('small'),floor=project.floors[0];floor.furniture=[];floor.doors=[];floor.windows=[];
 floor.textAnnotations=[{id:'note',x:-600,y:-400,text:'Saved note\nSecond line\nFinal line',fontSize:48,color:'#c00000',rotation:30}];
 await(await chooser).setFiles({name:'notes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForLoadState('networkidle');
 async function download(name:string){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await pending).path())!);}
 const svg=(await download('Export as SVG')).toString();
 const layout=await page.evaluate(svg=>{
  const holder=document.createElement('div');holder.style.position='absolute';holder.style.left='-10000px';holder.innerHTML=svg;document.body.append(holder);
  const root=holder.querySelector('svg')!, spans=[...root.querySelectorAll('tspan')];
  const points=spans.flatMap(span=>{
   const b=span.getBBox(),m=span.getCTM()!;
   return [b.x,b.x+b.width].flatMap(x=>[b.y,b.y+b.height].map(y=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f})));
  });
  const result={count:spans.length,points,width:root.viewBox.baseVal.width,height:root.viewBox.baseVal.height};holder.remove();return result;
 },svg);
 expect(layout.count).toBe(3);for(const p of layout.points){expect(p.x).toBeGreaterThan(0);expect(p.y).toBeGreaterThan(0);expect(p.x).toBeLessThan(layout.width);expect(p.y).toBeLessThan(layout.height);}
 const png=await download('Export 2D as PNG');
 const red=await page.evaluate(async data=>{
  const image=new Image();image.src=data;await image.decode();const canvas=document.createElement('canvas');canvas.width=800;canvas.height=800;
  const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0,800,800);const pixels=ctx.getImageData(0,0,800,800).data;let red=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i]>120&&pixels[i+1]<100&&pixels[i+2]<100)red++;return red;
 },`data:image/png;base64,${png.toString('base64')}`);expect(red).toBeGreaterThan(100);
 const dxf=(await download('Export as DXF')).toString();for(const line of ['Saved note','Second line','Final line'])expect(dxf).toContain(line);expect(dxf).toContain('TEXT_C00000');
 const pdf=await download('Export as PDF');expect(pdf.subarray(0,5).toString()).toBe('%PDF-');
 await testInfo.attach('text-notes.png',{body:png,contentType:'image/png'});
});
