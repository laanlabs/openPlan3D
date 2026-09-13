import { expect, it } from 'vitest';
import { interiorRoomArea } from '$lib/utils/interiorArea';
import { rectangleWalls } from './fixtures/project';
const walls = () => rectangleWalls().map(w => ({ ...w, thickness: 20 }));
const ring = () => walls().map(w => w.start);

it('matches the native 10.64 m² interior rectangle baseline', () => {
  expect(interiorRoomArea(ring(), [], walls())).toBeCloseTo(10.64, 10);
});
it('is invariant to rotation, translation, winding and duplicate wall footprints', () => {
  const transform = (p: {x:number;y:number}) => ({ x: 1000 + p.x * Math.cos(.7) - p.y * Math.sin(.7), y: -300 + p.x * Math.sin(.7) + p.y * Math.cos(.7) });
  const rotated = walls().map(w => ({ ...w, start: transform(w.start), end: transform(w.end) }));
  expect(interiorRoomArea(ring().map(transform).reverse(), [], [...rotated, ...rotated])).toBeCloseTo(10.64, 8);
});
it('subtracts holes and the union of walls inside a room', () => {
  const hole = [{x:100,y:100},{x:200,y:100},{x:200,y:200},{x:100,y:200}];
  expect(interiorRoomArea(ring(), [hole], walls())).toBeCloseTo(9.64, 10);
  const divider = { ...walls()[0], start:{x:200,y:0}, end:{x:200,y:300} };
  expect(interiorRoomArea(ring(), [], [...walls(), divider])).toBeCloseTo(10.08, 10);
});
it('integrates a concave boundary without filling its recess', () => {
  const l = [{x:0,y:0},{x:400,y:0},{x:400,y:100},{x:100,y:100},{x:100,y:300},{x:0,y:300}];
  expect(interiorRoomArea(l, [], [])).toBeCloseTo(6, 10);
});
it('returns unknown for invalid inputs or work over budget', () => {
  expect(interiorRoomArea([], [], walls())).toBeNull();
  expect(interiorRoomArea(ring(), [], [{...walls()[0],thickness:NaN}])).toBeNull();
  expect(interiorRoomArea(ring(), [], Array.from({length:160},()=>walls()[0]))).toBeNull();
});
