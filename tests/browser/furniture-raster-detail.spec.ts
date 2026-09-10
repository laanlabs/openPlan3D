import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {benchmarkProject} from '../fixtures/render-benchmark';
test('plan exports retain furniture symbols and mirrored captions',async({page},testInfo)=>{
 await page.goto('/editor');
 const project=benchmarkProject('small'),floor=project.floors[0];
 for(const key of ['walls','doors','windows','rooms','columns','stairs'] as const)floor[key]=[];
 floor.furniture=['chair','bed_queen','toilet','dining_table','sofa','unknown-model'].map((catalogId,i)=>({
  id:`item${i}`,catalogId,position:{x:(i%3)*300,y:Math.floor(i/3)*350},rotation:i===1?30:0,
  scale:{x:i%2?-1:1,y:1,z:1},...(i===5?{width:100,depth:80,color:'#888888'}:{}),
 }));
 await page.getByRole('button',{name:'Export',exact:true}).click();const chooser=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'furniture-detail.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await expect(page.getByRole('button',{name:project.name,exact:true})).toBeVisible();
 async function download(name:string){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await pending).path())!);}
 const before=JSON.parse((await download('Download JSON')).toString());
 const png=await download('Export 2D as PNG');expect(png.subarray(1,4).toString()).toBe('PNG');
 await testInfo.attach('furniture-symbols',{body:png,contentType:'image/png'});
 const svg=(await download('Export as SVG')).toString();
 expect(svg).not.toContain('<image');expect((svg.match(/<path/g)??[]).length).toBeGreaterThan(20);
 const preview=await page.evaluate(async svg=>{
   const image=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
   try {await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('Invalid SVG'));image.src=url;});
     const canvas=document.createElement('canvas');canvas.width=image.naturalWidth*2;canvas.height=image.naturalHeight*2;
     const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png');
   } finally {URL.revokeObjectURL(url);}
 },svg);
 await testInfo.attach('furniture-vector-preview',{body:Buffer.from(preview.split(',')[1],'base64'),contentType:'image/png'});
 const pdf=await download('Export as PDF');expect(pdf.subarray(0,5).toString()).toBe('%PDF-');
 await testInfo.attach('furniture-symbols-pdf',{body:pdf,contentType:'application/pdf'});
 const after=JSON.parse((await download('Download JSON')).toString());expect(after.floors).toEqual(before.floors);
});
