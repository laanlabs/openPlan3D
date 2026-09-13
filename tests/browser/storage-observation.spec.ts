import { expect, test } from '@playwright/test';
import { storedRecords } from './storage';

test('storage observation never initializes a database and closes failed reads', async ({ page }) => {
  // Same-origin document without the application: observation runs before any
  // app code can initialize the schema, reproducing the hydration race.
  await page.route('**/storage-observation-fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Storage observation</title>' }));
  await page.goto('/storage-observation-fixture');
  await expect(storedRecords(page)).rejects.toThrow('has not initialized browser storage');
  const created = await page.evaluate(() => new Promise<boolean>((resolve, reject) => {
    let created = false;
    const open = indexedDB.open('openplan3d-local', 1);
    open.onerror = () => reject(open.error);
    open.onupgradeneeded = () => { created = true; open.result.createObjectStore('projects'); };
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('projects', 'readwrite');
      tx.objectStore('projects').put('original saved bytes', 'project');
      tx.oncomplete = () => { db.close(); resolve(created); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }));
  expect(created).toBe(true);
  expect(await storedRecords(page)).toEqual({ project: 'original saved bytes' });
  await expect(storedRecords(page, 'missing-store')).rejects.toThrow();
  // A failed read must release its connection so future schema upgrades work.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('openplan3d-local', 2);
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(new Error('A storage observer left its connection open.'));
    open.onupgradeneeded = () => open.result.createObjectStore('history');
    open.onsuccess = () => { open.result.close(); resolve(); };
  }));
});
