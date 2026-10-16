import { expect, it } from 'vitest';
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import type { Point, Room, Wall } from '$lib/models/types';
import { getRoomPolygon, resolveRoomGeometry, resolveRooms } from '$lib/utils/roomDetection';
import { roomHoles } from '$lib/utils/roomNesting';
import { pointInPolygon } from '$lib/utils/hitTesting';
import { createRoomSlabGeometry } from '$lib/utils/roomSlabGeometry';

type XY = [number, number];
const at = ([x, y]: XY): Point => ({ x, y });
const wall = (id: string, from: XY, to: XY, curve?: XY): Wall => ({ id, start: at(from), end: at(to),
  thickness: 15, height: 250, color: '#eeeeee', ...(curve ? { curvePoint: at(curve) } : {}) });
/** One wall per leg of a polyline; repeat the first point to close it. */
const chain = (prefix: string, ...points: XY[]) => points.slice(1).map((to, i) => wall(`${prefix}-${i}`, points[i], to));
const area = (ring: Point[]) => Math.abs(ring.reduce((sum, p, i) => {
  const q = ring[(i + 1) % ring.length]; return sum + p.x * q.y - q.x * p.y;
}, 0)) / 20000;
const flip = (w: Wall): Wall => ({ ...w, start: w.end, end: w.start });
/** The same plan drawn in another order and with every wall drawn the other way round. */
const drawings = (walls: Wall[]) => [walls, [...walls].reverse(), walls.map(flip), [...walls].reverse().map(flip)];

const hall = chain('hall', [0, 0], [4000, 0], [4000, 3000], [0, 3000], [0, 0]);
const living = chain('living', [0, 0], [1000, 0], [1000, 750], [0, 750], [0, 0]);
const closet = chain('closet', [400, 0], [400, 400], [650, 400], [650, 0]);
const square = (prefix: string, from: number, to: number) => chain(prefix, [from, from], [to, from], [to, to], [from, to], [from, from]);

/** Every room's outline is the floor it encloses: its area less the free-standing
 * rooms cut out of it (`cutOut` in all) is the room's area, and each probe point
 * lies in the floor of exactly one room, whose area is the one expected there.
 * A room that shares a wall is never cut out, so it must lie outside the outline. */
function expectOutlines(walls: Wall[], probes: [XY, number][], cutOut = 0) {
  for (const drawn of drawings(walls)) {
    const geometry = resolveRoomGeometry({ walls: drawn, rooms: [] });
    expect(geometry).toHaveLength(probes.length);
    const holes = roomHoles(geometry.map(item => item.polygon));
    expect(holes.flat()).toHaveLength(cutOut);
    geometry.forEach(({ room, polygon }, i) => {
      expect(area(polygon) - holes[i].reduce((sum, hole) => sum + area(hole), 0)).toBeCloseTo(room.area, 2);
      // Exports, the package bridge and saved rooms resolve one room at a time.
      expect(getRoomPolygon(room, drawn)).toEqual(polygon);
    });
    for (const [probe, expected] of probes) {
      const floors = geometry.filter(({ polygon }, i) => pointInPolygon(at(probe), polygon) && !holes[i].some(hole => pointInPolygon(at(probe), hole)));
      expect(floors).toHaveLength(1);
      expect(floors[0].room.area).toBeCloseTo(expected, 2);
    }
  }
}

it('outlines a living room around the closet built against one of its walls', () => {
  expectOutlines([...living, ...closet], [[[200, 600], 65], [[525, 200], 10]]);
});

it('lays one floor slab under each point of a living room and its closet', () => {
  for (const drawn of drawings([...living, ...closet])) {
    const geometry = resolveRoomGeometry({ walls: drawn, rooms: [] });
    const holes = roomHoles(geometry.map(item => item.polygon)), material = new MeshBasicMaterial({ side: DoubleSide });
    const slabs = geometry.map(({ polygon }, i) => new Mesh(createRoomSlabGeometry(polygon, 10, holes[i])!, material));
    for (const [x, z] of [[200, 600], [525, 200], [900, 100]]) {
      const ray = new Raycaster(new Vector3(x, 10, z), new Vector3(0, -1, 0), 0, 30);
      expect(slabs.filter(slab => ray.intersectObject(slab).length > 0)).toHaveLength(1);
    }
    for (const slab of slabs) slab.geometry.dispose();
    material.dispose();
  }
});

