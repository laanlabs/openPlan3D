import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) for (const language of ['en', 'pt'] as const) {
  test(`${language} ${width}: empty undo history supports keyboard entry and dismissal`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const project = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
    await page.addInitScript(({ project, language }) => {
      localStorage.setItem('o3d_locale', language);
      localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) }));
    }, { project, language });
    await page.goto(`/editor?id=${project.id}`);
    const toggle = page.getByRole('button', { name: language === 'en' ? 'Toggle Undo History' : 'Alternar histórico de ações', exact: true });
    const region = page.getByRole('region', { name: language === 'en' ? 'Undo History' : 'Histórico de Ações', exact: true });
    const close = region.getByRole('button', { name: language === 'en' ? 'Close history' : 'Fechar histórico', exact: true });
    const opener = width < 768 ? page.getByRole('button', { name: /^(More actions|Mais ações)$/ }) : toggle;
    async function open(key: 'Enter' | 'Space') {
      if (width < 768) {
        await opener.focus();
        await opener.press('Enter');
      }
      await toggle.focus();
      await toggle.press(key);
    }
    await open('Enter');
    await expect(close).toBeFocused();
    await expect(region).toContainText(language === 'en' ? 'No history yet' : 'Ainda sem histórico');
    const bounds = await region.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await close.press('Escape');
    await expect(region).toHaveCount(0);
    await expect(opener).toBeFocused();
    if (width >= 768) await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await open('Space');
    await expect(close).toBeFocused();
    await close.press('Enter');
    await expect(region).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
}
