import { describe, expect, it } from 'vitest';
import { applyAgentOps, AgentOpError, leanProject, listElements, summarizeProject } from '$lib/utils/agentOps';
import { roomProject } from './fixtures/project';

const base = () => {
  const p: any = roomProject();
  p.floors[0].furniture = [{ id: 'sofa-1', catalogId: 'sofa', position: { x: 100, y: 100 }, rotation: 0, scale: { x: 1, y: 1, z: 1 } }];
  return p;
};

describe('agent ops', () => {
  it('updates, adds and removes elements by id, all at once', () => {
    const p = base(), floorId = p.floors[0].id;
    const { project, changed } = applyAgentOps(p, [
      { op: 'update', id: 'sofa-1', set: { position: { x: 150, y: 120 }, rotation: 90 } },
      { op: 'add', floorId, collection: 'furniture', item: { id: 'lamp-1', catalogId: 'floor_lamp', position: { x: 50, y: 50 }, rotation: 0, scale: { x: 1, y: 1, z: 1 } } },
    ]);
    expect(changed).toEqual(['sofa-1', 'lamp-1']);
    const f = (project.floors[0] as any).furniture;
    expect(f.find((i: any) => i.id === 'sofa-1')).toMatchObject({ position: { x: 150, y: 120 }, rotation: 90 });
    expect(f.some((i: any) => i.id === 'lamp-1')).toBe(true);
    expect((p.floors[0] as any).furniture[0].position).toEqual({ x: 100, y: 100 }); // input untouched
    const removed = applyAgentOps(project, [{ op: 'remove', id: 'lamp-1' }]).project;
    expect((removed.floors[0] as any).furniture.map((i: any) => i.id)).toEqual(['sofa-1']);
  });

  it('null removes an optional field', () => {
    const p = base();
    p.floors[0].furniture[0].width = 300;
    const { project } = applyAgentOps(p, [{ op: 'update', id: 'sofa-1', set: { width: null } }]);
    expect('width' in (project.floors[0] as any).furniture[0]).toBe(false);
  });

  it('applies nothing when one operation or the result is invalid', () => {
    const p = base();
    expect(() => applyAgentOps(p, [{ op: 'update', id: 'sofa-1', set: { rotation: 45 } }, { op: 'remove', id: 'nope' }])).toThrow(AgentOpError);
    expect(() => applyAgentOps(p, [{ op: 'update', id: 'sofa-1', set: { position: 'here' } }])).toThrow(/not a valid project/);
    expect(() => applyAgentOps(p, [{ op: 'add', floorId: p.floors[0].id, collection: 'furniture', item: { id: 'sofa-1' } }])).toThrow(/already used/);
    expect(() => applyAgentOps(p, [{ op: 'update', id: 'sofa-1', set: { id: 'x' } }])).toThrow(AgentOpError);
    expect(() => applyAgentOps(p, [{ op: 'updateFloor', floorId: p.floors[0].id, set: { walls: [] } }])).toThrow(/can't be set/);
    expect((p.floors[0] as any).furniture[0].rotation).toBe(0);
  });

  it('summarizes, lists and leaves out large payloads', () => {
    const p = base();
    p.floors[0].backgroundImage = { dataUrl: 'data:image/png;base64,' + 'A'.repeat(5000), position: { x: 0, y: 0 }, scale: 1, opacity: 0.5, rotation: 0 };
    expect(summarizeProject(p).floors[0].counts.furniture).toBe(1);
    expect(listElements(p, { query: 'sofa' })).toHaveLength(1);
    expect(listElements(p, { collection: 'walls' }).length).toBe(p.floors[0].walls.length);
    expect(JSON.stringify(leanProject(p)).length).toBeLessThan(JSON.stringify(p).length - 4000);
  });
});
