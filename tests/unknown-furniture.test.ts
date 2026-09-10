import {expect,it} from 'vitest';
import type {FurnitureItem} from '$lib/models/types';
import type {CanvasState} from '$lib/utils/canvasInteraction';
import {drawFurnitureItem} from '$lib/utils/canvasRenderer';
import {findFurnitureAt,findHandleAt} from '$lib/utils/hitTesting';
import {getFurnitureSize} from '$lib/utils/furnitureCatalog';

const item: FurnitureItem={id:'missing',catalogId:'missing-custom-model',position:{x:100,y:200},width:160,depth:80,rotation:30,scale:{x:-1.5,y:.75,z:1},color:'#123456'};
it('renders an unknown item and its selection outline without changing saved data',()=>{
  const before=structuredClone(item),calls:{name:string;args:any[]}[]=[];
  const ctx=new Proxy({} as CanvasRenderingContext2D,{get(_target,name){return (...args:any[])=>calls.push({name:String(name),args});},set(){return true;}});
  drawFurnitureItem({ctx,zoom:1,camX:0,camY:0,width:800,height:600} as CanvasState,item,true);
  expect(calls.some(call=>call.name==='fill')).toBe(true);
  expect(calls.some(call=>call.name==='fillText'&&call.args[0]==='Unknown furniture')).toBe(true);
  expect(calls.some(call=>call.name==='strokeRect'&&call.args[0]===-122&&call.args[2]===244)).toBe(true);
  expect(item).toEqual(before);
});
it('hit-tests rotated, mirrored unknown furniture and its resize handles',()=>{
  const angle=Math.PI/6,point=(x:number,y:number)=>({x:100+x*Math.cos(angle)-y*Math.sin(angle),y:200+x*Math.sin(angle)+y*Math.cos(angle)});
  expect(findFurnitureAt(point(100,0),[item])?.id).toBe(item.id);
  expect(findFurnitureAt(point(125,0),[item])).toBeNull();
  expect(findHandleAt(point(120,0),item.id,[item],1)).toBe('resize-r');
  expect(getFurnitureSize({...item,width:undefined,depth:undefined,scale:{x:1,y:1,z:1}})).toEqual({width:50,depth:50,height:50});
});
it.each([[-1,1],[1,-1],[-1,-1]])('keeps captions readable for mirror scales %s, %s',(x,y)=>{
  for(const catalogId of ['missing-custom-model','chair']) {
    let scale=[1,1];const stack:number[][]=[],captions:number[][]=[];
    const ctx=new Proxy({} as CanvasRenderingContext2D,{get(_target,name){
      if(name==='save')return ()=>stack.push([...scale]);
      if(name==='restore')return ()=>{scale=stack.pop()!;};
      if(name==='scale')return (x:number,y:number)=>{scale=[scale[0]*x,scale[1]*y];};
      if(name==='fillText')return ()=>captions.push([...scale]);
      return ()=>{};
    },set(){return true;}});
    drawFurnitureItem({ctx,zoom:1,camX:0,camY:0,width:800,height:600} as CanvasState,{...item,catalogId,scale:{x,y,z:1}},false);
    expect(captions).toEqual([[1,1]]);
  }
});
