import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {benchmarkProject} from '../fixtures/render-benchmark';
test('built-in entourage-only plans export editable DXF linework',async({page},testInfo)=>{
 test.setTimeout(90_000);await page.goto('/editor');
 const project=benchmarkProject('small'),floor=project.floors[0];for(const k of ['walls','doors','windows','rooms','furniture','stairs','columns'] as const)floor[k]=[];
 floor.entourage=['person','car-sedan','tree-deciduous','hedge'].map((defId,i)=>({id:`e${i}`,defId,position:{x:(i%2)*600-500,y:Math.floor(i/2)*600-500},width:300,rotation:i===1?35:0,opacity:[1,.25,.5,.75][i]}));
 await page.getByRole('button',{name:'Export',exact:true}).click();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'entourage.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await expect(page.getByRole('button',{name:project.name,exact:true})).toBeVisible();
 async function download(name:string){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await pending).path())!,'utf8');}
 const before=JSON.parse(await download('Download JSON'));
 const dxf=await download('Export as DXF');expect(dxf).toContain('ENTOURAGE');expect(dxf).toContain('SPLINE');expect(dxf).not.toMatch(/NaN|Infinity/);for(const alpha of [64,128,191])expect(dxf).toContain(`\n440\n${0x02000000|alpha}\n`);
 const cadPreview=await page.evaluate(dxf=>{
  const lines=dxf.trim().split(/\r?\n/),entities:{type:string;tags:[string,string][]}[]=[];
  for(let i=0;i<lines.length;i+=2){const code=lines[i].trim(),value=lines[i+1].trim();if(code==='0')entities.push({type:value,tags:[]});else entities.at(-1)?.tags.push([code,value]);}
  const paths:number[][][]=[],alphas:number[]=[];
  for(const entity of entities){
   const tag=entity.tags.find(t=>t[0]==='440'),opacity=tag?(Number(tag[1])&255)/255:1;
   const addPath=(path:number[][])=>{paths.push(path);alphas.push(opacity);};
   const get=(code:string)=>Number(entity.tags.find(t=>t[0]===code)?.[1]);
   if(entity.type==='LINE')addPath([[get('10'),-get('20')],[get('11'),-get('21')]]);
   if(entity.type==='LWPOLYLINE'){const xs=entity.tags.filter(t=>t[0]==='10').map(t=>Number(t[1])),ys=entity.tags.filter(t=>t[0]==='20').map(t=>-Number(t[1]));addPath(xs.map((x,i)=>[x,ys[i]]));}
   if(entity.type==='SPLINE'){
    const xs=entity.tags.filter(t=>t[0]==='10').map(t=>Number(t[1])),ys=entity.tags.filter(t=>t[0]==='20').map(t=>-Number(t[1])),weights=entity.tags.filter(t=>t[0]==='41').map(t=>Number(t[1]));
    if(xs.length!==3)throw new Error('Unexpected entourage spline');
    addPath(Array.from({length:33},(_,i)=>{const t=i/32,b=[(1-t)**2,2*t*(1-t),t*t].map((n,j)=>n*(weights[j]??1)),sum=b.reduce((a,b)=>a+b,0);return [b.reduce((a,n,j)=>a+n*xs[j],0)/sum,b.reduce((a,n,j)=>a+n*ys[j],0)/sum];}));
   }
  }
  const points=paths.flat(),minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxX=Math.max(...points.map(p=>p[0])),maxY=Math.max(...points.map(p=>p[1]));
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,1200,900);const scale=Math.min(1100/(maxX-minX),800/(maxY-minY));ctx.translate(50-minX*scale,50-minY*scale);ctx.scale(scale,scale);ctx.strokeStyle='#333';ctx.lineWidth=1/scale;
  for(const [i,path] of paths.entries()){ctx.globalAlpha=alphas[i];ctx.beginPath();path.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();}return canvas.toDataURL('image/png');
 },dxf);
 await testInfo.attach('entourage-cad-preview',{body:Buffer.from(cadPreview.split(',')[1],'base64'),contentType:'image/png'});

 expect(JSON.parse(await download('Download JSON')).floors).toEqual(before.floors);
});
