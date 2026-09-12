import type { Floor, Project } from '$lib/models/types';
import type { ProjectSettings } from '$lib/stores/settings';

function renderedFloor(floor: Floor) {
  // These fields belong to the 2D canvas. In particular, never walk embedded
  // background images or item photo payloads just to decide whether to rebuild.
  const { backgroundImage, guides, measurements, annotations, textAnnotations,
    groups, entourage, ...rendered } = floor;
  const withoutDetails = <T extends { details?: unknown }>(items: T[]) =>
    items.map(({ details, ...item }) => item);
  return { ...rendered,
    walls: withoutDetails(floor.walls), rooms: withoutDetails(floor.rooms),
    doors: withoutDetails(floor.doors), windows: withoutDetails(floor.windows),
    furniture: withoutDetails(floor.furniture),
  };
}

/** A value snapshot also detects in-place edits and history's cloned objects.
 * Keep all other floor/item fields conservatively: geometry, finish overrides,
 * room labels, elevations and future render fields must still invalidate. */
export function sceneSignature(project: Project, floor: Floor, stacked: boolean, units: ProjectSettings['units']): string {
  return JSON.stringify({ projectId: project.id, activeFloorId: floor.id, stacked, units,
    customModels: project.customModels,
    floors: (stacked ? project.floors : [floor]).map(renderedFloor) });
}
