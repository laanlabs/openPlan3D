import type { Project } from '$lib/models/types';
import { readProject } from '$lib/utils/projectValidation';

/**
 * Edits a local agent (via the agent bridge) can make to the open project. Every element in a floor's lists has a
 * project-unique id, so agents address elements by id; positions are centimetres in plan coordinates (x right,
 * y down), like the editor. All operations of one call apply together or not at all, and the result must pass
 * readProject() — the same validation an import gets.
 */
export type AgentOp =
  | { op: 'update'; id: string; set: Record<string, unknown> }
  | { op: 'add'; floorId: string; collection: ElementCollection; item: Record<string, unknown> }
  | { op: 'remove'; id: string }
  | { op: 'updateFloor'; floorId: string; set: Record<string, unknown> };

export const ELEMENT_COLLECTIONS = ['walls', 'doors', 'windows', 'furniture', 'stairs', 'columns', 'rooms', 'guides',
  'measurements', 'annotations', 'textAnnotations', 'entourage'] as const;
export type ElementCollection = typeof ELEMENT_COLLECTIONS[number];
/** Floor fields an agent may change; geometry lives in the element lists. */
const FLOOR_FIELDS = new Set(['name', 'level', 'elevation', 'slabThickness']);

export class AgentOpError extends Error {}

type Found = { floor: any; collection: ElementCollection; index: number; item: any };
export function findElement(project: Project, id: string): Found | null {
  for (const floor of project.floors as any[]) for (const collection of ELEMENT_COLLECTIONS) {
    const list = floor[collection];
    if (!Array.isArray(list)) continue;
    const index = list.findIndex((item: any) => item?.id === id);
    if (index >= 0) return { floor, collection, index, item: list[index] };
  }
  return null;
}

/** Apply ops to a copy of the project. Throws AgentOpError (nothing applied) when an op or the result is invalid. */
export function applyAgentOps(project: Project, ops: AgentOp[]): { project: Project; changed: string[] } {
  if (!Array.isArray(ops) || !ops.length) throw new AgentOpError('Give at least one operation.');
  if (ops.length > 500) throw new AgentOpError('At most 500 operations per call.');
  const next: any = JSON.parse(JSON.stringify(project));
  const changed: string[] = [];
  ops.forEach((op: any, i) => {
    const where = `operation ${i + 1} (${op?.op})`;
    if (op?.op === 'update') {
      const found = findElement(next, String(op.id));
      if (!found) throw new AgentOpError(`${where}: no element with id "${op.id}".`);
      if (!op.set || typeof op.set !== 'object' || 'id' in op.set) throw new AgentOpError(`${where}: "set" must be an object of fields (not "id").`);
      // null removes an optional field (e.g. a width override); everything else replaces the field
      const item = { ...found.item };
      for (const [k, v] of Object.entries(op.set)) { if (v === null) delete item[k]; else item[k] = v; }
      found.floor[found.collection][found.index] = item;
      changed.push(found.item.id);
    } else if (op?.op === 'add') {
      const floor = next.floors.find((f: any) => f.id === op.floorId);
      if (!floor) throw new AgentOpError(`${where}: no floor "${op.floorId}".`);
      if (!ELEMENT_COLLECTIONS.includes(op.collection)) throw new AgentOpError(`${where}: collection must be one of ${ELEMENT_COLLECTIONS.join(', ')}.`);
      if (!op.item || typeof op.item !== 'object' || typeof op.item.id !== 'string' || !op.item.id) throw new AgentOpError(`${where}: the item needs a string "id".`);
      if (findElement(next, op.item.id)) throw new AgentOpError(`${where}: id "${op.item.id}" is already used.`);
      (floor[op.collection] ??= []).push(op.item);
      changed.push(op.item.id);
    } else if (op?.op === 'remove') {
      const found = findElement(next, String(op.id));
      if (!found) throw new AgentOpError(`${where}: no element with id "${op.id}".`);
      found.floor[found.collection].splice(found.index, 1);
      changed.push(found.item.id);
    } else if (op?.op === 'updateFloor') {
      const floor = next.floors.find((f: any) => f.id === op.floorId);
      if (!floor) throw new AgentOpError(`${where}: no floor "${op.floorId}".`);
      for (const [k, v] of Object.entries(op.set ?? {})) {
        if (!FLOOR_FIELDS.has(k)) throw new AgentOpError(`${where}: floor field "${k}" can't be set here (allowed: ${[...FLOOR_FIELDS].join(', ')}).`);
        floor[k] = v;
      }
      changed.push(floor.id);
    } else throw new AgentOpError(`${where}: unknown op; use update, add, remove or updateFloor.`);
  });
  try {
    return { project: readProject(next), changed };
  } catch (error) {
    throw new AgentOpError(`The result is not a valid project, nothing was changed: ${error instanceof Error ? error.message : error}`);
  }
}

/** The project without large binary payloads (background images, package attachments), for agents to read. */
export function leanProject(project: Project): Record<string, unknown> {
  const p: any = JSON.parse(JSON.stringify(project));
  for (const floor of p.floors ?? []) {
    if (floor.backgroundImage?.dataUrl) floor.backgroundImage = { ...floor.backgroundImage, dataUrl: `<${floor.backgroundImage.dataUrl.length} chars omitted>` };
  }
  if (p.projectPackage) p.projectPackage = { ...p.projectPackage, native: '<omitted>', assets: Object.fromEntries(
    Object.entries(p.projectPackage.assets ?? {}).map(([k, v]) => [k, `<${String(v).length} chars omitted>`])) };
  for (const c of p.customEntourage ?? []) if (c.dataUrl) c.dataUrl = `<${c.dataUrl.length} chars omitted>`;
  return p;
}

/** Floors with element counts and rooms, for a quick look. */
export function summarizeProject(project: Project) {
  return {
    id: project.id, name: project.name, activeFloorId: project.activeFloorId, updatedAt: project.updatedAt,
    floors: (project.floors as any[]).map(f => ({
      id: f.id, name: f.name, level: f.level, elevation: f.elevation,
      counts: Object.fromEntries(ELEMENT_COLLECTIONS.map(c => [c, Array.isArray(f[c]) ? f[c].length : 0]).filter(([, n]) => n)),
      rooms: (f.rooms ?? []).map((r: any) => ({ id: r.id, name: r.name, area: r.area })),
    })),
  };
}

/** Elements matching a filter, one compact record each. `query` matches id, catalog id, name or label (case-insensitive). */
export function listElements(project: Project, filter: { floorId?: string; collection?: string; query?: string; limit?: number } = {}) {
  const q = filter.query?.toLowerCase();
  const out: Record<string, unknown>[] = [];
  for (const floor of project.floors as any[]) {
    if (filter.floorId && floor.id !== filter.floorId) continue;
    for (const collection of ELEMENT_COLLECTIONS) {
      if (filter.collection && collection !== filter.collection) continue;
      for (const item of floor[collection] ?? []) {
        const text = [item.id, item.catalogId, item.name, item.sourceCategory, item.text, item.type].filter(Boolean).join(' ').toLowerCase();
        if (q && !text.includes(q)) continue;
        const { dataUrl, details, ...rest } = item;
        out.push({ floorId: floor.id, collection, ...rest });
        if (out.length >= (filter.limit ?? 200)) return out;
      }
    }
  }
  return out;
}
