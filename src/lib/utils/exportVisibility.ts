import type { Floor, Project } from '$lib/models/types';
import type { ProjectSettings } from '$lib/stores/settings';
import { hasPlanExportContent } from './planExportContent';

/** The 2D view's layer switches (`layerVisibility` in stores/project.ts): the Layers panel, the status bar's Layers popover and the Furniture buttons. */
export interface PlanLayerSwitches {
  walls: boolean; doors: boolean; windows: boolean; furniture: boolean; stairs: boolean; columns: boolean;
  entourage: boolean; measurements: boolean; annotations: boolean; textAnnotations: boolean;
  /** Room names and areas (status bar → Layers → Room Labels). */
  roomLabels: boolean;
}

/** What the plan exports (PNG, PDF, SVG, DXF/DWG and Print Layout) draw of the active floor. */
export interface PlanExportVisibility extends PlanLayerSwitches {
  /** Automatic wall length labels: Settings → Dimensions → Dimensions and External Dimensions, drawn with the walls. */
  wallDimensions: boolean;
  /** Automatic room width × depth: Settings → Dimensions → Dimensions and Internal Dimensions. Only the Print Layout draws them. */
  roomDimensions: boolean;
}

/** Map the 2D view's switches to what the exports draw, so a file shows what the plan shows. */
export function planExportVisibility(layers: PlanLayerSwitches,
  settings: Pick<ProjectSettings, 'showDimensions' | 'showExternalDimensions' | 'showInternalDimensions'>): PlanExportVisibility {
  const { walls, doors, windows, furniture, stairs, columns, entourage, measurements, annotations, textAnnotations, roomLabels } = layers;
  return { walls, doors, windows, furniture, stairs, columns, entourage, measurements, annotations, textAnnotations, roomLabels,
    wallDimensions: walls && settings.showDimensions && settings.showExternalDimensions,
    roomDimensions: settings.showDimensions && settings.showInternalDimensions };
}

/**
 * The floor as the exports draw it: items on hidden layers are left out. Walls stay, because rooms
 * and openings are traced from them; `visibility.walls` decides whether the walls themselves are drawn.
 */
export function visiblePlanFloor(floor: Floor, visibility: PlanExportVisibility): Floor {
  return { ...floor,
    doors: visibility.doors ? floor.doors : [],
    windows: visibility.windows ? floor.windows : [],
    furniture: visibility.furniture ? floor.furniture : [],
    stairs: visibility.stairs ? floor.stairs : [],
    columns: visibility.columns ? floor.columns : [],
    entourage: visibility.entourage ? floor.entourage : [],
    measurements: visibility.measurements ? floor.measurements : [],
    annotations: visibility.annotations ? floor.annotations : [],
    textAnnotations: visibility.textAnnotations ? floor.textAnnotations : [],
  };
}

/** The active floor (or the first one) as the exports draw it; like `project.floors[0]`, undefined for a project without floors. */
export function visibleActiveFloor(project: Project, visibility: PlanExportVisibility): Floor {
  const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
  return floor && visiblePlanFloor(floor, visibility);
}

/** True when the floor has something to export but every item of it is on a hidden layer, so the file would be empty. */
export function planContentHidden(floor: Floor | undefined, visibility: PlanExportVisibility): boolean {
  const content = (f: Floor) => hasPlanExportContent(f) || !!f.entourage?.length;
  return !!floor && content(floor) && !content(visiblePlanFloor(floor, visibility));
}
