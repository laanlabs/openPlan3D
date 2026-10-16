import type { Wall, Point, Room, Floor } from '$lib/models/types';
import { wallPathSpans } from './wallProfiles';
import { roomHoles, roomInteriorPoint } from './roomNesting';

const EPSILON = 5; // snap distance for matching endpoints

function ptEq(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

interface Edge {
  wallId: string;
  wallIds?: string[];
  start: Point;
  end: Point;
}

/**
 * Find endpoint T-junctions and intersections between faceted wall segments.
 * Split such walls into sub-segments so the graph correctly represents all connections.
 */
function splitWallsAtJunctions(walls: Wall[]): Edge[] {
  // Collect all endpoints
  const endpoints: Point[] = [];
  for (const w of walls) {
    endpoints.push(w.start, w.end);
  }

  // For each wall, find any endpoints (from other walls) that lie on its interior
  interface SplitWall {
    wallId: string;
    start: Point;
    end: Point;
    splitPoints: { point: Point; t: number }[];
  }

  // Use the same facets as the 3D wall mesh. Keep source IDs so room metadata
  // continues to follow boundary identity rather than generated facet numbers.
  const splitWalls: SplitWall[] = walls.flatMap(w => wallPathSpans(w).map(span => ({
    wallId: w.id,
    start: span.start,
    end: span.end,
    splitPoints: [],
  })));

  for (let wi = 0; wi < splitWalls.length; wi++) {
    const w = splitWalls[wi];
    const dx = w.end.x - w.start.x;
    const dy = w.end.y - w.start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < EPSILON * EPSILON) continue;

    for (const ep of endpoints) {
      // Skip if this endpoint is one of the wall's own endpoints
      if (ptEq(ep, w.start) || ptEq(ep, w.end)) continue;

      // Project ep onto the wall segment
      const t = ((ep.x - w.start.x) * dx + (ep.y - w.start.y) * dy) / lenSq;
      if (t <= EPSILON / Math.sqrt(lenSq) || t >= 1 - EPSILON / Math.sqrt(lenSq)) continue;

      // Check distance from ep to the projected point
      const projX = w.start.x + t * dx;
      const projY = w.start.y + t * dy;
      const dist = Math.sqrt((ep.x - projX) ** 2 + (ep.y - projY) ** 2);
      if (dist < EPSILON) {
        // Check we haven't already added a point at this location
        const already = splitWalls[wi].splitPoints.some(sp => ptEq(sp.point, ep));
        if (!already) {
          splitWalls[wi].splitPoints.push({ point: { x: ep.x, y: ep.y }, t });
        }
      }
    }
  }

  // Interior crossings need a vertex on BOTH walls. Endpoint-only splitting
  // otherwise leaves crossing dividers disconnected in the planar face graph.
  for (let i = 0; i < splitWalls.length; i++) {
    const a = splitWalls[i];
    for (let j = i + 1; j < splitWalls.length; j++) {
      const b = splitWalls[j];
      if (a.wallId === b.wallId) continue;
      if (Math.max(a.start.x, a.end.x) < Math.min(b.start.x, b.end.x) ||
          Math.max(b.start.x, b.end.x) < Math.min(a.start.x, a.end.x) ||
          Math.max(a.start.y, a.end.y) < Math.min(b.start.y, b.end.y) ||
          Math.max(b.start.y, b.end.y) < Math.min(a.start.y, a.end.y)) continue;
      const ax = a.end.x - a.start.x, ay = a.end.y - a.start.y;
      const bx = b.end.x - b.start.x, by = b.end.y - b.start.y;
      const cross = ax * by - ay * bx;
      if (Math.abs(cross) <= 1e-10 * Math.hypot(ax, ay) * Math.hypot(bx, by)) continue;
      const dx = b.start.x - a.start.x, dy = b.start.y - a.start.y;
      const t = (dx * by - dy * bx) / cross, u = (dx * ay - dy * ax) / cross;
      if (t < 0 || t > 1 || u < 0 || u > 1) continue;
      const point = { x: a.start.x + t * ax, y: a.start.y + t * ay };
      for (const [wall, position] of [[a, t], [b, u]] as const) {
        if (ptEq(point, wall.start) || ptEq(point, wall.end) || wall.splitPoints.some(p => ptEq(p.point, point))) continue;
        wall.splitPoints.push({ point, t: position });
      }
    }
  }

  // Build edges: for walls with split points, create sub-segments
  const edges: Edge[] = [];
  for (const sw of splitWalls) {
    if (sw.splitPoints.length === 0) {
      edges.push({ wallId: sw.wallId, start: sw.start, end: sw.end });
    } else {
      // Sort split points by t
      sw.splitPoints.sort((a, b) => a.t - b.t);
      let prev = sw.start;
      for (const sp of sw.splitPoints) {
        edges.push({ wallId: sw.wallId, start: prev, end: sp.point });
        prev = sp.point;
      }
      edges.push({ wallId: sw.wallId, start: prev, end: sw.end });
    }
  }

  // A coincident segment is one graph edge with all of its source aliases.
  // Endpoint splitting above also partitions partial collinear overlaps.
  const unique: Edge[] = [];
  for (const edge of edges) {
    if (ptEq(edge.start, edge.end)) continue;
    const existing = unique.find(e => (ptEq(e.start, edge.start) && ptEq(e.end, edge.end)) ||
      (ptEq(e.start, edge.end) && ptEq(e.end, edge.start)));
    if (existing) existing.wallIds = [...new Set([...(existing.wallIds ?? [existing.wallId]), edge.wallId])].sort();
    else unique.push({ ...edge, wallIds: [edge.wallId] });
  }
  return unique;
}

