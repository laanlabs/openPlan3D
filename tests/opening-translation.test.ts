import {expect,it} from 'vitest';
import {translatedOpeningPosition} from '$lib/utils/openingTranslation';
import type {Wall} from '$lib/models/types';
const wall:Wall={id:'wall',start:{x:0,y:0},end:{x:1000,y:0},height:250,thickness:20,color:'#123456'};
it('preserves common spacing along a straight host and ignores perpendicular motion',()=>{
 const before=structuredClone(wall);
 expect(translatedOpeningPosition(wall,.2,{x:100,y:80})).toBeCloseTo(.3);
 expect(translatedOpeningPosition(wall,.6,{x:100,y:80})).toBeCloseTo(.7);
 expect(translatedOpeningPosition(wall,.2,{x:0,y:80})).toBeCloseTo(.2);
 expect(wall).toEqual(before);
});
it('uses existing endpoint constraints and handles reversed and curved walls',()=>{
 expect(translatedOpeningPosition(wall,.8,{x:1000,y:0})).toBe(.9);
 expect(translatedOpeningPosition(wall,.2,{x:-1000,y:0})).toBe(.1);
 expect(translatedOpeningPosition({...wall,start:wall.end,end:wall.start},.2,{x:100,y:0})).toBeCloseTo(.1);
 const curve={...wall,curvePoint:{x:500,y:400}};
 expect(translatedOpeningPosition(curve,.5,{x:100,y:0})).toBeGreaterThan(.5);
 expect(translatedOpeningPosition(curve,.333,{x:0,y:0})).toBe(.333);
 expect(translatedOpeningPosition(curve,.333,{x:NaN,y:0})).toBe(.333);
});
