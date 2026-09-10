import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {benchmarkProject} from '../fixtures/render-benchmark';
test('stair-only plans retain every shape in PNG and PDF',async({page},testInfo)=>{
 test.setTimeout(90_000);
 await page.addInitScript(()=>{
  const fill=CanvasRenderingContext2D.prototype.fillText,encode=HTMLCanvasElement.prototype.toDataURL;
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){
   if(['UP','DN','DN (l-shaped)','UP (u-shaped)'].includes(text))((this.canvas as any).__stairLabels??=[]).push(text);
   return maxWidth===undefined?fill.call(this,text,x,y):fill.call(this,text,x,y,maxWidth);
  };
  HTMLCanvasElement.prototype.toDataURL=function(...args){const result=encode.apply(this,args);if(!this.getAttribute('aria-label')&&(this as any).__stairLabels?.length===4)(window as any).__stairPDF={image:result,labels:(this as any).__stairLabels};return result;};
 });
 await page.goto('/editor');const project=benchmarkProject('small'),floor=project.floors[0];
 for(const key of ['walls','doors','windows','rooms','columns','furniture'] as const)floor[key]=[];
 floor.stairs=(['straight','l-shaped','u-shaped','spiral'] as const).map((stairType,i)=>({id:`s${i}`,stairType,position:{x:(i%2)*650-500,y:Math.floor(i/2)*650-500},width:150,depth:300,rotation:i===1?35:i===2?-20:0,riserCount:15,direction:i%2?'down':'up'}));
 await page.getByRole('button',{name:'Export',exact:true}).click();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 await(await chooser).setFiles({name:'stairs.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await expect(page.getByRole('button',{name:project.name,exact:true})).toBeVisible();
 async function download(name:string){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await pending).path())!);}
 const before=JSON.parse((await download('Download JSON')).toString());
 const png=await download('Export 2D as PNG');expect(png.subarray(1,4).toString()).toBe('PNG');await testInfo.attach('stair-png',{body:png,contentType:'image/png'});
 const svg=(await download('Export as SVG')).toString();
 expect((svg.match(/data-stair=/g)??[]).length).toBe(4);expect(svg).not.toMatch(/<image|NaN|Infinity/);
 const vector=await page.evaluate(async svg=>{const img=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=reject;img.src=url;});const canvas=document.createElement('canvas');canvas.width=img.width*2;canvas.height=img.height*2;const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}},svg);
 await testInfo.attach('stair-svg-preview',{body:Buffer.from(vector.split(',')[1],'base64'),contentType:'image/png'});
 const pdf=await download('Export as PDF');expect(pdf.subarray(0,5).toString()).toBe('%PDF-');await testInfo.attach('stair-pdf',{body:pdf,contentType:'application/pdf'});
 const planImage=await page.evaluate(()=>(window as any).__stairPDF);expect(planImage.labels).toEqual(['UP','DN (l-shaped)','UP (u-shaped)','DN']);
 await testInfo.attach('stair-pdf-plan',{body:Buffer.from(planImage.image.split(',')[1],'base64'),contentType:'image/png'});
 const ink=await page.evaluate(async url=>{const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=reject;img.src=url;});const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data,counts=[0,0,0,0];for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4;if(data[i]<190&&data[i+1]<190&&data[i+2]<190)counts[(y>=canvas.height/2?2:0)+(x>=canvas.width/2?1:0)]++;}return counts;},`data:image/png;base64,${png.toString('base64')}`);
 for(const count of ink)expect(count).toBeGreaterThan(200);
 expect(JSON.parse((await download('Download JSON')).toString()).floors).toEqual(before.floors);
});
