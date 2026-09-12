import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const mode of ['missing', 'saved', 'read failure'] as const) {
  test(`reserved project IDs use only saved thumbnails: ${mode}`, async ({ page }) => {
    const source = JSON.parse(await readFile('tests/fixtures/native-import.openplan.json', 'utf8'));
    const ids = ['__proto__', 'constructor', 'toString', 'ordinary-project'];
    const preview = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="red"/></svg>');
    const imageRequests: string[] = [];
    page.on('request', request => {
      if (request.resourceType() === 'image' && /^https?:/.test(request.url())) imageRequests.push(request.url());
    });
    await page.addInitScript(({ source, ids, preview, mode }) => {
      localStorage.setItem('hasSeenWelcome', 'true');
      localStorage.setItem('floorplan_projects', JSON.stringify(Object.fromEntries(ids.map(id => [id, JSON.stringify({ ...source, id, name: `Preview ${id}` })]))));
      if (mode !== 'missing') for (const id of ids) localStorage.setItem(`floorplan_thumb_${id}`, preview);
      if (mode === 'read failure') {
        const original = IDBObjectStore.prototype.getAll;
        IDBObjectStore.prototype.getAll = function(...args) {
          if (this.name === 'thumbnails') throw new DOMException('Preview read failed', 'UnknownError');
          return original.apply(this, args);
        };
      }
    }, { source, ids, preview, mode });
    await page.goto('/');
    for (const id of ids) {
      const card = page.getByRole('link', { name: `Open Preview ${id}`, exact: true });
      await expect(card).toBeVisible();
      const img = card.locator('img');
      await expect(img).toHaveCount(mode === 'saved' ? 1 : 0);
      if (mode === 'saved') {
        await expect(img).toHaveAttribute('src', preview);
        await expect.poll(() => img.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      }
    }
    expect(imageRequests).toEqual([]);
  });
}
