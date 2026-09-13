import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { benchmarkProject } from '../fixtures/render-benchmark';

test('curved wall exports draw the arc, leave its chord empty and include the stroke bounds', async ({ page }, testInfo) => {
 await page.goto('/editor');
 await page.getByRole('button', { name: 'Export', exact: true }).click();
 const chooser = page.waitForEvent('filechooser');
 await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
 const project = benchmarkProject('small'), floor = project.floors[0];
 floor.walls = [{ id: 'curve', start: {x:0,y:0}, end: {x:600,y:0}, curvePoint: {x:300,y:-300}, thickness:40,height:280,color:'#333333' }];
 floor.rooms=[]; floor.furniture=[]; floor.doors=[]; floor.windows=[];
 await (await chooser).setFiles({ name: 'curve.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
 await page.waitForLoadState('networkidle');
 async function download(name: string) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending=page.waitForEvent('download'); await page.getByRole('button',{name,exact:true}).click();
  return readFile((await (await pending).path())!);
 }
 const svg=(await download('Export as SVG')).toString();
 expect(svg).toContain('Q 370 -80 670 220');
 expect(svg).toContain('viewBox="0 0 740 290"');
 const dimensionY = await page.evaluate(svg => {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  return Number([...doc.querySelectorAll('text')].find(t => t.textContent?.endsWith(' cm'))!.getAttribute('y'));
 }, svg);
 expect(dimensionY).toBeCloseTo(30); // safely above the stroke, whose top is Y=50

 const png=await download('Export 2D as PNG');
 expect(png.readUInt32BE(16)).toBe(1600); expect(png.readUInt32BE(20)).toBe(700);
 const samples=await page.evaluate(async data => {
  const image=new Image(); image.src=data; await image.decode();
  const canvas=document.createElement('canvas'); canvas.width=image.width; canvas.height=image.height;
  const ctx=canvas.getContext('2d')!; ctx.drawImage(image,0,0);
  return [200,500].map(y=>Array.from(ctx.getImageData(800,y,1,1).data));
 },`data:image/png;base64,${png.toString('base64')}`);
 expect(samples[0].slice(0,3).every(c=>c<100)).toBe(true);
 expect(samples[1].slice(0,3).every(c=>c>240)).toBe(true);
 const dxf=(await download('Export as DXF')).toString();
 expect((dxf.match(/\nLWPOLYLINE\n/g)??[]).length).toBe(1);
 const pdf=await download('Export as PDF'); expect(pdf.subarray(0,5).toString()).toBe('%PDF-');
 await testInfo.attach('curved-wall.png',{body:png,contentType:'image/png'});
});

test('curved door and window exports clear their wall intervals', async ({ page }, testInfo) => {
 await page.goto('/editor');
 await page.getByRole('button', { name: 'Export', exact: true }).click();
 const chooser = page.waitForEvent('filechooser');
 await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
 const project = benchmarkProject('small'), floor = project.floors[0];
 floor.walls = [{ id:'curve',start:{x:0,y:0},end:{x:600,y:0},curvePoint:{x:300,y:-300},thickness:40,height:280,color:'#333333' }];
 floor.rooms=[]; floor.furniture=[];
 floor.doors=[{id:'door',wallId:'curve',position:.5,width:200,height:210,type:'single',swingDirection:'left',flipSide:false}];
 floor.windows=[{id:'window',wallId:'curve',position:.85,width:100,height:120,sillHeight:90,type:'standard'}];
 await (await chooser).setFiles({name:'openings.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForLoadState('networkidle');
 async function download(name:string) {
  await page.getByRole('button',{name:'Export',exact:true}).click();
  const pending=page.waitForEvent('download'); await page.getByRole('button',{name,exact:true}).click();
  return readFile((await (await pending).path())!);
 }
 const svg=(await download('Export as SVG')).toString();
 const origin=await page.evaluate(svg=>{
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml');
  const curves=[...doc.querySelectorAll('path')].filter(p=>p.getAttribute('d')?.includes(' Q '));
  const gaps=curves.filter(p=>p.getAttribute('stroke')==='white');
  const numbers=curves[0].getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  return {gaps:gaps.length,x:numbers[0],y:numbers[1]};
 },svg);
 expect(origin.gaps).toBe(2);
 const png=await download('Export 2D as PNG');
 const samples=await page.evaluate(async ({data,origin})=>{
  const image=new Image();image.src=data;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);
  return [{x:300,y:-150},{x:60,y:-54}].map(p=>Array.from(ctx.getImageData(Math.round(2*(origin.x+30+p.x)),Math.round(2*(origin.y+30+p.y)),1,1).data));
 },{data:`data:image/png;base64,${png.toString('base64')}`,origin});
 expect(samples[0].slice(0,3).every(c=>c>240)).toBe(true);
 expect(samples[1].slice(0,3).every(c=>c<100)).toBe(true);
 const dxf=(await download('Export as DXF')).toString();
 expect((dxf.match(/\nLWPOLYLINE\n/g)??[]).length).toBe(3); // wall runs on either side of two openings
 expect(dxf).toContain('ARC');
 const pdf=await download('Export as PDF');expect(pdf.subarray(0,5).toString()).toBe('%PDF-');
 await testInfo.attach('curved-openings.png',{body:png,contentType:'image/png'});
 await testInfo.attach('curved-openings.svg',{body:svg,contentType:'image/svg+xml'});
});
