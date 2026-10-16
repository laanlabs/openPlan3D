import type { Floor, Project } from '$lib/models/types';

/** What the 3D orbit camera was last fitted to: a project, its active floor and the all-floors view. */
export interface FramingContext {
  projectId: string;
  floorId: string;
  stacked: boolean;
}

export function framingContext(project: Pick<Project, 'id'>, floor: Pick<Floor, 'id'>, stacked: boolean): FramingContext {
  return { projectId: project.id, floorId: floor.id, stacked };
}

/**
 * Whether a scene rebuild fits the orbit camera to the scene again. Only a new context does: the
 * viewer's first build, another project, another active floor (picked, or restored by Undo) or the
 * all-floors toggle. Edits, Undo/Redo, unit changes and photo textures that finish loading rebuild
 * the same context and keep the user's viewpoint; Top-Down View fits the view on request.
 */
export function shouldFrameScene(previous: FramingContext | null, next: FramingContext): boolean {
  return previous === null || previous.projectId !== next.projectId
    || previous.floorId !== next.floorId || previous.stacked !== next.stacked;
}
