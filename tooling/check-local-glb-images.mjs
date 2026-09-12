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
      const canvas = document.createElement('canvas');
      canvas.width = dimensions[0]; canvas.height = dimensions[1];
      canvas.getContext('2d').drawImage(decoded.images[0], 0, 0);
      decoded.dispose(); decoded.dispose();
      const closedWidth = decoded.images[0].width;
      // Keep the valid PNG header but remove its image payload.
      const corrupt = { binary: binary.slice(0, 24), document: { ...container.document,
        buffers: [{ byteLength: 24 }], bufferViews: [{ buffer: 0, byteLength: 24 }] } };
      let error = '';
      try { await globalThis.localGLBImageQA.decodeLocalGLBImages(corrupt); } catch (failure) { error = failure.message; }
      const jpegBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!jpegBlob || jpegBlob.type !== 'image/jpeg') throw new Error('Browser did not encode JPEG fixture.');
      const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());
      function jpegContainer(bytes) {
        return { binary: bytes, document: { buffers: [{ byteLength: bytes.length }],
          bufferViews: [{ buffer: 0, byteLength: bytes.length }], images: [{ bufferView: 0, mimeType: 'image/jpeg' }] } };
      }
      async function jpegDimensions(bytes) {
        const result = await globalThis.localGLBImageQA.decodeLocalGLBImages(jpegContainer(bytes));
        const dimensions = [result.images[0].width, result.images[0].height];
        result.dispose();
        if (result.images[0].width !== 0) throw new Error('JPEG bitmap was not closed.');
        return dimensions;
      }
      const jpegSize = await jpegDimensions(jpeg);
      // Insert a minimal little-endian EXIF APP1 segment with orientation 6.
      const exif = new Uint8Array(36), exifView = new DataView(exif.buffer);
      exif.set([0xff, 0xe1, 0, 34, 69, 120, 105, 102, 0, 0]);
      exifView.setUint16(10, 0x4949); exifView.setUint16(12, 42, true);
      exifView.setUint32(14, 8, true); exifView.setUint16(18, 1, true);
      exifView.setUint16(20, 0x112, true); exifView.setUint16(22, 3, true);
      exifView.setUint32(24, 1, true); exifView.setUint16(28, 6, true);
      const oriented = new Uint8Array(jpeg.length + exif.length);
      oriented.set(jpeg.subarray(0, 2)); oriented.set(exif, 2); oriented.set(jpeg.subarray(2), 2 + exif.length);
      const orientedSize = await jpegDimensions(oriented);
      // Truncate after SOF: valid dimensions, no scan payload to decode.
      let end = 0;
      for (let offset = 2; offset + 4 < jpeg.length;) {
        if (jpeg[offset] !== 0xff) throw new Error('Unexpected JPEG marker sequence.');
        const marker = jpeg[offset + 1], length = jpeg[offset + 2] * 256 + jpeg[offset + 3];
        if ([0xc0, 0xc1, 0xc2].includes(marker)) { end = offset + 2 + length; break; }
        offset += 2 + length;
      }
      if (!end) throw new Error('JPEG fixture has no supported SOF header.');
      let jpegError = '';
      try { await globalThis.localGLBImageQA.decodeLocalGLBImages(jpegContainer(jpeg.slice(0, end))); }
      catch (failure) { jpegError = failure.message; }
      return { dimensions, closedWidth, error, jpegSize, orientedSize, jpegError };
    }, bytes);
    const header = new DataView(Uint8Array.from(bytes).buffer);
    assert.deepEqual(result.dimensions, [header.getUint32(16), header.getUint32(20)]);
    assert.equal(result.closedWidth, 0);
    assert.match(result.error, /could not be decoded/);
    assert.deepEqual(result.jpegSize, result.dimensions);
    assert.deepEqual(result.orientedSize, [...result.dimensions].reverse());
    assert.match(result.jpegError, /could not be decoded/);
    assert.deepEqual(requests, []);
    console.log(JSON.stringify({ browser: name, ...result, networkRequests: requests.length }));
  } finally {
    await browser.close();
  }
}
