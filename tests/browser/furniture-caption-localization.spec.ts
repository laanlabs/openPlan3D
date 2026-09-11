import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('language changes redraw furniture captions without changing exported geometry', async ({ page }) => {
  test.slow();
  const project = JSON.parse(await readFile('tests/fixtures/furniture-fidelity.openplan.json', 'utf8'));
  await page.addInitScript(project => {
    localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) }));
    localStorage.setItem('o3d_locale', 'en');
    const captions = new Set<string>();
    (window as any).__furnitureCaptions = captions;
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(...args) {
      if (/^(Floor plan editor canvas|Área de edição da planta baixa)$/.test(this.canvas.getAttribute('aria-label') ?? '')) captions.add(String(args[0]));
      return original.apply(this, args);
    };
  }, project);
  await page.goto(`/editor?id=${project.id}`);
  const saw = (name: string) => page.evaluate(name => (window as any).__furnitureCaptions.has(name), name);
  await expect.poll(() => saw('Armchair')).toBe(true);
  async function exported() {
    await page.getByRole('button', { name: /^(Export|Exportar)$/, exact: true }).click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: /^(Download JSON|Baixar JSON)$/, exact: true }).click();
    return JSON.parse(await readFile((await (await downloading).path())!, 'utf8')).floors;
  }
  const before = await exported();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.evaluate(() => (window as any).__furnitureCaptions.clear());
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('pt');
  await expect.poll(() => saw('Poltrona')).toBe(true);
  await page.evaluate(() => (window as any).__furnitureCaptions.clear());
  await page.getByRole('combobox', { name: 'Idioma', exact: true }).selectOption('en');
  await expect.poll(() => saw('Armchair')).toBe(true);
  await page.keyboard.press('Escape');
  expect(await exported()).toEqual(before);
});
