import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {benchmarkProject} from '../fixtures/render-benchmark';
test('entourage-only SVG embeds custom images and frames rotated vector symbols',async({page},testInfo)=>{
 test.setTimeout(90_000);await page.goto('/editor');
 const dataUrl=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=160;const ctx=c.getContext('2d')!;ctx.fillStyle='#ff00ff';ctx.fillRect(0,0,80,160);ctx.fillStyle='#008800';ctx.fillRect(20,40,40,80);return c.toDataURL();});
 const project=benchmarkProject('small'),floor=project.floors[0];for(const k of ['walls','doors','windows','rooms','furniture','stairs','columns'] as const)floor[k]=[];
 project.customEntourage=[{id:'custom',name:'Custom symbol',dataUrl,aspect:2}];
 floor.entourage=[{id:'car',defId:'car-sedan',position:{x:-700,y:-700},width:460,rotation:35,opacity:.8},{id:'tree',defId:'tree-deciduous',position:{x:-100,y:-650},width:300,rotation:0},{id:'custom-item',defId:'custom',position:{x:0,y:0},width:220,rotation:-25,opacity:.5}];
 await page.getByRole('button',{name:'Export',exact:true}).click();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'entourage.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await expect(page.getByRole('button',{name:project.name,exact:true})).toBeVisible();
 async function download(name:string){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();return readFile((await(await pending).path())!,'utf8');}
 const before=JSON.parse(await download('Download JSON'));
 const svg=await download('Export as SVG');expect(svg).toContain(dataUrl);expect(svg).toContain('opacity="0.5"');
 const result=await page.evaluate(async svg=>{
  const parsed=new DOMParser().parseFromString(svg,'image/svg+xml');if(parsed.querySelector('parsererror'))throw new Error('Invalid SVG');
  const root=document.importNode(parsed.documentElement,true) as unknown as SVGSVGElement;document.body.appendChild(root);
  const bounds=Array.from(root.querySelectorAll<SVGGElement>('[data-entourage]')).map(g=>{const b=g.getBBox(),m=g.transform.baseVal.consolidate()!.matrix;return [[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height]].map(([x,y])=>{const p=new DOMPoint(x,y).matrixTransform(m);return {x:p.x,y:p.y};});});const frame={width:root.viewBox.baseVal.width,height:root.viewBox.baseVal.height};root.remove();
  const img=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=reject;img.src=url;});const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let magenta=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>240&&pixels[i+1]>100&&pixels[i+1]<160&&pixels[i+2]>240)magenta++;return {bounds,frame,magenta,preview:c.toDataURL()};}finally{URL.revokeObjectURL(url);}
 },svg);
 expect(result.bounds).toHaveLength(3);for(const corners of result.bounds)for(const p of corners){expect(p.x).toBeGreaterThan(45);expect(p.y).toBeGreaterThan(45);expect(p.x).toBeLessThan(result.frame.width-45);expect(p.y).toBeLessThan(result.frame.height-45);}
 expect(result.magenta).toBeGreaterThan(1000);await testInfo.attach('entourage-svg-preview',{body:Buffer.from(result.preview.split(',')[1],'base64'),contentType:'image/png'});
 expect(JSON.parse(await download('Download JSON')).floors).toEqual(before.floors);
});
