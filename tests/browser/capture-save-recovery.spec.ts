import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { savedProjects } from './storage';

test('downloaded capture survives initial save failure and retries without reimporting', async ({ page }) => {
  const capture = await readFile('tests/fixtures/handoff-roomplan.json', 'utf8');
  let downloads = 0;
  await page.route('https://firebasestorage.googleapis.com/**', async route => {
    downloads++;
    await route.fulfill({ status: 200, contentType: 'application/json', body: capture });
  });
  await page.addInitScript(() => {
    localStorage.setItem('o3d_locale', 'pt');
    (window as any).failCaptureSave = !localStorage.getItem('captureSaveRecovered');
    for (const method of ['put', 'add'] as const) {
      const original = IDBObjectStore.prototype[method];
      IDBObjectStore.prototype[method] = function(...args) {
        if (this.name === 'projects' && (window as any).failCaptureSave) throw new DOMException('Full', 'QuotaExceededError');
        return original.apply(this, args);
      };
    }
  });
  await page.goto('/editor?import=AB2C');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('As alterações não foram salvas.');
  await expect(page.getByTitle('Clique para renomear', { exact: true })).toHaveText('Room Capture AB2C');
  expect(new URL(page.url()).searchParams.has('import')).toBe(false);
  expect(downloads).toBe(1);
  expect(await savedProjects(page)).toEqual({});
  const pending = page.waitForEvent('download');
  await alert.getByRole('button', { name: 'Baixar backup JSON', exact: true }).click();
  const backup = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(backup.floors.map((floor: any) => [floor.level, floor.name])).toEqual([[0, 'Entry'], [2, 'Loft'], [3, 'Future Floor']]);
  expect(backup.floors.flatMap((floor: any) => floor.walls.map((wall: any) => wall.id)).sort()).toEqual(JSON.parse(capture).walls.map((wall: any) => wall.identifier).sort());
  await page.evaluate(() => { (window as any).failCaptureSave = false; localStorage.setItem('captureSaveRecovered', 'true'); });
  await alert.getByRole('button', { name: 'Tentar salvar novamente', exact: true }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.getByText('Salvo ✓', { exact: true })).toBeVisible();
  const stored = await savedProjects(page);
  expect(Object.keys(stored)).toEqual([backup.id]);
  expect(stored[backup.id].floors).toEqual(backup.floors);
  await page.reload();
  await expect(page.getByTitle('Clique para renomear', { exact: true })).toHaveText(backup.name);
  expect(downloads).toBe(1);
  expect((await savedProjects(page))[backup.id].floors).toEqual(backup.floors);
});
