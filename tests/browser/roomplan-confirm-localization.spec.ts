import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const width of [1440, 390]) test(`RoomPlan confirmation preserves geometry across languages at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  let expected: unknown;
  for (const locale of ['en', 'pt']) {
    await page.evaluate(locale => localStorage.setItem('o3d_locale', locale), locale);
    await page.goto('/editor');
    if (width < 768) await page.getByRole('button', { name: 'Toggle tools panel', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: locale === 'pt' ? /Importar RoomPlan Escaneamento/ : /Import RoomPlan iOS/ }).click();
    await (await chooser).setFiles({ name: 'Original {count}.json', mimeType: 'application/json', buffer: await readFile('tests/fixtures/handoff-roomplan.json') });
    const dialog = page.getByRole('dialog', { name: locale === 'pt' ? 'Importar RoomPlan' : 'Import RoomPlan', exact: true });
    await expect(dialog.getByRole('checkbox', { name: locale === 'pt' ? /Alinhar paredes/ : /Straighten walls/ })).not.toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: locale === 'pt' ? /Aplicar ângulos retos/ : /Enforce orthogonal/ })).not.toBeChecked();
    await expect(dialog.getByRole('spinbutton')).toHaveValue('0');
    await dialog.getByRole('button', { name: locale === 'pt' ? 'Importar' : 'Import', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTitle(locale === 'pt' ? 'Clique para renomear' : 'Click to rename', { exact: true })).toHaveText('Original {count}');
    await page.getByRole('button', { name: locale === 'pt' ? 'Exportar' : 'Export', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: locale === 'pt' ? 'Baixar JSON' : 'Download JSON', exact: true }).click();
    const project = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
    const floor = project.floors[0];
    expect(floor.walls.length).toBeGreaterThan(0);
    expect(floor.walls.some((wall: any) => wall.thickness === 27.5 && wall.height === 273.5)).toBe(true);
    const geometry = {
      walls: floor.walls.map(({ id, ...wall }: any) => wall),
      doors: floor.doors.map(({ id, wallId, ...door }: any) => ({ ...door, wallIndex: floor.walls.findIndex((wall: any) => wall.id === wallId) })),
      windows: floor.windows.map(({ id, wallId, ...window }: any) => ({ ...window, wallIndex: floor.walls.findIndex((wall: any) => wall.id === wallId) })),
    };
    if (locale === 'en') expected = geometry;
    else expect(geometry).toEqual(expected);
  }
});
