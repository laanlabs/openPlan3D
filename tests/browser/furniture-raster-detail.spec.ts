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
 const dxf=(await download('Export as DXF')).toString();
 expect(dxf).toContain('\nSPLINE\n');expect(dxf).toContain('Armchair');expect(dxf).not.toMatch(/NaN|Infinity/);
 await testInfo.attach('furniture-cad',{body:Buffer.from(dxf),contentType:'application/dxf'});
 const cadPreview=await page.evaluate(dxf=>{
  const lines=dxf.trim().split(/\r?\n/),entities:{type:string;tags:[string,string][]}[]=[];
  for(let i=0;i<lines.length;i+=2){const code=lines[i].trim(),value=lines[i+1].trim();if(code==='0')entities.push({type:value,tags:[]});else entities.at(-1)?.tags.push([code,value]);}
  const paths:number[][][]=[];
  for(const entity of entities){
   const get=(code:string)=>Number(entity.tags.find(t=>t[0]===code)?.[1]);
   if(entity.type==='LINE')paths.push([[get('10'),-get('20')],[get('11'),-get('21')]]);
   if(entity.type==='LWPOLYLINE'){const xs=entity.tags.filter(t=>t[0]==='10').map(t=>Number(t[1])),ys=entity.tags.filter(t=>t[0]==='20').map(t=>-Number(t[1]));paths.push(xs.map((x,i)=>[x,ys[i]]));}
   if(entity.type==='SPLINE'){
    const xs=entity.tags.filter(t=>t[0]==='10').map(t=>Number(t[1])),ys=entity.tags.filter(t=>t[0]==='20').map(t=>-Number(t[1])),weights=entity.tags.filter(t=>t[0]==='41').map(t=>Number(t[1]));
    if(xs.length!==3)throw new Error('Unexpected furniture spline');
    paths.push(Array.from({length:33},(_,i)=>{const t=i/32,b=[(1-t)**2,2*t*(1-t),t*t].map((n,j)=>n*(weights[j]??1)),sum=b.reduce((a,b)=>a+b,0);return [b.reduce((a,n,j)=>a+n*xs[j],0)/sum,b.reduce((a,n,j)=>a+n*ys[j],0)/sum];}));
   }
  }
  const points=paths.flat(),minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxX=Math.max(...points.map(p=>p[0])),maxY=Math.max(...points.map(p=>p[1]));
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,1200,900);const scale=Math.min(1100/(maxX-minX),800/(maxY-minY));ctx.translate(50-minX*scale,50-minY*scale);ctx.scale(scale,scale);ctx.strokeStyle='#333';ctx.lineWidth=1/scale;
  for(const path of paths){ctx.beginPath();path.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();}return canvas.toDataURL('image/png');
 },dxf);
 await testInfo.attach('furniture-cad-preview',{body:Buffer.from(cadPreview.split(',')[1],'base64'),contentType:'image/png'});

 const after=JSON.parse((await download('Download JSON')).toString());expect(after.floors).toEqual(before.floors);
});