/**
 * Detect enclosed rooms from a set of walls using a simple graph-cycle approach.
 * Returns detected rooms with wall ids, centroid, and area.
 */
export function detectRooms(walls: Wall[]): Room[] {
  if (walls.length < 2) return [];

  // Split walls at T-junctions and crossings so shared-wall rooms are separated
  return detectSplitRooms(splitWallsAtJunctions(walls)).map(face => face.room);
}

/** A detected room and the outline of the face it was traced from. */
interface RoomFace {
  room: Room;
  polygon: Point[];
}

/** Drop the out-and-back steps a face walk takes along a dead-end wall
 * (a -> b -> a), so a stub leaves no zero-width spike in the outline. Takes the
 * closed walk's vertices (the first is not repeated at the end) and cancels
 * every step that the next step retraces. */
function withoutSpikes(walk: number[]): number[] {
  const steps: [number, number][] = [];
  for (let i = 0; i < walk.length; i++) {
    const from = walk[i], to = walk[(i + 1) % walk.length], last = steps[steps.length - 1];
    if (last && last[0] === to && last[1] === from) steps.pop();
    else steps.push([from, to]);
  }
  // A stub can also hang off the vertex where the walk began.
  while (steps.length > 1 && steps[0][1] === steps[steps.length - 1][0]) { steps.shift(); steps.pop(); }
  return steps.map(([from]) => from);
}

