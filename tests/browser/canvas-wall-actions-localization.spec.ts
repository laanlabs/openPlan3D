import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const curved of [false, true]) test(`Portuguese ${curved ? 'curved' : 'straight'} wall split preserves openings and undo`, async ({ page }) => {
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  const floor = plan.floors[0];
  floor.doors[0].position = .25;
  floor.windows[0].wallId = floor.walls[0].id;
  floor.windows[0].position = .75;
  floor.walls[0].startHeight = 250; floor.walls[0].endHeight = 350; floor.walls[0].height = 350;
  if (curved) floor.walls[0].curvePoint = { x: 300.25, y: 100 };
  floor.groups = [{ id: 'wall-group', elementIds: [floor.walls[0].id, floor.walls[1].id] }];
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'wall-actions.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  let exportedProjectId = '';
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    const project = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
    exportedProjectId = project.id;
    return project.floors[0];
  }
  const original = await exported();
  await page.getByRole('button', { name: 'Salvar', exact: true }).press('l');
  await page.getByRole('button', { name: '🚪 Porta aberta 1', exact: true }).click();
  await page.getByRole('button', { name: 'Inverter abertura', exact: true }).click();
  const flipped = await exported();
  expect(flipped.doors[0]).toEqual({ ...original.doors[0], swingDirection: 'right' });
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await exported()).toEqual(original);
  await page.getByRole('button', { name: '─ Parede 1', exact: true }).click();
  if (curved) {
    const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
    await canvas.focus(); await canvas.press('Shift+F10');
    const splitAction = page.getByRole('menuitem', { name: '✂️ Dividir Parede', exact: true });
    await expect(splitAction).toBeFocused(); await splitAction.press('Enter');
    await expect(canvas).toBeFocused();
  } else {
    await page.getByRole('button', { name: 'Dividir parede ao meio', exact: true }).click();
  }
  const split = await exported();
  expect(split.walls).toHaveLength(original.walls.length + 1);
  const first = split.walls[0], second = split.walls.at(-1);
  expect(first.end).toEqual({ x: 300.25, y: curved ? 50 : 0 });
  if (curved) {
    expect(first.curvePoint).toEqual({ x: 150.125, y: 50 });
    expect(second.curvePoint).toEqual({ x: 450.375, y: 50 });
  }
  expect(second.start).toEqual(first.end); expect(second.end).toEqual(original.walls[0].end);
  expect([first.startHeight, first.endHeight, second.startHeight, second.endHeight]).toEqual([250,300,300,350]);
  expect(split.doors[0]).toEqual({ ...original.doors[0], position: .5 });
  expect(split.windows[0]).toEqual({ ...original.windows[0], position: .5, wallId: second.id });
  expect(split.groups).toEqual([{ id: 'wall-group', elementIds: [first.id, second.id, original.walls[1].id] }]);
  expect(split.rooms).toEqual(original.rooms.map((room: any) => ({
    ...room, walls: room.walls.flatMap((id: string) => id === first.id ? [id, second.id] : [id]),
  })));
  await expect(page.getByRole('button', { name: new RegExp(original.rooms[0].name) })).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await exported()).toEqual(original);
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  expect(await exported()).toEqual(split);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Salvo ✓', { exact: true })).toBeVisible();
  await page.goto(`/editor?id=${encodeURIComponent(exportedProjectId)}`);
  expect(await exported()).toEqual(split);
});

for (const kind of ['door', 'window']) test(`midpoint split explains and preserves a crossing ${kind}`, async ({ page }) => {
  const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  const floor = plan.floors[0];
  floor.doors = kind === 'door' ? floor.doors : [];
  floor.windows = kind === 'window' ? floor.windows : [];
  const opening = [...floor.doors, ...floor.windows][0];
  opening.wallId = floor.walls[0].id;
  opening.position = .5;
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'crossing.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  const before = await exported();
  await page.getByRole('button', { name: 'Salvar', exact: true }).press('l');
  await page.getByRole('button', { name: '─ Parede 1', exact: true }).click();
  await page.getByRole('button', { name: 'Dividir parede ao meio', exact: true }).click();
  const notice = page.getByRole('status').filter({ hasText: 'Escolha um ponto de divisão fora de portas e janelas.' });
  await expect(notice).toBeVisible();
  expect(await exported()).toEqual(before);
  await notice.getByRole('button').click();
  await expect(notice).toHaveCount(0);
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  await canvas.focus();
  await canvas.press(kind === 'door' ? 'Shift+F10' : 'ContextMenu');
  const menu = page.getByRole('menu');
  const splitAction = menu.getByRole('menuitem', { name: '✂️ Dividir Parede', exact: true });
  await expect(splitAction).toBeFocused();
  // An editor Delete shortcut must not remove the selected wall behind a menu.
  await page.keyboard.press('Delete');
  await expect(menu).toBeVisible();
  await splitAction.press('Enter');
  await expect(menu).toHaveCount(0);
  await expect(canvas).toBeFocused();
  await expect(notice).toBeVisible();
  expect(await exported()).toEqual(before);
});
