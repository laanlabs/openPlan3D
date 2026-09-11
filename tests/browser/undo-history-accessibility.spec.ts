import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) for (const language of ['en', 'pt'] as const) test(`${language} ${width}: named undo history exposes the current step and restores a floor change`, async ({ page }) => {
  // Keep all before/after export assertions on slower production-browser runs.
  test.slow();
  await page.setViewportSize({ width, height: 900 });
  const project = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
  await page.addInitScript(({ project, language }) => {
    localStorage.setItem('o3d_locale', language);
    localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) }));
  }, { project, language });
  await page.goto(`/editor?id=${project.id}`);
  async function exported() {
    await page.getByRole('button', { name: /^(?:Export|Exportar)$/, exact: true }).click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: /^(?:Download JSON|Baixar JSON)$/, exact: true }).click();
    return JSON.parse(await readFile((await (await downloading).path())!, 'utf8'));
  }
  const before = await exported();
  const more = page.getByRole('button', { name: /^(More actions|Mais ações)$/ });
  if (width < 768) {
    await more.click();
    await page.getByRole('button', { name: /^\+ (Add Floor \(empty\)|Adicionar pavimento \(vazio\))$/ }).click();
  } else {
    await page.getByRole('button', { name: /^(?:Add Floor|Adicionar pavimento)$/, exact: true }).click();
    await page.getByRole('button', { name: /^(?:Empty floor|Pavimento vazio)$/, exact: true }).click();
  }
  expect((await exported()).floors).toHaveLength(before.floors.length + 1);
  const toggle = page.getByRole('button', { name: language === 'en' ? 'Toggle Undo History' : 'Alternar histórico de ações', exact: true });
  if (width < 768) await more.click();
  await toggle.click();
  if (width >= 768) await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const history = page.getByRole('region', { name: language === 'en' ? 'Undo History' : 'Histórico de Ações', exact: true });
  await expect(history).toBeVisible();
  const bounds = await history.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
  await expect(history.locator('[aria-current="step"]')).toHaveText(language === 'en' ? /Current state/ : /Estado atual/);
  const action = history.getByRole('button', { name: language === 'en' ? /Added floor/ : /Pavimento adicionado/ });
  await expect(action).toBeVisible();
  for (const dark of [false, true]) {
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
    // Measure the settled theme rather than an intermediate transition color.
    await history.evaluate(async region => {
      await Promise.all(region.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
    });
    const contrast = await history.evaluate(region => {
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
      function rgb(color: string) {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        return Array.from(ctx.getImageData(0, 0, 1, 1).data);
      }
      function luminance(color: number[]) {
        const linear = color.slice(0, 3).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
        return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
      }
      return Array.from(region.querySelectorAll('span, time, button')).filter(el => el.children.length === 0 && el.textContent?.trim()).map(el => {
        let parent: Element | null = el;
        let background = [255, 255, 255, 255];
        while (parent) {
          const candidate = rgb(getComputedStyle(parent).backgroundColor);
          if (candidate[3] === 255) { background = candidate; break; }
          parent = parent.parentElement;
        }
        const foreground = luminance(rgb(getComputedStyle(el).color));
        const back = luminance(background);
        return { text: el.textContent, ratio: (Math.max(foreground, back) + .05) / (Math.min(foreground, back) + .05) };
      });
    });
    expect(contrast.length).toBeGreaterThan(4);
    for (const item of contrast) expect(item.ratio, `${dark ? 'dark' : 'light'}: ${item.text}`).toBeGreaterThanOrEqual(4.5);
  }
  await action.focus();
  await expect(action).toBeFocused();
  await action.press('Enter');
  const close = history.getByRole('button', { name: language === 'en' ? 'Close history' : 'Fechar histórico', exact: true });
  await expect(close).toBeFocused();
  await close.press('Escape');
  await expect(history).toHaveCount(0);
  await expect(width < 768 ? more : toggle).toBeFocused();
  expect((await exported()).floors).toEqual(before.floors);
  if (width >= 768) await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
