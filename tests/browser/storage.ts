import type { Page } from '@playwright/test';

export async function storedRecords(page: Page, store = 'projects'): Promise<Record<string, string>> {
  return page.evaluate(store => new Promise((resolve, reject) => {
    const open = indexedDB.open('openplan3d-local', 1);
    let failed = false;
    const fail = (error: unknown) => { failed = true; reject(error); };
    // Observation must never create an empty database ahead of app hydration.
    open.onupgradeneeded = () => {
      open.transaction?.abort();
      open.result.close();
      fail(new Error('The application has not initialized browser storage yet.'));
    };
    open.onerror = () => fail(open.error);
    open.onblocked = () => fail(new Error('The browser storage read was blocked.'));
    open.onsuccess = () => {
      const db = open.result;
      if (failed) { db.close(); return; }
      db.onversionchange = () => db.close();
      try {
        const tx = db.transaction(store, 'readonly'), records = tx.objectStore(store);
        const keys = records.getAllKeys(), values = records.getAll();
        tx.oncomplete = () => { db.close(); resolve(Object.fromEntries(keys.result.map((key, i) => [String(key), values.result[i]]))); };
        tx.onabort = () => { db.close(); fail(tx.error); };
      } catch (error) { db.close(); fail(error); }
    };
  }), store);
}

export async function savedProjects(page: Page) {
  return Object.fromEntries(Object.entries(await storedRecords(page)).map(([id, raw]) => [id, JSON.parse(raw)]));
}

/** Inject failure at the actual persistence boundary, without changing app code. */
export async function failProjectWrites(page: Page, flag = 'failProjectWrites') {
  await page.evaluate(flag => {
    (window as any)[flag] = true;
    for (const name of ['put', 'add'] as const) {
      const original = IDBObjectStore.prototype[name];
      IDBObjectStore.prototype[name] = function(...args) {
        if (this.name === 'projects' && (window as any)[flag]) throw new DOMException('Full', 'QuotaExceededError');
        return original.apply(this, args);
      };
    }
  }, flag);
}
