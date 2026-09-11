import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) test(`Portuguese canvas hints guide drawing and cancel elevation picking at ${width}px`, async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('o3d_locale', 'pt');
    localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-export']));
  });
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/editor');
  const hint = page.getByText('Comece a criar sua planta baixa', { exact: true });
  await expect(hint).toBeVisible();
  await expect(page.getByText(/Desenhe paredes com W ou arraste itens da barra lateral/)).toBeVisible();
  if (width < 768) {
    await page.getByRole('button', { name: 'Mais ações', exact: true }).click();
    await page.getByRole('button', { name: 'Vista de elevação', exact: true }).click();
  } else await page.getByRole('button', { name: 'Elevação', exact: true }).click();
  const pick = page.getByText(width < 768 ? 'Toque em uma parede para ver sua elevação' : 'Clique em uma parede para ver sua elevação — Esc para cancelar', { exact: true });
  await expect(pick).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pick).toHaveCount(0);
  if (width < 768) {
    const tools = page.getByRole('button', { name: 'Alternar painel de ferramentas', exact: true });
    await expect(tools).toHaveAttribute('aria-expanded', 'false');
    await tools.click();
    await expect(tools).toHaveAttribute('aria-expanded', 'true');
  }
  for (const label of ['Construir', 'Ambientes', 'Objetos']) await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Desenhar parede W/ }).click();
  if (width < 768) await expect(page.getByRole('button', { name: /^Desenhar parede W/ })).not.toBeInViewport();

  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * .3, box.y + box.height * .3);
  await page.mouse.click(box.x + box.width * .65, box.y + box.height * .3);
  await page.keyboard.press('Escape');
  await expect(hint).toHaveCount(0);
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
  const saved = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(saved.floors[0].walls).toHaveLength(1);
});
