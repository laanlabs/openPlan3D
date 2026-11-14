import type { Floor, Project } from '$lib/models/types';

export const DEFAULT_FLOOR_SPACING = 300;

export function validFloorElevation(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Older project files without a level retain their original array order. */
export function orderedFloors(floors: Floor[]): { floor: Floor; level: number }[] {
  return floors.map((floor, index) => ({ floor, level: Number.isFinite(floor.level) ? floor.level : index }))
    .sort((a, b) => a.level - b.level);
}

/** Elevations are independent of wall heights and retain level/legacy ordering. */
export function floorElevations(floors: Floor[]): { floor: Floor; level: number; elevation: number }[] {
  return orderedFloors(floors).map(({ floor, level }) => ({
    floor, level,
    elevation: validFloorElevation(floor.elevation) ? floor.elevation : level * DEFAULT_FLOOR_SPACING,
  }));
}

export function nextFloorLevel(floors: Floor[]): number {
  return Math.max(-1, ...orderedFloors(floors).map(entry => entry.level)) + 1;
}

/** The level for a new floor under the lowest one: -1 below a ground floor, 0 for an empty plan. */
export function floorLevelBelow(floors: Floor[]): number {
  return Math.min(1, ...orderedFloors(floors).map(entry => entry.level)) - 1;
}

/** Ground Floor, Floor 1, Floor 2… above ground; Basement, Basement 2… below, as scanned storeys are named. */
export function defaultFloorName(level: number): string {
  if (level === 0) return 'Ground Floor';
  if (level < 0) return level === -1 ? 'Basement' : `Basement ${-level}`;
  return `Floor ${level}`;
}

/** Longest floor name the editor accepts. */
export const MAX_FLOOR_NAME_LENGTH = 60;

export function getFloorBelow(project: Project | null): Floor | null {
  if (!project) return null;
  const entries = orderedFloors(project.floors);
  const active = entries.find(entry => entry.floor.id === project.activeFloorId);
  return active ? entries.filter(entry => entry.level < active.level).at(-1)?.floor ?? null : null;
}
