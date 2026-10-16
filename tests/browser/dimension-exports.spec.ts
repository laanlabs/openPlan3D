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
 // DWG has no writer: the DXF downloads and a notice says so instead of a blocking alert.
 const dwg=(await download('Export as DWG')).toString();expect(dwg).toContain('Saved dimension');
 await expect(page.getByRole('alert')).toContainText('DWG saved as DXF');await expect(page.getByRole('alert')).toContainText('AutoCAD, SketchUp and FreeCAD open DXF directly.');
 await page.getByRole('button',{name:'Dismiss export notice',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);
 const pdf=await download('Export as PDF');expect(pdf.subarray(0,5).toString()).toBe('%PDF-');
 await testInfo.attach('dimensions.png',{body:png,contentType:'image/png'});
});

test('plan exports leave out the dimensions, notes and stairs hidden in the 2D view',async({page})=>{
 test.setTimeout(90_000);
 // Text drawn on any canvas but the editor's own: the PNG and PDF rasters and the print sheet.
 await page.addInitScript(()=>{
  const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){
   if(this.canvas.getAttribute('aria-label')!=='Floor plan editor canvas')((window as any).__exportText??=[]).push(String(text));
   return maxWidth===undefined?fill.call(this,text,x,y):fill.call(this,text,x,y,maxWidth);
  };
 });
 await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 const project=benchmarkProject('small'),floor=project.floors[0];floor.furniture=[];floor.doors=[];floor.windows=[];
 floor.annotations=[{id:'dim',x1:0,y1:-150,x2:900,y2:-150,offset:-40,label:'Estimated width'}];
 floor.textAnnotations=[{id:'note',x:450,y:-300,text:'Shell note',fontSize:24,color:'#c00000',rotation:0}];
 floor.stairs=[{id:'stair',position:{x:225,y:225},width:100,depth:280,rotation:0,riserCount:14,direction:'up',stairType:'straight'}];
 await(await chooser).setFiles({name:'shell.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForLoadState('networkidle');
 async function download(name:string){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await pending).path())!);}
 async function drawn(name:string){await page.evaluate(()=>{(window as any).__exportText=[];});const file=await download(name);return {file,text:await page.evaluate(()=>(window as any).__exportText as string[])};}
 const wallLengths=(svg:string)=>svg.match(/>\d+ cm<\/text>/g)??[];
 let svg=(await download('Export as SVG')).toString();
 expect(wallLengths(svg).length).toBeGreaterThan(0);
 for(const label of ['Estimated width','Shell note','data-stair='])expect(svg).toContain(label);

 // The report: dimensions turned off on screen still came out in the image. Hide them, the note and the stair.
 const layers=page.getByTitle('Layer Visibility',{exact:true});
 await layers.press('Enter');
 for(const name of ['Automatic dimensions','Dimensions','Text notes','Stairs'])await page.getByRole('checkbox',{name,exact:true}).uncheck();
 await layers.press('Enter');
 svg=(await download('Export as SVG')).toString();
 expect(wallLengths(svg)).toEqual([]);
 for(const label of ['Estimated width','Shell note','data-stair='])expect(svg).not.toContain(label);
 expect(svg).toContain('stroke="#333"'); // the shell itself stays
 for(const name of ['Export 2D as PNG','Export as PDF']){
  const {file,text}=await drawn(name);
  expect(file.length).toBeGreaterThan(100);
  expect(text.filter(value=>/^\d+ cm$/.test(value))).toEqual([]);
  for(const label of ['Estimated width','Shell note','UP'])expect(text).not.toContain(label);
  expect(text).toContain('Room 1,1');
 }
 // DXF values are whole lines; 'UP' alone is the stair label (ACAD_GROUP also contains the letters).
 const dxf=(await download('Export as DXF')).toString().split(/\r?\n/).map(line=>line.trim());
 expect(dxf.filter(line=>/^\d+ cm$/.test(line))).toEqual([]);
 for(const label of ['Estimated width','Shell note','UP'])expect(dxf).not.toContain(label);
 expect(dxf).toContain('Room 1,1');

 await page.evaluate(()=>{(window as any).__exportText=[];});
 await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('button',{name:'Print Layout',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Print Preview',exact:true});
 await expect.poll(()=>page.evaluate(()=>((window as any).__exportText as string[]).some(text=>text.startsWith('Scale:')))).toBe(true);
 const printed=await page.evaluate(()=>(window as any).__exportText as string[]);
 for(const label of ['Estimated width','Shell note','UP'])expect(printed).not.toContain(label);
 expect(printed.some(text=>text.startsWith('Room 1,1'))).toBe(true);
 await dialog.getByRole('button',{name:'Close',exact:true}).click();

 // Automatic dimensions in the status bar is Settings → Dimensions → Dimensions; turning it back on brings the lengths back.
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const settings=page.getByRole('dialog',{name:'Settings',exact:true});
 await settings.getByRole('button',{name:'Dimensions',exact:true}).click();
 const automatic=settings.getByRole('checkbox',{name:'Dimensions',exact:true});
 await expect(automatic).not.toBeChecked();await automatic.check();
 await settings.getByRole('button',{name:'Close settings',exact:true}).click();
 svg=(await download('Export as SVG')).toString();
 expect(wallLengths(svg).length).toBeGreaterThan(0);expect(svg).not.toContain('Shell note');
});

test('a floor whose every item is hidden explains itself instead of exporting an empty file',async({page})=>{
 await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 const project=benchmarkProject('small'),floor=project.floors[0];
 for(const key of ['walls','doors','windows','rooms','furniture'] as const)floor[key]=[];
 floor.textAnnotations=[{id:'note',x:0,y:0,text:'Driveway',fontSize:24,color:'#1e293b',rotation:0}];
 await(await chooser).setFiles({name:'notes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForLoadState('networkidle');
 const layers=page.getByTitle('Layer Visibility',{exact:true});
 await layers.press('Enter');await page.getByRole('checkbox',{name:'Text notes',exact:true}).uncheck();await layers.press('Enter');
 await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('button',{name:'Export 2D as PNG',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText("Couldn't export 2D PNG");
 await expect(page.getByRole('alert')).toContainText('Everything on the active floor is on a hidden layer.');
 await page.getByRole('button',{name:'Dismiss export notice',exact:true}).click();
 await page.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('button',{name:'Print Layout',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Print Preview',exact:true});
 await expect(dialog.getByRole('status')).toContainText('Everything on this floor is on a hidden layer.');
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
});
