import { build } from 'esbuild';
import { chromium, firefox, webkit } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Isolated real-decoder check: no app build/server, account or project storage.
const bundle = await build({ entryPoints: ['src/lib/utils/localGLBImages.ts'], bundle: true,
  write: false, format: 'iife', globalName: 'localGLBImageQA', platform: 'browser' });
const bytes = [...await readFile('tests/fixtures/item-photo.png')];
const engines = { chromium, firefox, webkit };
const selected = process.argv.slice(2);
for (const name of selected.length ? selected : Object.keys(engines)) {
  assert.ok(engines[name], `Unknown browser ${name}`);
  console.log(`Checking embedded texture decoding in ${name}`);
  const browser = await engines[name].launch({ headless: true, timeout: 120_000 });
  try {
    const page = await browser.newPage();
    const requests = [];
    await page.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const result = await page.evaluate(async input => {
      const binary = new Uint8Array(input);
      const container = { binary, document: { buffers: [{ byteLength: binary.length }],
        bufferViews: [{ buffer: 0, byteLength: binary.length }], images: [{ bufferView: 0, mimeType: 'image/png' }] } };
      const decoded = await globalThis.localGLBImageQA.decodeLocalGLBImages(container);
      const dimensions = [decoded.images[0].width, decoded.images[0].height];
      decoded.dispose(); decoded.dispose();
      const closedWidth = decoded.images[0].width;
      // Keep the valid PNG header but remove its image payload.
      const corrupt = { binary: binary.slice(0, 24), document: { ...container.document,
        buffers: [{ byteLength: 24 }], bufferViews: [{ buffer: 0, byteLength: 24 }] } };
      let error = '';
      try { await globalThis.localGLBImageQA.decodeLocalGLBImages(corrupt); } catch (failure) { error = failure.message; }
      return { dimensions, closedWidth, error };
    }, bytes);
    const header = new DataView(Uint8Array.from(bytes).buffer);
    assert.deepEqual(result.dimensions, [header.getUint32(16), header.getUint32(20)]);
    assert.equal(result.closedWidth, 0);
    assert.match(result.error, /could not be decoded/);
    assert.deepEqual(requests, []);
    console.log(JSON.stringify({ browser: name, ...result, networkRequests: requests.length }));
  } finally {
    await browser.close();
  }
}
