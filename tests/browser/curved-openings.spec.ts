import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';

function intersections(scene: any, parameter: number, height: number, wallsOnly = true) {
  const root = new Group(), material = new MeshBasicMaterial({ side: DoubleSide });
  for (const mesh of scene.meshes) {
    if (wallsOnly && mesh.material !== 'wall') continue;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(mesh.vertices.flat(), 3));
    geometry.setIndex(mesh.faces.flat()); const node = new Mesh(geometry, material); node.name = mesh.name; root.add(node);
  }
  root.updateMatrixWorld(true);
  const center = new Vector3(-3 + 6 * parameter, height, 6 * parameter * (1 - parameter));
  const normal = new Vector3(-(1 - 2 * parameter), 0, 1).normalize();
  const ray = new Raycaster(center.clone().addScaledVector(normal, .6), normal.clone().negate(), 0, 1.2);
  const hits = ray.intersectObject(root, true), count = hits.length;
  root.traverse(node => { if (node instanceof Mesh) node.geometry.dispose(); }); material.dispose();
  return count;
}

for (const split of [false, true]) test(`curved openings and trim follow the curve in active and stacked browser meshes${split ? ' after splitting' : ''}`, async ({ page }, testInfo) => {
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/curved-openings.openplan.json'));
  if (split) {
    await page.getByRole('button', { name: 'Toggle Layers Panel', exact: true }).click();
    await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
    await page.getByRole('button', { name: 'Split wall at midpoint', exact: true }).click();
    await expect(page.getByText('2 walls', { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.waitForLoadState('networkidle');
  const hint = page.getByRole('button', { name: 'Got it', exact: true });
  await expect(hint).toBeHidden({ timeout: 15_000 });
  async function exported() {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Blender Scene', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  }
  function check(scene: any, elevation: number) {
    expect(intersections(scene, .25, elevation + .04, false)).toBe(0); // includes baseboards and jambs
    expect(intersections(scene, .75, elevation + 1.1)).toBe(0);
    expect(intersections(scene, .5, elevation + .5)).toBeGreaterThan(0); // solid control between openings
  }
  const active = await exported();
  await testInfo.attach('curved-opening-scene.json', { body: JSON.stringify(active), contentType: 'application/json' });
  check(active, 0);
  const trim = active.meshes.filter((m: any) => m.material === 'proxy' && Math.max(...m.vertices.map((v: number[]) => v[1])) > .5);
  expect(trim.length).toBeGreaterThan(6);
  // Old trim lived on the endpoint chord at Z=0, away from the curved apertures.
  for (const mesh of trim) expect(Math.min(...mesh.vertices.map((v: number[]) => v[2]))).toBeGreaterThan(.5);
  await page.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
  const stacked = await exported(); check(stacked, 0); check(stacked, 4);
  await testInfo.attach('curved-opening-stacked-scene.json', { body: JSON.stringify(stacked), contentType: 'application/json' });
  await page.getByRole('combobox', { name: 'Current floor', exact: true }).selectOption('curve-floor-1');
  const upperActive = await exported(); check(upperActive, 0); check(upperActive, 4);
  expect(errors).toEqual([]);
});
