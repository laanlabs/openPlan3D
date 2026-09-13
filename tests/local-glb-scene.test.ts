import { expect, it } from 'vitest';
import { validateLocalGLBScene } from '$lib/utils/localGLBScene';
function model(): Record<string, any> {
  return { scene: 0, scenes: [{ nodes: [0] }], nodes: [{ children: [1] }, { mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    accessors: [{ type: 'VEC3', count: 8 }, { type: 'SCALAR', count: 36 }] };
}
it('counts nested mesh instances in every scene without mutating source data', () => {
  const data = model(); data.scenes.push({ nodes: [1] }); const before = structuredClone(data);
  expect(validateLocalGLBScene(data)).toEqual({ activeScene: 0, scenes: [
    { nodes: 2, primitives: 1, vertices: 36 }, { nodes: 1, primitives: 1, vertices: 36 }] });
  expect(data).toEqual(before);
});
it('rejects cycles, duplicate children, multiple parents and overlapping scene roots', () => {
  for (const patch of [
    (d: any) => d.nodes[1].children = [0],
    (d: any) => d.nodes[0].children = [1, 1],
    (d: any) => d.nodes.push({ children: [1] }),
    (d: any) => d.scenes[0].nodes = [0, 1],
  ]) { const data = model(); patch(data); expect(() => validateLocalGLBScene(data)).toThrow('Invalid GLB scene:'); }
});
it('rejects invalid references and transforms before renderer traversal', () => {
  for (const patch of [
    (d: any) => d.scene = 9,
    (d: any) => d.nodes[1].mesh = -1,
    (d: any) => d.nodes[0].children = [99],
    (d: any) => d.nodes[1].translation = [0, NaN, 0],
    (d: any) => Object.assign(d.nodes[1], { matrix: Array(16).fill(0), scale: [1, 1, 1] }),
    (d: any) => d.meshes[0].primitives[0].attributes.POSITION = 99,
  ]) { const data = model(); patch(data); expect(() => validateLocalGLBScene(data)).toThrow('Invalid GLB scene:'); }
});
it('bounds hierarchy depth and geometry multiplied by node instances', () => {
  const deep = model(); deep.nodes = Array.from({ length: 65 }, (_, i) => i === 64 ? { mesh: 0 } : { children: [i + 1] });
  expect(() => validateLocalGLBScene(deep)).toThrow('too deep');
  const copies = model(); copies.accessors[1].count = 1_000_000;
  copies.nodes = [{ mesh: 0 }, { mesh: 0 }, { mesh: 0 }]; copies.scenes[0].nodes = [0, 1, 2];
  expect(() => validateLocalGLBScene(copies)).toThrow('Instanced');
});
it('requires a renderable active scene and positive bounded primitive counts', () => {
  const empty = model(); empty.scenes[0].nodes = [];
  expect(() => validateLocalGLBScene(empty)).toThrow('no mesh');
  for (const count of [0, -1, 1.5, 2_000_001]) {
    const data = model(); data.accessors[1].count = count;
    expect(() => validateLocalGLBScene(data)).toThrow('primitive size');
  }
});