function detectSplitRooms(splitEdges: Edge[]): RoomFace[] {
  // Build adjacency: collect unique vertices & edges
  const vertices: Point[] = [];
  const edges: Edge[] = [];

  function findOrAddVertex(p: Point): number {
    for (let i = 0; i < vertices.length; i++) {
      if (ptEq(vertices[i], p)) return i;
    }
    vertices.push({ x: p.x, y: p.y });
    return vertices.length - 1;
  }

  for (const e of splitEdges) {
    const si = findOrAddVertex(e.start);
    const ei = findOrAddVertex(e.end);
    if (si !== ei) {
      edges.push({ ...e, start: vertices[si], end: vertices[ei] });
    }
  }

  // Build adjacency list
  const adj = new Map<number, { to: number; wallIds: string[]; angle: number }[]>();
  for (const e of edges) {
    const si = findOrAddVertex(e.start);
    const ei = findOrAddVertex(e.end);
    const angle1 = Math.atan2(e.end.y - e.start.y, e.end.x - e.start.x);
    const angle2 = Math.atan2(e.start.y - e.end.y, e.start.x - e.end.x);
    if (!adj.has(si)) adj.set(si, []);
    if (!adj.has(ei)) adj.set(ei, []);
    adj.get(si)!.push({ to: ei, wallIds: e.wallIds ?? [e.wallId], angle: angle1 });
    adj.get(ei)!.push({ to: si, wallIds: e.wallIds ?? [e.wallId], angle: angle2 });
  }

  // Sort adjacency by angle for each vertex
  for (const [, neighbors] of adj) {
    neighbors.sort((a, b) => a.angle - b.angle);
  }

  // Find minimal cycles using "next edge" (leftmost turn) traversal
  const usedDirected = new Set<string>();
  const rooms: Room[] = [];
  const polygons: Point[][] = [];
  let roomCount = 0;

  // A face walks a dead-end wall inside a room out and back, so it can visit
  // every undirected edge twice. Budget by directed edges, plus one step to
  // observe the closing return to the starting directed edge.
  const maxCycleSteps = 2 * edges.length + 1;

  for (const e of edges) {
    const si = findOrAddVertex(e.start);
    const ei = findOrAddVertex(e.end);
    for (const [from, to] of [[si, ei], [ei, si]]) {
      const key = `${from}-${to}`;
      if (usedDirected.has(key)) continue;

      // Trace cycle
      const cycle: number[] = [from];
      const wallIds: string[] = [];
      let cur = from;
      let next = to;
      let closed = false;

      for (let step = 0; step < maxCycleSteps; step++) {
        // A face is closed when it returns to its starting directed edge. It
        // may pass through `from` earlier (a dead-end branch hanging off it is
        // walked out and back), so a return to the vertex alone is not closure.
        if (step > 0 && cur === from && next === to) { closed = true; break; }
        const dk = `${cur}-${next}`;
        if (usedDirected.has(dk)) break;
        usedDirected.add(dk);
        cycle.push(next);

        // Find the wall for this edge
        const neighbors = adj.get(cur);
        const edgeInfo = neighbors?.find(n => n.to === next);
        if (edgeInfo) wallIds.push(...edgeInfo.wallIds);

        // Pick the next edge clockwise from the back direction at `next`.
        // This is the standard planar face-finding step and traces minimal
        // interior faces CCW (positive signed area) in math coordinates.
        const inAngle = Math.atan2(vertices[cur].y - vertices[next].y, vertices[cur].x - vertices[next].x);
        const neighbors2 = adj.get(next);
        if (!neighbors2 || neighbors2.length === 0) break;

        let bestIdx = -1;
        let bestDelta = Infinity;
        for (let i = 0; i < neighbors2.length; i++) {
          const n = neighbors2[i];
          // Skip going back along the same edge only if other options exist
          if (n.to === cur && neighbors2.length > 1) continue;
          // CW delta from back direction; smallest wins.
          let delta = inAngle - n.angle;
          if (delta <= 1e-9) delta += Math.PI * 2;
          if (delta < bestDelta) {
            bestDelta = delta;
            bestIdx = i;
          }
        }
        if (bestIdx === -1) break;

        cur = next;
        next = neighbors2[bestIdx].to;
      }

      if (!closed || cycle.length < 4) continue;

      // Compute signed area using shoelace.
      // With this traversal (smallest CCW turn from the reverse-direction) in
      // screen coordinates, interior faces have positive signed area and the
      // outer (unbounded) face is negative — skip it so it isn't counted as a room.
      // The traced face is the room's outline: walls shared with a neighbour
      // bound it only along the sub-segments this walk took.
      const poly = withoutSpikes(cycle.slice(0, -1)).map(i => ({ x: vertices[i].x, y: vertices[i].y }));
      const signedArea = shoelace(poly);
      if (signedArea <= 0) continue;
      const area = signedArea;

      // Skip slivers under 0.1 m² (1000 cm²). There is no upper bound: the
      // outside face was already rejected by its sign, so a hall is a room too.
      if (area < 1000) continue;

      // Compute centroid
      const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
      const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;

      // Check if this room overlaps with existing (same walls)
      const uniqueWalls = [...new Set(wallIds)];
      const dup = rooms.some(r => {
        const rw = new Set(r.walls);
        return uniqueWalls.length === rw.size && uniqueWalls.every(w => rw.has(w));
      });
      if (dup) continue;

      roomCount++;
      polygons.push(poly);
      rooms.push({
        id: `room-${roomCount}-${Date.now()}`,
        name: `Room ${roomCount}`,
        walls: uniqueWalls,
        floorTexture: 'hardwood',
        area: Math.round(area / 10000 * 100) / 100, // cm² to m²
      });
    }
  }

  // Deduct only immediate children using unrounded geometry. A grandchild is
  // already included in its parent's footprint and must not be deducted twice.
  const holes = roomHoles(polygons);
  return rooms.map((room, i) => ({ room: { ...room,
    area: Math.round((Math.abs(shoelace(polygons[i])) -
      holes[i].reduce((sum, ring) => sum + Math.abs(shoelace(ring)), 0)) / 100) / 100,
  }, polygon: polygons[i] }));
}

