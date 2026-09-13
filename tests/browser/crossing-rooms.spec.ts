import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';

function checkCrossingRooms(scene: any, elevation: number) {
  const slabs = scene.meshes.filter((mesh: any) => {
    const ys = mesh.vertices.map((p: number[]) => p[1]);
    return mesh.material === 'floor' && Math.abs(Math.min(...ys) - (elevation - .05)) < 1e-5 && Math.abs(Math.max(...ys) - elevation) < 1e-5;
  });
  expect(slabs).toHaveLength(4); // crossing dividers produce four independent room slabs
  const root = new Group(), material = new MeshBasicMaterial({ side: DoubleSide });
  for (const mesh of slabs) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(mesh.vertices.flat(), 3));
    geometry.setIndex(mesh.faces.flat()); root.add(new Mesh(geometry, material));
  }
  root.updateMatrixWorld(true);
  const hits = (x: number, z: number) => new Raycaster(new Vector3(x, elevation + .1, z), new Vector3(0, -1, 0), 0, .2).intersectObject(root, true).length;
  for (const x of [1, 5]) for (const z of [1, 3]) expect(hits(x, z)).toBeGreaterThan(0);
  expect(hits(3, -0.5)).toBe(0); // overhanging divider does not create extra slab
  for (const slab of slabs) {
    const xs = slab.vertices.map((v: number[]) => v[0]), zs = slab.vertices.map((v: number[]) => v[2]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(3);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(2);
  }
  root.traverse(node => { if (node instanceof Mesh) node.geometry.dispose(); }); material.dispose();
}

test('crossing dividers produce four room slabs across active-floor switches', async ({ page }, testInfo) => {
  test.slow();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/crossing-rooms.openplan.json'));
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.waitForLoadState('networkidle');
  const hint = page.getByRole('button', { name: 'Got it', exact: true });
  // The tip auto-dismisses after eight seconds; clicking it races that timer.
  await expect(hint).toBeHidden({ timeout: 15_000 });
  async function exported() {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Blender Scene', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  }
  checkCrossingRooms(await exported(), 0);
  await page.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
  const stacked = await exported(); checkCrossingRooms(stacked, 0); checkCrossingRooms(stacked, 4);
  await testInfo.attach('crossing-rooms-stacked.json', { body: JSON.stringify(stacked), contentType: 'application/json' });
  await page.getByRole('combobox', { name: 'Current floor', exact: true }).selectOption('slab-floor-1');
  const switched = await exported(); checkCrossingRooms(switched, 0); checkCrossingRooms(switched, 4);
  expect(errors).toEqual([]);
});
