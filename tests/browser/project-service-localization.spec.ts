import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { failProjectWrites, savedProjects, storedRecords } from './storage';

const fixture = resolve('tests/fixtures/native-import.openplan.json');
async function importJSON(page: Page) {
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  await (await chooser).setFiles(fixture);
}

for (const width of [1440, 390]) {
  test(`Portuguese opening errors preserve pending work through language changes and recovery at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const source = JSON.parse(await readFile(fixture, 'utf8'));
    await page.addInitScript(source => {
      localStorage.setItem('o3d_locale', 'pt');
      localStorage.setItem('hasSeenWelcome', 'true');
      localStorage.setItem('floorplan_projects', JSON.stringify({ [source.id]: JSON.stringify(source) }));
      // Keep the edit pending while using menus, as in project-opening.spec.ts.
      const timeout = window.setTimeout.bind(window);
      window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: any[]) =>
        timeout(handler, delay === 1000 ? 60_000 : delay, ...args)) as typeof window.setTimeout;
    }, source);
    await page.goto(`/editor?id=${source.id}`);
    await expect(page.getByRole('application')).toContainText('1 ambiente');
    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    const baselineDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
    const baseline = JSON.parse(await readFile((await (await baselineDownload).path())!, 'utf8'));
    const original = await storedRecords(page);
    const originalURL = page.url();
    await failProjectWrites(page);
    await page.getByTitle('Clique para renomear', { exact: true }).click();
    const name = page.getByRole('textbox', { name: 'Nome do projeto', exact: true });
    await name.fill('Planta {count} preservada');
    await name.press('Enter');
    await importJSON(page);
    const opening = page.getByRole('alert').filter({ has: page.getByRole('button', { name: 'Fechar erro de importação', exact: true }) });
    await expect(opening).toContainText('Não foi possível salvar sua planta atual.');
    await expect(opening).toContainText('O armazenamento do navegador está cheio.');
    await expect(opening).toContainText('Nenhum projeto foi importado.');
    await expect(opening).not.toContainText('Browser storage');
    expect(page.url()).toBe(originalURL);
    expect(await storedRecords(page)).toEqual(original);

    await page.getByRole('button', { name: 'Configurações', exact: true }).click();
    await page.getByRole('button', { name: 'Aparência', exact: true }).click();
    await page.getByRole('combobox', { name: 'Idioma', exact: true }).selectOption('en');
    // The native settings dialog makes background alerts inert, but their text
    // must still react to language changes without remounting the error.
    const englishOpening = page.locator('[role="alert"]').filter({ has: page.locator('button[aria-label="Dismiss import error"]') });
    await expect(englishOpening).toContainText('Your current plan could not be saved. Browser storage is full.');
    await expect(englishOpening).toContainText('No project was imported.');
    await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('pt');
    await page.getByRole('button', { name: 'Fechar configurações', exact: true }).click();
    await expect(opening).toContainText('Não foi possível salvar sua planta atual.');
    await page.getByRole('button', { name: 'Fechar erro de importação', exact: true }).click();

    await page.getByRole('button', { name: 'Exportar', exact: true }).click();
    await page.getByRole('button', { name: 'Novo projeto', exact: true }).click();
    await expect(opening).toContainText('Não foi possível salvar sua planta atual.');
    expect(page.url()).toBe(originalURL);
    expect(await storedRecords(page)).toEqual(original);
    await page.getByRole('button', { name: 'Fechar erro de importação', exact: true }).click();
    const saveAlert = page.getByRole('alert');
    await expect(saveAlert).toContainText('O armazenamento do navegador está cheio.');
    const pending = page.waitForEvent('download');
    await saveAlert.getByRole('button', { name: 'Baixar backup JSON', exact: true }).click();
    const backup = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
    expect(backup.id).toBe(source.id);
    expect(backup.name).toBe('Planta {count} preservada');
    expect(backup.floors).toEqual(baseline.floors);
    await page.evaluate(() => { (window as any).failProjectWrites = false; });
    await saveAlert.getByRole('button', { name: 'Tentar salvar novamente', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect((await savedProjects(page))[source.id].name).toBe(backup.name);
    await importJSON(page);
    await expect(page.getByTitle('Clique para renomear', { exact: true })).toHaveText(`${source.name} (Imported copy)`);
    expect((await savedProjects(page))[source.id].name).toBe(backup.name);
  });
}