/** Recompute geometry while retaining user metadata by boundary identity, never name. */
export function resolveRooms(floor: Pick<Floor, 'walls' | 'rooms'>, previousRooms: Room[] = []): Room[] {
  return resolveSplitRooms(floor, previousRooms, splitWallsAtJunctions(floor.walls)).map(face => face.room);
}

/** Resolve all room polygons against one ephemeral graph for this floor build.
 * No identity cache is kept, so in-place wall edits cannot reuse stale geometry.
 */
export function resolveRoomGeometry(floor: Pick<Floor, 'walls' | 'rooms'>, previousRooms: Room[] = []): RoomFace[] {
  return resolveSplitRooms(floor, previousRooms, splitWallsAtJunctions(floor.walls));
}

/** A room's boundary identity: its wall ids plus every wall coincident with one of them. */
function boundaryKey(splitEdges: Edge[]): (room: Pick<Room, 'walls'>) => string {
  const aliasEdges = splitEdges.filter(e => (e.wallIds?.length ?? 0) > 1);
  return room => {
    const ids = new Set(room.walls);
    let changed = true;
    while (changed) {
      changed = false;
      for (const edge of aliasEdges) if (edge.wallIds!.some(id => ids.has(id))) {
        for (const id of edge.wallIds!) if (!ids.has(id)) { ids.add(id); changed = true; }
      }
    }
    return JSON.stringify([...ids].sort());
  };
}

function resolveSplitRooms(floor: Pick<Floor, 'walls' | 'rooms'>, previousRooms: Room[], splitEdges: Edge[]): RoomFace[] {
  // Include coincident source aliases when matching saved boundaries. Adding a
  // duplicate wall must not discard a room's name or finish. Ambiguous matches
  // deliberately remain unmatched rather than picking arbitrary metadata.
  const key = boundaryKey(splitEdges);
  const indexed = (rooms: Room[]) => {
    const result = new Map<string, Room | null>();
    for (const room of rooms) { const k = key(room); result.set(k, result.has(k) ? null : room); }
    return result;
  };
  const saved = indexed(floor.rooms ?? []);
  const previous = indexed(previousRooms);
  return (floor.walls.length < 2 ? [] : detectSplitRooms(splitEdges)).map(({ room, polygon }) => {
    const metadata = saved.get(key(room));
    if (metadata) return { room: { ...room, ...metadata, walls: room.walls, area: metadata.floorOpening ? 0 : room.area }, polygon };
    // Only the transient ID survives. Falling back to old metadata would undo
    // an intentional metadata removal (e.g. undoing a room rename).
    return { room: { ...room, id: previous.get(key(room))?.id ?? room.id }, polygon };
  });
}

