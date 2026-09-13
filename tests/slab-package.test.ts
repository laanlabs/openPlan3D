import { expect, it } from 'vitest';
import { nativeToWeb, webToNative, applyNativeEdits, validatePackagePlan } from '$lib/utils/projectPackageBridge';
import { roomProject } from './fixtures/project';

it('carries centimetre slab depths into native metres and back through native edits', () => {
  const source = roomProject(); source.floors[0].slabThickness = 32.5;
  const { plan, mapping } = webToNative(source, undefined);
  expect(plan.levels[0].slabThickness).toBe(.325);
  const before = nativeToWeb(plan, mapping, source.name);
  expect(before.floors[0].slabThickness).toBe(32.5);
  const next = structuredClone(plan); next.levels[0].slabThickness = .2;
  const merged = applyNativeEdits(source, before, nativeToWeb(next, mapping, source.name));
  expect(merged.floors[0].slabThickness).toBe(20);
  expect(merged.floors[0].walls).toEqual(source.floors[0].walls);
  for (const value of [0, -1, Infinity, NaN, '20', 10001]) {
    next.levels[0].slabThickness = value;
    expect(() => validatePackagePlan(next)).toThrow();
  }
});

it('preserves the distinct legacy defaults when crossing platforms', () => {
  const source = roomProject();
  const { plan, mapping } = webToNative(source, undefined);
  expect(plan.levels[0].slabThickness).toBe(.05);
  delete plan.levels[0].slabThickness;
  expect(nativeToWeb(plan, mapping, source.name).floors[0].slabThickness).toBe(10);
});


it('carries floor elevations through native packages, edits and default resets', () => {
  const source = roomProject(); source.floors[0].elevation = -52.5;
  const { plan, mapping } = webToNative(source, undefined);
  expect(plan.levels[0].elevation).toBe(-.525);
  const before = nativeToWeb(plan, mapping, source.name);
  expect(before.floors[0].elevation).toBe(-52.5);
  const edited = structuredClone(plan); edited.levels[0].elevation = 4.25;
  expect(applyNativeEdits(source, before, nativeToWeb(edited, mapping, source.name)).floors[0].elevation).toBe(425);
  delete edited.levels[0].elevation;
  expect(applyNativeEdits(source, before, nativeToWeb(edited, mapping, source.name)).floors[0]).not.toHaveProperty('elevation');
  delete source.floors[0].elevation;
  expect(webToNative(source, plan, mapping).plan.levels[0]).not.toHaveProperty('elevation');
  for (const value of [NaN, Infinity, 10001, -10001, '4']) {
    edited.levels[0].elevation = value;
    expect(() => validatePackagePlan(edited)).toThrow();
  }
});
