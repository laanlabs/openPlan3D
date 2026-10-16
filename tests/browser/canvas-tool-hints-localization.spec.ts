import { expect, test } from '@playwright/test';

test('Portuguese tool hints guide walls, openings, furniture, measuring, text and dimensions', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('o3d_locale', 'pt');
    localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-door', 'first-furniture', 'first-export']));
    // The opening ghost and wall snap labels are painted on the plan canvas, not placed in the DOM:
    // keep each painted text with its last position in page coordinates.
    const painted = new Map<string, { x: number; y: number }>();
    (window as any).__painted = painted;
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (/^(Floor plan editor canvas|Área de edição da planta baixa)$/.test(this.canvas.getAttribute('aria-label') ?? '')) {
        const p = new DOMPoint(x, y).matrixTransform(this.getTransform()), b = this.canvas.getBoundingClientRect();
        painted.set(String(text), { x: b.x + p.x * b.width / this.canvas.width, y: b.y + p.y * b.height / this.canvas.height });
      }
      if (maxWidth === undefined) return fill.call(this, text, x, y);
      return fill.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto('/editor');
  const canvas = page.getByLabel(/^(?:Floor plan editor canvas|Área de edição da planta baixa)$/, { exact: true });
  await expect(canvas).toHaveAccessibleName('Área de edição da planta baixa');
  const painted = (text: string) => page.evaluate(text => (window as any).__painted.get(text) as { x: number; y: number } | undefined, text);
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const drawWall = page.getByRole('button', { name: /^Desenhar parede W/ });

  await drawWall.click();
  await canvas.click({ position: { x: 100, y: 250 } });
  const wallHint = page.getByText('Clique para adicionar um segmento de parede · Clique duas vezes para concluir · C para fechar o contorno · Esc para cancelar', { exact: true });
  await expect(wallHint).toBeVisible();
  await canvas.click({ position: { x: 700, y: 250 } });
  await page.keyboard.press('Escape');
  await expect(wallHint).toHaveCount(0);

  await page.getByRole('button', { name: 'Ajustar à tela', exact: true }).click();
  const bounds = (await canvas.boundingBox())!;
  await page.getByRole('button', { name: 'Simples 90cm de abrir', exact: true }).click();
  await canvas.hover({ position: { x: bounds.width * .35, y: bounds.height / 2 } });
  await expect.poll(async () => !!await painted('Clique para posicionar a porta')).toBe(true);
  // The door label sits 24 px plus half the wall's screen thickness above the wall's centreline.
  const wallY = (await painted('Clique para posicionar a porta'))!.y - bounds.y + 34;
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Fixa 100×100cm', exact: true }).click();
  await canvas.hover({ position: { x: bounds.width * .65, y: bounds.height / 2 } });
  await expect.poll(async () => !!await painted('Clique para posicionar a janela')).toBe(true);
  await page.keyboard.press('Escape');

  // A new wall ending on the first one's centreline snaps onto it. Its start lies about 67° off the
  // wall, clear of the 45° angle snaps that would replace the snapped point.
  await drawWall.click();
  const endX = bounds.width * .55;
  await canvas.click({ position: { x: endX - 91, y: wallY + 220 } });
  for (const offset of [0, 10, -10, 20, -20]) {
    await canvas.hover({ position: { x: endX, y: wallY + offset } });
    await frames();
    if (await painted('Ajustar à parede')) break;
  }
  expect(await painted('Ajustar à parede')).toBeTruthy();
  await page.keyboard.press('Escape');
  await expect(wallHint).toHaveCount(0);

  await page.getByRole('button', { name: 'Objetos', exact: true }).click();
  await page.getByRole('button', { name: /^Sof[aá](?: Sof[aá])?(?: 200×90cm)?$/ }).first().click();
  await expect(page.getByText('Clique para posicionar · Role ou pressione R para girar (0°) · Esc para cancelar', { exact: true })).toBeVisible();
  await canvas.press('r');
  const furnitureHint = page.getByText('Clique para posicionar · Role ou pressione R para girar (15°) · Esc para cancelar', { exact: true });
  await expect(furnitureHint).toBeVisible();
  await canvas.press('Escape');
  await expect(furnitureHint).toHaveCount(0);

  await canvas.press('m');
  const measureHint = page.getByText('Clique ou toque em dois pontos para medir · M para sair · Esc para cancelar', { exact: true });
  await expect(measureHint).toBeVisible();
  await canvas.press('Escape');
  await expect(measureHint).toHaveCount(0);

  await canvas.press('t');
  const textHint = page.getByText('Clique para posicionar o rótulo de texto · Esc para cancelar', { exact: true });
  await expect(textHint).toBeVisible();
  await canvas.press('Escape');
  await expect(textHint).toHaveCount(0);

  await canvas.press('n');
  await expect(page.getByText('Clique no primeiro ponto · N para sair · Esc para cancelar', { exact: true })).toBeVisible();
  const area = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: area.width * .5, y: area.height * .25 } });
  const secondPoint = page.getByText('Clique no segundo ponto para criar a anotação · N para sair · Esc para cancelar', { exact: true });
  await expect(secondPoint).toBeVisible();
  await canvas.press('Escape');
  await expect(secondPoint).toHaveCount(0);

  const english = await page.evaluate(() => [...((window as any).__painted as Map<string, unknown>).keys()]
    .filter(text => /^(Click to place (door|window)|Snap to wall)$/.test(text)));
  expect(english).toEqual([]);
});