function shoelace(pts: Point[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    sum += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return sum / 2;
}

/**
 * Get polygon vertices for a room from its walls.
 *
 * The outline is the face room detection traces for the room, found again from
 * the current walls: the detected room with exactly these walls, else the only
 * one with the same boundary identity, which resolveRooms() gives this saved
 * room's metadata. Re-chaining the room's own wall edges is just the fallback
 * for a saved room that no longer encloses a face: walls it shares with a
 * neighbour (a closet on one wall, an office against a hall's outer wall) close
 * the neighbour's loop as well, so a chain can take the wrong one.
 */
export function getRoomPolygon(room: Room, walls: Wall[]): Point[] {
  const wallIds = new Set(room.walls);
  if (walls.filter(w => wallIds.has(w.id)).length < 2) return [];

  const edges = splitWallsAtJunctions(walls), faces = detectSplitRooms(edges);
  const exact = faces.find(face => face.room.walls.length === wallIds.size && face.room.walls.every(id => wallIds.has(id)));
  if (exact) return exact.polygon;
  const key = boundaryKey(edges), saved = key(room), matches = faces.filter(face => key(face.room) === saved);
  return matches.length === 1 ? matches[0].polygon : polygonFromEdges(room, edges);
}

/**
 * Chain a room's split wall edges into a loop. detectRooms() traces cycles over
 * walls split at junctions, so a room may border only a sub-segment of a wall.
 * Chaining full wall segments here would overshoot the room at such walls and
 * break the loop (partial polygons with a spurious diagonal closing edge), so we
 * chain the same split edges instead.
 */
function polygonFromEdges(room: Room, splitEdges: Edge[]): Point[] {
  const wallIds = new Set(room.walls);
  let edges = splitEdges.filter(e => (e.wallIds ?? [e.wallId]).some(id => wallIds.has(id)));

  // Iteratively prune dangling sub-segments (parts of split walls that extend
  // past the room and connect to nothing else on this room's boundary).
  let pruned = true;
  while (pruned && edges.length >= 3) {
    pruned = false;
    edges = edges.filter(e => {
      const degStart = edges.filter(o => ptEq(o.start, e.start) || ptEq(o.end, e.start)).length;
      const degEnd = edges.filter(o => ptEq(o.start, e.end) || ptEq(o.end, e.end)).length;
      // Each count includes the edge itself; < 2 means the endpoint dangles
      if (degStart < 2 || degEnd < 2) { pruned = true; return false; }
      return true;
    });
  }
  if (edges.length < 3) return [];

  // Chain edges into ordered loops; return the largest closed one,
  // falling back to the longest open chain if no loop closes.
  const used = new Set<Edge>();
  let best: Point[] = [];
  let bestArea = 0;
  let longestOpen: Point[] = [];

  for (const startEdge of edges) {
    if (used.has(startEdge)) continue;
    const verts: Point[] = [startEdge.start];
    used.add(startEdge);
    let tip = startEdge.end;

    while (!ptEq(tip, verts[0])) {
      verts.push(tip);
      const next = edges.find(e => !used.has(e) && (ptEq(e.start, tip) || ptEq(e.end, tip)));
      if (!next) break;
      used.add(next);
      tip = ptEq(next.start, tip) ? next.end : next.start;
    }

    if (ptEq(tip, verts[0])) {
      const area = Math.abs(shoelace(verts));
      if (area > bestArea) { bestArea = area; best = verts; }
    } else if (verts.length > longestOpen.length) {
      longestOpen = verts;
    }
  }

  return best.length >= 3 ? best : longestOpen;
}

export function roomCentroid(polygon: Point[]): Point {
  const cx = polygon.reduce((s, p) => s + p.x, 0) / polygon.length;
  const cy = polygon.reduce((s, p) => s + p.y, 0) / polygon.length;
  return { x: cx, y: cy };
}

/** Shared label anchor; room geometry and dimension annotations stay unshifted. */
export function roomLabelPosition(room: Pick<Room, 'labelOffset'>, polygon: Point[], holes: Point[][] = []): Point {
  const center = room.labelOffset ? roomCentroid(polygon) : roomInteriorPoint(polygon, holes);
  return { x: center.x + (room.labelOffset?.x ?? 0), y: center.y + (room.labelOffset?.y ?? 0) };
}
