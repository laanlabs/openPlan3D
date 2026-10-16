import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';

// The fixture's straight wall runs along X at Z = 0; the exported scene is in metres.
function intersections(scene: any, x: number, height: number, wallsOnly: boolean) {
  const root = new Group(), material = new MeshBasicMaterial({ side: DoubleSide });
  for (const mesh of scene.meshes) {
    if (wallsOnly && mesh.material !== 'wall') continue;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(mesh.vertices.flat(), 3));
    geometry.setIndex(mesh.faces.flat()); const node = new Mesh(geometry, material); node.name = mesh.name; root.add(node);
  }
  root.updateMatrixWorld(true);
  const ray = new Raycaster(new Vector3(x, height, .6), new Vector3(0, 0, -1), 0, 1.2);
  const count = ray.intersectObject(root, true).length;
  root.traverse(node => { if (node instanceof Mesh) node.geometry.dispose(); }); material.dispose();
  return count;
}

test('straight-wall baseboards stop at doorways and floor-level windows, as curved ones do', async ({ page }, testInfo) => {
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/straight-openings.openplan.json'));
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.waitForLoadState('networkidle');
  // The 3D tip opens once the viewer has started; it must be open before waiting for it to close.
  await expect(page.locator('canvas[data-plan3d-canvas="true"]')).toBeVisible({ timeout: 60_000 });
  const hint = page.getByRole('button', { name: 'Got it', exact: true });
  await expect(hint).toBeHidden({ timeout: 15_000 });
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Blender Scene', exact: true }).click();
  const scene = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  await testInfo.attach('straight-opening-scene.json', { body: JSON.stringify(scene), contentType: 'application/json' });
  // Rays 4 cm above the floor, clear of mullions and jambs. Baseboards export as proxy meshes.
  expect(intersections(scene, -.75, .04, false)).toBe(0); // window with a 0 cm sill
  expect(intersections(scene, -3, .04, false)).toBe(0); // doorway
  // A sill above the 8 cm board leaves it running in front of the wall below the window.
  expect(intersections(scene, 1.25, .04, false)).toBeGreaterThan(intersections(scene, 1.25, .04, true));
  expect(intersections(scene, 3, .04, false)).toBeGreaterThan(intersections(scene, 3, .04, true)); // solid control
  expect(errors).toEqual([]);
});