it('outlines a hall around an office against its outer wall or in its corner', () => {
  expectOutlines([...hall, ...chain('office', [1500, 0], [1500, 1700], [2500, 1700], [2500, 0])], [[[500, 2500], 1030], [[2000, 850], 170]]);
  expectOutlines([...hall, ...chain('corner', [1000, 0], [1000, 1000], [0, 1000])], [[[2000, 2000], 1100], [[500, 500], 100]]);
});

it('cuts free-standing and bridged inner rooms out of the hall once', () => {
  const office = chain('office', [500, 500], [2500, 500], [2500, 2000], [500, 2000], [500, 500]);
  expectOutlines([...hall, ...office], [[[200, 200], 900], [[1500, 1250], 300]], 1);
  // A single partition joining the office to the outer wall encloses nothing new;
  // the hall's outline now runs along it and around the office instead.
  expectOutlines([...hall, ...office, wall('bridge', [0, 1250], [500, 1250])], [[[200, 200], 900], [[1500, 1250], 300]]);
});

it('outlines nested rooms, including a ring with a closet on its outer wall', () => {
  const nested = [...square('outer', 0, 600), ...square('middle', 100, 500), ...square('inner', 200, 400)];
  expectOutlines(nested, [[[50, 50], 20], [[150, 150], 12], [[300, 300], 4]], 2);
  expectOutlines([...nested, ...chain('alcove', [250, 0], [250, 50], [350, 50], [350, 0])],
    [[[50, 300], 19.5], [[300, 25], .5], [[150, 300], 12], [[300, 300], 4]], 2);
});

it('leaves no spike for stub walls in a room that shares walls with its closet', () => {
  const stubs = [wall('peninsula', [100, 750], [100, 600]), ...chain('shelf', [650, 200], [800, 200], [800, 300]), wall('rail', [400, 100], [500, 100])];
  const walls = [...living, ...closet, ...stubs];
  expectOutlines(walls, [[[200, 600], 65], [[525, 200], 10]]);
  for (const drawn of drawings(walls)) for (const { polygon } of resolveRoomGeometry({ walls: drawn, rooms: [] })) {
    const vertices = polygon.map(p => `${p.x},${p.y}`);
    expect(new Set(vertices).size).toBe(vertices.length);
    for (const free of ['100,600', '800,300', '800,200', '500,100']) expect(vertices).not.toContain(free);
  }
});

it('outlines rooms that share a curved wall with their closet', () => {
  // A curved alcove bulging into the living room from its bottom wall.
  expectOutlines([...living, wall('alcove', [400, 0], [650, 0], [525, 500])], [[[200, 600], 70.85], [[525, 100], 4.15]]);
  // A closet hanging off facet vertices (t = 6/16 and 10/16) of a curved outer wall.
  const curved = [wall('vault', [0, 0], [600, 0], [300, -300]), ...chain('room', [600, 0], [600, 400], [0, 400], [0, 0])];
  expectOutlines([...curved, ...chain('closet', [225, -140.625], [225, 100], [375, 100], [375, -140.625])],
    [[[100, 300], 26.28], [[300, 0], 3.7]]);
});

it('keeps the outline of saved rooms when the plan is reopened, drawn in another order or given a duplicate wall', () => {
  const walls = [...living, ...closet];
  const rooms: Room[] = resolveRooms({ walls, rooms: [] }).map(room => ({ ...room, id: `saved-${room.area}`, name: room.area > 50 ? 'Living' : 'Closet' }));
  const livingRoom = rooms.find(room => room.name === 'Living')!;
  for (const drawn of [...drawings(walls), [...walls, wall('copy', [650, 400], [400, 400])]]) {
    const geometry = resolveRoomGeometry({ walls: drawn, rooms });
    const named = geometry.find(item => item.room.name === 'Living')!;
    expect(named.room).toMatchObject({ id: livingRoom.id, area: 65 });
    for (const polygon of [named.polygon, getRoomPolygon(livingRoom, drawn)]) {
      expect(area(polygon)).toBeCloseTo(65, 6);
      expect(pointInPolygon(at([200, 600]), polygon)).toBe(true);
      expect(pointInPolygon(at([525, 200]), polygon)).toBe(false);
    }
  }
});
