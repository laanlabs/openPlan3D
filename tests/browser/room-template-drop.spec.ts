import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('dragging a furnished room template places walls and furniture in one undo', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.goto('/editor');
  let projectId = '';
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    const project = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
    projectId = project.id;
    return project.floors;
  }
  const before = await exported();
  await page.getByRole('button', { name: 'Ambientes', exact: true }).click();
  const template = page.getByRole('button', { name: /Quarto 5 itens$/ });
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  const bounds = (await canvas.boundingBox())!;
  await template.dragTo(canvas, { targetPosition: { x: bounds.width / 2 + 100, y: bounds.height / 2 + 50 } });
  const placed = await exported();
  expect(placed[0].walls).toHaveLength(4);
  expect(placed[0].furniture.map((item: any) => item.catalogId)).toEqual(['bed_queen', 'nightstand', 'nightstand', 'dresser', 'wardrobe']);
  const points = placed[0].walls.flatMap((wall: any) => [wall.start, wall.end]);
  expect(Math.min(...points.map((p: any) => p.x))).toBe(-100);
  expect(Math.max(...points.map((p: any) => p.x))).toBe(300);
  expect(Math.min(...points.map((p: any) => p.y))).toBe(-100);
  expect(Math.max(...points.map((p: any) => p.y))).toBe(200);
  expect(placed[0].furniture[0].position).toEqual({ x: 100, y: 20 });
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect(await exported()).toEqual(before);
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  expect(await exported()).toEqual(placed);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Salvo ✓', { exact: true })).toBeVisible();
  await page.goto(`/editor?id=${projectId}`);
  expect(await exported()).toEqual(placed);
});
