import { expect,test } from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const width of [1440,390]) for(const kind of ['pocket','bay']) {
  test(`Fit encloses ${kind} symbol extents at ${width}px`,async({page},testInfo)=>{
    test.setTimeout(90_000);await page.setViewportSize({width,height:900});
    await page.addInitScript(()=>{
      localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door']));
      const begin=CanvasRenderingContext2D.prototype.beginPath,move=CanvasRenderingContext2D.prototype.moveTo,line=CanvasRenderingContext2D.prototype.lineTo,stroke=CanvasRenderingContext2D.prototype.stroke,clear=CanvasRenderingContext2D.prototype.clearRect;
      const paths=new WeakMap<CanvasRenderingContext2D,number[][]>();
      CanvasRenderingContext2D.prototype.beginPath=function(){paths.set(this,[]);return begin.call(this);};
      function record(ctx:CanvasRenderingContext2D,x:number,y:number){const p=new DOMPoint(x,y).matrixTransform(ctx.getTransform()),b=ctx.canvas.getBoundingClientRect();paths.get(ctx)?.push([b.x+p.x*b.width/ctx.canvas.width,b.y+p.y*b.height/ctx.canvas.height]);}
      CanvasRenderingContext2D.prototype.moveTo=function(x,y){record(this,x,y);return move.call(this,x,y);};
      CanvasRenderingContext2D.prototype.lineTo=function(x,y){record(this,x,y);return line.call(this,x,y);};
      CanvasRenderingContext2D.prototype.clearRect=function(x,y,w,h){if(this.canvas.getAttribute('aria-label')==='Floor plan editor canvas')(window as any).__opening=[];return clear.call(this,x,y,w,h);};
      CanvasRenderingContext2D.prototype.stroke=function(...args:any[]){
        if(this.canvas.getAttribute('aria-label')==='Floor plan editor canvas' && ((this.strokeStyle==='#999999' && this.lineWidth===2 && this.getLineDash().join(',')==='4,3') || (this.strokeStyle==='#555555' && this.lineWidth===1.5))) {
          ((window as any).__opening??=[]).push(...paths.get(this)??[]);
        }
        return (stroke as any).apply(this,args);
      };
    });
    const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
    for(const key of ['doors','windows','rooms','furniture','stairs','columns','entourage'])floor[key]=[];
    floor.walls=[{id:'wall',start:{x:9000,y:-8000},end:{x:9200,y:-8000},thickness:20,height:250,color:'#444444'}];
    if(kind==='pocket')floor.doors=[{id:'o',wallId:'wall',position:.8,width:1500,height:210,type:'pocket',swingDirection:'left',flipSide:false}];
    else floor.windows=[{id:'o',wallId:'wall',position:.8,width:1500,height:120,sillHeight:90,type:'bay'}];
    await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
    const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'opening.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    await page.getByTitle('Zoom to Fit (F)',{exact:true}).first().press('Enter');
    await expect.poll(()=>page.evaluate(()=>{const pts=(window as any).__opening,b=document.querySelector('[aria-label="Floor plan editor canvas"]')!.getBoundingClientRect();return !!pts?.length && pts.every(([x,y]:number[])=>x>b.left+20&&x<b.right-20&&y>b.top+20&&y<b.bottom-20);})).toBe(true);
    await testInfo.attach(`opening-${kind}-${width}`,{body:await page.screenshot(),contentType:'image/png'});
  });
}
