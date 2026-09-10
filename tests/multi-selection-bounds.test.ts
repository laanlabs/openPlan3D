import { expect, it } from 'vitest';
import { multiSelectionBounds } from '$lib/utils/multiSelectionBounds';
import type { Floor } from '$lib/models/types';
it('encloses selected extents and ignores distant unselected objects', () => {
  const floor = { walls: [], doors: [], windows: [], furniture: [{ id:'ignored',position:{x:1e6,y:1e6},width:100,depth:100,rotation:0 }],
    stairs: [{ id:'stair',position:{x:0,y:0},width:100,depth:600,rotation:0,stairType:'l-shaped' }],
    columns: [{ id:'column',position:{x:-200,y:0},diameter:100,shape:'square',rotation:45 }] } as unknown as Floor;
  const before = structuredClone(floor), b = multiSelectionBounds(floor,new Set(['stair','column']))!;
  expect(b.maxX).toBe(370); expect(b.maxY).toBe(320);
  expect(b.minX).toBeCloseTo(-200-Math.sqrt(2)*50-.5-20);
  expect(floor).toEqual(before);
  expect(multiSelectionBounds(floor,new Set(['stair']))).toBeNull();
});
it('includes curved wall extrema rather than only endpoints', () => {
  const floor = { walls:[{id:'curve',start:{x:0,y:0},end:{x:200,y:0},curvePoint:{x:100,y:400},thickness:20}],furniture:[],doors:[],windows:[] } as unknown as Floor;
  expect(multiSelectionBounds(floor,new Set(['curve','missing']))).toEqual({minX:-30,minY:-30,maxX:230,maxY:230});
});

it('includes rotated custom entourage and locked symbols in the selection bounds', () => {
  const floor = { walls:[], furniture:[], doors:[], windows:[], entourage:[
    {id:'custom',defId:'banner',position:{x:100,y:200},width:100,rotation:90},
    {id:'locked',defId:'person',position:{x:-300,y:0},width:100,rotation:0,locked:true},
    {id:'ignored',defId:'person',position:{x:1e6,y:1e6},width:100,rotation:0}
  ] } as unknown as Floor;
  const b = multiSelectionBounds(floor,new Set(['custom','locked']),[{id:'banner',name:'Banner',dataUrl:'',aspect:4}])!;
  expect(b.minX).toBeCloseTo(-370); expect(b.maxX).toBeCloseTo(320);
  expect(b.minY).toBeCloseTo(-50); expect(b.maxY).toBeCloseTo(270);
});

it('includes note captions and offset dimensions at the current zoom without unrelated annotations', () => {
  const context = { save() {}, restore() {}, measureText(text: string) { return { width: text.length * 10 }; } } as unknown as CanvasRenderingContext2D;
  const floor = { walls:[],furniture:[],doors:[],windows:[],
    textAnnotations:[{id:'note',x:-400,y:0,text:'A long note',fontSize:16,rotation:90,color:'#123456'}, {id:'ignored',x:1e6,y:1e6,text:'Far',fontSize:16,rotation:0}],
    measurements:[{id:'measure',x1:0,y1:0,x2:200,y2:0}],
    annotations:[{id:'dimension',x1:0,y1:100,x2:200,y2:100,offset:300,label:'Dimension'}]
  } as unknown as Floor;
  const before=structuredClone(floor),ids=new Set(['note','measure','dimension']);
  const normal=multiSelectionBounds(floor,ids,undefined,1,context)!;
  expect(normal.minX).toBeLessThan(-400);expect(normal.minY).toBeLessThan(-50);
  expect(normal.maxX).toBeGreaterThan(200);expect(normal.maxY).toBeGreaterThan(400);
  const small=multiSelectionBounds(floor,ids,undefined,.1,context)!;
  expect(small.minY).toBeLessThan(normal.minY);
  expect(small.maxX).toBeLessThan(1e5);
  expect(floor).toEqual(before);
});
