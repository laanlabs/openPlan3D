import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const curved of [false,true]) for(const width of [1440,390]) test(`opening-only ${curved?'curved':'straight'} alignment works at ${width}px`,async({page},testInfo)=>{
 test.setTimeout(90_000);await page.setViewportSize({width,height:900});
 await page.addInitScript(()=>{
  localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door']));
  const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){
   if(this.canvas.getAttribute('aria-label')==='Floor plan editor canvas'&&['Reference A','Reference B'].includes(text)){
    const b=this.canvas.getBoundingClientRect(),p=new DOMPoint(x,y).matrixTransform(this.getTransform());
    ((window as any).__refs??={})[text]={x:b.x+p.x*b.width/this.canvas.width,y:b.y+p.y*b.height/this.canvas.height};
   }
   return maxWidth===undefined?fill.call(this,text,x,y):fill.call(this,text,x,y,maxWidth);
  };
 });
 const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
 for(const k of ['rooms','stairs','columns','entourage','furniture','guides','measurements','annotations'])floor[k]=[];
 floor.walls=[{id:'host',start:{x:-100,y:0},end:{x:500,y:0},height:250,thickness:20,color:'#123456',...(curved?{curvePoint:{x:200,y:160}}:{})}];
 floor.doors=[{id:'door',wallId:'host',position:.25,width:50,height:200,type:'single',swingDirection:'left',flipSide:false}];
 floor.windows=[{id:'window',wallId:'host',position:.65,width:60,height:100,sillHeight:90,type:'standard'}];
 floor.textAnnotations=[0,100].map((x,i)=>({id:`ref${i}`,x,y:-200,text:i?'Reference B':'Reference A',fontSize:10,rotation:0,color:'#123456'}));
 floor.groups=[{id:'group',elementIds:['door','window']}];
 await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();const chooser=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'opening-group.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
 await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();const save=page.getByRole('button',{name:'Save',exact:true});
 async function exported(){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();return JSON.parse(await readFile((await(await pending).path())!,'utf8')).floors[0];}
 const before=await exported();await save.press('Escape');await save.press('f');await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
 const refs=await page.evaluate(()=>(window as any).__refs),a=refs['Reference A'],scale=(refs['Reference B'].x-a.x)/100;
 const x=a.x+50*scale,y=a.y+(200+(curved?60:0))*scale;
 await page.mouse.click(x,y);
 await page.getByRole('button',{name:'Align Left',exact:true}).click();
 const moved=await exported();expect(moved.windows[0].position).toBeLessThan(before.windows[0].position);
 function left(opening:any,door:boolean){const t=opening.position,dy=curved?320*(1-2*t):0,len=Math.hypot(600,dy);return -100+600*t-600/len*opening.width/2-Math.abs(dy/len)*(door?50:12)-6;}
 expect(left(moved.doors[0],true)).toBeCloseTo(left(moved.windows[0],false),5);
 expect({...moved,doors:before.doors,windows:before.windows}).toEqual(before);
 for(const key of ['doors','windows'])expect({...moved[key][0],position:before[key][0].position}).toEqual(before[key][0]);
 await page.getByRole('button',{name:'Align Left',exact:true}).click();expect(await exported()).toEqual(moved);
 await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(before);
 await page.getByRole('button',{name:'Redo',exact:true}).click();expect(await exported()).toEqual(moved);
 await save.press('f');await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
 await testInfo.attach(`opening-alignment-${curved}-${width}`,{body:await page.screenshot(),contentType:'image/png'});
});
