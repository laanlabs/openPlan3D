import { expect, it } from 'vitest';
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { roomHoles } from '$lib/utils/roomNesting';
import { createRoomSlabGeometry } from '$lib/utils/roomSlabGeometry';
import { detectRooms, resolveRoomGeometry, resolveRooms } from '$lib/utils/roomDetection';
import type { Wall } from '$lib/models/types';
const box = (a:number,b:number,c:number,d:number) => [{x:a,y:b},{x:c,y:b},{x:c,y:d},{x:a,y:d}];
const wallsFor = (rings: ReturnType<typeof box>[]): Wall[] => rings.flatMap((ring,ri) =>
  ring.map((start,i)=>({id:`${ri}-${i}`,start,end:ring[(i+1)%ring.length],thickness:20,height:280,color:'#fff'})));

it('nested room areas partition the footprint and recompute without losing saved metadata', () => {
  const walls=wallsFor([box(0,0,600,600),box(100,100,500,500),box(200,200,400,400)]);
  const before=JSON.stringify(walls);
  const rooms=detectRooms(walls);
  expect(rooms.map(r=>r.area).sort((a,b)=>a-b)).toEqual([4,12,20]);
  expect(rooms.reduce((sum,r)=>sum+r.area,0)).toBe(36);
  const saved=rooms.map((r,i)=>({...r,id:`saved-${i}`,name:`Suite ${i}`,floorTexture:'tile',area:999}));
  const resolved=resolveRooms({walls,rooms:saved});
  expect(resolved.map(r=>r.area)).toEqual(rooms.map(r=>r.area));
  expect(resolved.map(({id,name,floorTexture})=>({id,name,floorTexture})))
    .toEqual(saved.map(({id,name,floorTexture})=>({id,name,floorTexture})));
  expect(resolveRoomGeometry({walls,rooms:saved}).map(r=>r.room.area)).toEqual(rooms.map(r=>r.area));
  const moved=walls.map(w=>w.id.startsWith('2-') ? {...w,start:{x:w.start.x+1000,y:w.start.y},end:{x:w.end.x+1000,y:w.end.y}} : w);
  expect(resolveRooms({walls:moved,rooms:saved}).map(r=>r.area).sort((a,b)=>a-b)).toEqual([4,16,20]);
  expect(JSON.stringify(walls)).toBe(before);
});

it('subtracts unrounded child footprints before rounding a net area', () => {
  const rooms=detectRooms(wallsFor([box(0,0,600.05,600.05),box(100,100,200.1,200.1)]));
  expect(rooms.map(r=>r.area).sort((a,b)=>a-b)).toEqual([1,35]);
});

it('assigns only immediate children independent of ring order and winding', () => {
  const outer=box(0,0,100,100), middle=box(10,10,90,90), inner=box(20,20,30,30), other=box(200,0,210,10);
  expect(roomHoles([outer,middle,inner,other])).toEqual([[middle],[inner],[],[]]);
  expect(roomHoles([inner,other,middle,outer].map(r=>[...r].reverse()))).toEqual([[],[],[[...inner].reverse()],[[...middle].reverse()]]);
});

it('does not classify touching, equal, overlapping or concavity-crossing rings as holes', () => {
  for (const child of [box(0,1,5,5),box(0,0,10,10),box(5,5,15,15)]) {
    expect(roomHoles([box(0,0,10,10),child])).toEqual([[],[]]);
  }
  const u = [[0,0],[10,0],[10,10],[7,10],[7,3],[3,3],[3,10],[0,10]].map(([x,y])=>({x,y}));
  expect(roomHoles([u,box(1,1,9,8)])).toEqual([[],[]]);
});

it('nested slabs have no overlapping surfaces and preserve total volume', () => {
  const rings = [box(0,0,100,100),box(10,10,90,90),box(20,20,30,30)];
  const before=JSON.stringify(rings), holes=roomHoles(rings);
  const geometries=rings.map((r,i)=>createRoomSlabGeometry(r,12.5,holes[i])!);
  const material=new MeshBasicMaterial({side:DoubleSide});
  const meshes=geometries.map(g=>new Mesh(g,material));
  for (const [x,z] of [[5,5],[15,15],[25,25]]) {
    const ray=new Raycaster(new Vector3(x,10,z),new Vector3(0,-1,0),0,30);
    expect(meshes.filter(m=>ray.intersectObject(m).length>0)).toHaveLength(1);
  }
  let volume=0;
  for (const geometry of geometries) {
    const positions=geometry.getAttribute('position');
    const edges=new Map<string,number>();
    for (let i=0;i<positions.count;i+=3) {
      const v=[0,1,2].map(j=>new Vector3().fromBufferAttribute(positions,i+j));
      volume+=v[0].dot(v[1].clone().cross(v[2]))/6;
      const keys=v.map(p=>p.toArray().join(','));
      for (let j=0;j<3;j++) {
        const key=[keys[j],keys[(j+1)%3]].sort().join('|');
        edges.set(key,(edges.get(key)??0)+1);
      }
    }
    expect([...edges.values()].every(n=>n===2)).toBe(true);
    geometry.dispose();
  }
  expect(volume).toBeCloseTo(10000*12.5);
  expect(JSON.stringify(rings)).toBe(before);
  material.dispose();
});
