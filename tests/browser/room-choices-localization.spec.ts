import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) test(`Portuguese room choices preserve geometry and furniture IDs at ${width}px`, async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/editor');
  if (width < 768) await page.getByRole('button', { name: 'Alternar painel de ferramentas', exact: true }).click();
  await page.getByRole('button', { name: 'Ambientes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Formatos de ambientes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Retângulo$/ }).click();
  async function exported() {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  }
  function expectRectangle(floor: any) {
    expect(floor.walls).toHaveLength(4);
    const points = floor.walls.flatMap((wall: any) => [wall.start, wall.end]);
    expect(Math.max(...points.map((p: any) => p.x)) - Math.min(...points.map((p: any) => p.x))).toBe(400);
    expect(Math.max(...points.map((p: any) => p.y)) - Math.min(...points.map((p: any) => p.y))).toBe(300);
  }
  expectRectangle(await exported());
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  expect((await exported()).walls).toHaveLength(0);
  await page.getByRole('button', { name: /Quarto 5 itens$/ }).click();
  const furnished = await exported();
  expectRectangle(furnished);
  expect(furnished.furniture.map((item: any) => item.catalogId)).toEqual(['bed_queen', 'nightstand', 'nightstand', 'dresser', 'wardrobe']);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  const undone = await exported();
  expect(undone.walls).toHaveLength(0);
  expect(undone.furniture).toHaveLength(0);
});
