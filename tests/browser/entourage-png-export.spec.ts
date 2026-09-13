import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {benchmarkProject} from '../fixtures/render-benchmark';
test('PNG waits for custom entourage and frames an entourage-only plan',async({page},testInfo)=>{
 test.setTimeout(90_000);
 await page.addInitScript(()=>{
  const src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src')!,complete=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'complete')!,pending=new Map<HTMLImageElement,string>();
  Object.defineProperty(HTMLImageElement.prototype,'src',{...src,set(value:string){if(value===(window as any).__blockedImage){pending.set(this,value);}else src.set!.call(this,value);}});
  Object.defineProperty(HTMLImageElement.prototype,'complete',{...complete,get(){return pending.has(this)?false:complete.get!.call(this);}});
  (window as any).__releaseImages=()=>{(window as any).__blockedImage=null;for(const [image,value] of pending){pending.delete(image);src.set!.call(image,value);}};
 });
 await page.goto('/editor');
 const dataUrl=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=160;const ctx=c.getContext('2d')!;ctx.fillStyle='#ff00ff';ctx.fillRect(0,0,80,160);ctx.fillStyle='#008800';ctx.fillRect(20,40,40,80);return c.toDataURL();});
 await page.evaluate(url=>(window as any).__blockedImage=url,dataUrl);
 const project=benchmarkProject('small'),floor=project.floors[0];for(const k of ['walls','doors','windows','rooms','furniture','stairs','columns'] as const)floor[k]=[];
 project.customEntourage=[{id:'custom',name:'Custom symbol',dataUrl,aspect:2}];
 floor.entourage=[{id:'car',defId:'car-sedan',position:{x:-700,y:-700},width:460,rotation:35,opacity:.8},{id:'tree',defId:'tree-deciduous',position:{x:-100,y:-650},width:300,rotation:0},{id:'custom-item',defId:'custom',position:{x:0,y:0},width:220,rotation:-25,opacity:.5}];
 await page.getByRole('button',{name:'Export',exact:true}).click();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'entourage.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await expect(page.getByRole('button',{name:project.name,exact:true})).toBeVisible();
 async function download(name:string){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await pending).path())!,'utf8');}
 const before=JSON.parse(await download('Download JSON'));
 let downloaded=false;page.once('download',()=>downloaded=true);
 await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export 2D as PNG',exact:true}).click();
 await page.waitForTimeout(200);expect(downloaded).toBe(false);
 await page.evaluate(()=>(window as any).__releaseImages());
 const png=await readFile((await(await pending).path())!);expect(png.subarray(1,4).toString()).toBe('PNG');
 const result=await page.evaluate(async url=>{const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=reject;img.src=url;});const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let magenta=0,ink=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]>240&&pixels[i+1]>100&&pixels[i+1]<160&&pixels[i+2]>240)magenta++;if(pixels[i]<190&&pixels[i+1]<190&&pixels[i+2]<190)ink++;}return {magenta,ink,width:c.width,height:c.height};},`data:image/png;base64,${png.toString('base64')}`);
 expect(result.magenta).toBeGreaterThan(1000);expect(result.ink).toBeGreaterThan(1000);expect(result.width).toBeGreaterThan(2000);expect(result.width).toBeLessThanOrEqual(4096);
 await testInfo.attach('entourage-png-preview',{body:png,contentType:'image/png'});
 expect(JSON.parse(await download('Download JSON')).floors).toEqual(before.floors);
});
