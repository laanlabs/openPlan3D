import { expect, it } from 'vitest';
import { resolveRooms } from '$lib/utils/roomDetection';
import { roomProject } from './fixtures/project';

// Paired with native RoomRegionTests.testRectangleAreaConventionBaseline.
// Characterizes the current centerline convention, not cross-platform parity.
it('measures the 4 m by 3 m centerline rectangle independently of wall thickness', () => {
  const floor = roomProject().floors[0];
  for (const thickness of [10, 20, 40]) {
    floor.walls = floor.walls.map(wall => ({ ...wall, thickness }));
    const rooms = resolveRooms(floor);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].area).toBe(12);
    const interior = (4 - thickness / 100) * (3 - thickness / 100);
    expect(rooms[0].area).toBeGreaterThan(interior);
  }
});
