import type { Floor, Room } from '$lib/models/types';
import { planContentBounds } from './planContentBounds';

/** Frame selected content, retaining opening hosts only as geometric references. */
export function selectionContentBounds(floor: Floor, ids: ReadonlySet<string>, options: Parameters<typeof planContentBounds>[1], rooms: Room[] = floor.rooms) {
  if (!ids.size) return null;
  const wallIds = new Set(ids);
  for (const room of rooms ?? []) if (ids.has(room.id)) {
    for (const id of room.walls) wallIds.add(id);
  }
  const selected: Floor = {...floor,backgroundImage:undefined,
    walls:floor.walls.filter(item=>wallIds.has(item.id)),
    doors:floor.doors.filter(item=>ids.has(item.id)||wallIds.has(item.wallId)),
    windows:floor.windows.filter(item=>ids.has(item.id)||wallIds.has(item.wallId)),
    furniture:floor.furniture.filter(item=>ids.has(item.id)),
    stairs:floor.stairs?.filter(item=>ids.has(item.id)),columns:floor.columns?.filter(item=>ids.has(item.id)),
    entourage:floor.entourage?.filter(item=>ids.has(item.id)),textAnnotations:floor.textAnnotations?.filter(item=>ids.has(item.id)),
    measurements:floor.measurements?.filter(item=>ids.has(item.id)),annotations:floor.annotations?.filter(item=>ids.has(item.id)),
  };
  return planContentBounds(selected,{...options,openingWalls:floor.walls,backgroundSize:undefined,
    roomLabels:options.roomLabels?.filter(entry=>ids.has(entry.room.id)),
    dimensionRooms:options.dimensionRooms?.filter(entry=>ids.has(entry.room.id)),
  });
}
