import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for(const width of [1440,390]) {
  test(`Curved-wall group translation preserves shape at ${width}px`,async({page})=>{
    test.setTimeout(120_000);await page.setViewportSize({width,height:900});
    await page.addInitScript(()=>{
      localStorage.setItem('o3d_tips_seen',JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door']));
      const fill=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth){
        if(this.canvas.getAttribute('aria-label')==='Floor plan editor canvas' && ['Reference A','Reference B'].includes(text)) {
          const b=this.canvas.getBoundingClientRect(),p=new DOMPoint(x,y).matrixTransform(this.getTransform());
          ((window as any).__references??={})[text]={x:b.x+p.x*b.width/this.canvas.width,y:b.y+p.y*b.height/this.canvas.height};
        }
        return maxWidth===undefined?fill.call(this,text,x,y):fill.call(this,text,x,y,maxWidth);
      };
    });
    const plan=JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8')),floor=plan.floors[0];
    for(const key of ['walls','doors','windows','furniture','stairs','columns','entourage','rooms','guides','measurements','annotations'])floor[key]=[];
    floor.textAnnotations=[0,100].map((x,i)=>({id:`reference${i}`,x,y:-200,text:i?'Reference B':'Reference A',fontSize:10,rotation:0,color:'#123456'}));
    floor.walls=[0,200].map((x,i)=>({id:`item${i}`,start:{x:x-60,y:0},end:{x:x+60,y:0},thickness:20,height:250,color:'#444444'}));
    floor.entourage.push({id:'locked',defId:'person',position:{x:350,y:100},width:30,rotation:0,locked:true});
    floor.textAnnotations.push({id:'member-note',x:100,y:100,text:'Group member',fontSize:12,rotation:20,color:'#123456'});
    floor.annotations=[{id:'member-dimension',x1:0,y1:150,x2:200,y2:150,offset:30,label:'Keep dimension'}];
    floor.groups=[{id:'saved-group',elementIds:[...floor.walls,...floor.doors,...floor.windows,...floor.furniture,...floor.stairs,...floor.columns,...floor.entourage,...floor.annotations,{id:'member-note'}].map(item=>item.id)}];
    floor.walls[0].curvePoint={x:0,y:60};floor.walls[1].curvePoint={x:200,y:-60};
    floor.walls.push({id:'ignored',start:{x:400,y:300},end:{x:600,y:300},curvePoint:{x:500,y:400},thickness:20,height:250,color:'#444444'});
    floor.doors.push({id:'carried-door',wallId:'item0',position:.1,width:20,height:210,type:'single',flipSide:false});
    floor.windows.push({id:'carried-window',wallId:'item1',position:.9,width:20,height:120,sillHeight:90,type:'standard'});
    await page.goto('/editor');await page.getByRole('button',{name:'Export',exact:true}).click();
    const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Import JSON',exact:true}).click();await(await chooser).setFiles({name:'shift.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plan))});
    await expect(page.getByRole('button',{name:plan.name,exact:true})).toBeVisible();
    const save=page.getByRole('button',{name:'Save',exact:true});
    async function exported(){await page.getByRole('button',{name:'Export',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();return JSON.parse(await readFile((await(await pending).path())!,'utf8')).floors[0];}
    async function fitted(){await page.getByTitle('Zoom to Fit (F)',{exact:true}).first().press('Enter');await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));}
    const before=await exported();await save.press('Escape');await fitted();
    const target=await page.evaluate(()=>{
      const a=(window as any).__references['Reference A'],b=(window as any).__references['Reference B'],scale=(b.x-a.x)/100;
      return {x:a.x,y:a.y+230*scale};
    });
    await page.mouse.move(target.x,target.y);await page.mouse.down();await page.mouse.move(target.x+30,target.y+20,{steps:5});await page.mouse.up();
    const moved=await exported(),dx=moved.textAnnotations[2].x-before.textAnnotations[2].x,dy=moved.textAnnotations[2].y-before.textAnnotations[2].y;
    expect(Math.hypot(dx,dy)).toBeGreaterThan(0);
    const expected=structuredClone(before);
    for(const item of expected.walls) if(item.id!=='ignored') {item.start.x+=dx;item.start.y+=dy;item.end.x+=dx;item.end.y+=dy;item.curvePoint.x+=dx;item.curvePoint.y+=dy;}
    for(const item of [...expected.furniture,...expected.columns,...expected.stairs,...expected.entourage]) {
      if(!item.locked) {item.position.x+=dx;item.position.y+=dy;}
    }
    expected.textAnnotations[2].x+=dx;expected.textAnnotations[2].y+=dy;
    for(const item of expected.annotations) {item.x1+=dx;item.y1+=dy;item.x2+=dx;item.y2+=dy;}
    expect(moved).toEqual(expected);
    await page.getByRole('button',{name:'Undo',exact:true}).click();expect(await exported()).toEqual(before);
    await page.getByRole('button',{name:'Redo',exact:true}).click();expect(await exported()).toEqual(moved);
  });
}
