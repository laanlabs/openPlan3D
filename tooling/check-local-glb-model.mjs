import { build } from 'esbuild';
import { chromium, firefox, webkit } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const bundle = await build({ stdin: { contents: `
  export { loadLocalGLBModel } from './src/lib/services/customModelLoader.ts';
  export { Scene, Color, WebGLRenderer, PerspectiveCamera, AmbientLight, DirectionalLight, Texture } from 'three';
  export { getDFGLUT } from 'three/src/renderers/shaders/DFGLUTData.js';
`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false,
  format: 'iife', globalName: 'modelQA', platform: 'browser' });
const bytes = [...await readFile('tests/fixtures/local-model-textured-box.glb')];
const engines = { chromium, firefox, webkit };
const selected = process.argv.slice(2);
for (const name of selected.length ? selected : Object.keys(engines)) {
  assert.ok(engines[name], `Unknown browser ${name}`);
  console.log(`Checking complete textured model rendering in ${name}`);
  const browser = await engines[name].launch({ headless: true, timeout: 120_000,
    ...(name === 'chromium' ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 300, height: 300 } });
    const requests = [], errors = [];
    await page.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const rendered = await page.evaluate(async input => {
      const { loadLocalGLBModel, Scene, Color, WebGLRenderer, PerspectiveCamera, AmbientLight, DirectionalLight, Texture } = globalThis.modelQA;
      const tracked = new Set(), originalListener = Texture.prototype.addEventListener;
      Texture.prototype.addEventListener = function (type, listener) {
        if (type === 'dispose') tracked.add(this);
        return originalListener.call(this, type, listener);
      };
      const owner = await loadLocalGLBModel(new Uint8Array(input));
      const scene = new Scene(); scene.background = new Color('#e6e8eb');
      scene.add(new AmbientLight(0xffffff, 2));
      const light = new DirectionalLight(0xffffff, 3); light.position.set(2, 3, 4); scene.add(light);
      const camera = new PerspectiveCamera(40, 1, 0.01, 100);
      camera.position.set(1.8, 1.3, 2); camera.lookAt(0, 0.25, 0);
      const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(256, 256); document.body.append(renderer.domElement);
      renderer.render(scene, camera);
      const baseline = { ...renderer.info.memory };
      scene.add(owner.scene); renderer.render(scene, camera);
      const gl = renderer.getContext(), pixels = new Uint8Array(256 * 256 * 4);
      gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let foregroundPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (Math.abs(pixels[i] - pixels[0]) + Math.abs(pixels[i + 1] - pixels[1]) + Math.abs(pixels[i + 2] - pixels[2]) > 12) foregroundPixels++;
      }
      globalThis.loadedModelQA = { owner, renderer, scene, camera, tracked, originalListener, bytes: new Uint8Array(input) };
      return { dimensions: owner.dimensions, foregroundPixels, glError: gl.getError(), baseline, memory: { ...renderer.info.memory } };
    }, bytes);
    assert.deepEqual(rendered.dimensions, { width: 1, depth: 0.75, height: 0.5 });
    assert.ok(rendered.foregroundPixels > 500 && rendered.foregroundPixels < 60_000, 'Expected visible model pixels');
    assert.equal(rendered.glError, 0);
    assert.ok(rendered.memory.textures >= 1 && rendered.memory.geometries >= 1);
    await page.screenshot({ path: `/tmp/openplan-custom-model-${name}.png` });
    const released = await page.evaluate(async () => {
      const { owner, renderer, scene, camera, tracked, originalListener, bytes } = globalThis.loadedModelQA;
      function release(model) {
        const map = model.scene.children[0].material.map, bitmap = map.image;
        scene.remove(model.scene); model.dispose(); model.dispose(); renderer.render(scene, camera);
        const remaining = [...tracked].filter(texture => renderer.properties.get(texture).__webglInit).map(texture => ({
          type: texture.constructor.name, width: texture.image?.width, height: texture.image?.height,
          rendererLightingLUT: texture === globalThis.modelQA.getDFGLUT(), modelMap: texture === map,
        }));
        return { memory: { ...renderer.info.memory }, bitmapWidth: bitmap.width, remaining };
      }
      const result = [release(owner)];
      for (let index = 0; index < 2; index++) {
        const model = await globalThis.modelQA.loadLocalGLBModel(bytes);
        scene.add(model.scene); renderer.render(scene, camera); result.push(release(model));
      }
      globalThis.modelQA.Texture.prototype.addEventListener = originalListener;
      renderer.dispose(); delete globalThis.loadedModelQA;
      return result;
    });
    console.log(JSON.stringify({ browser: name, rendered, released, networkRequests: requests.length, errors }));
    for (const cycle of released) {
      assert.equal(cycle.memory.geometries, 0); assert.equal(cycle.bitmapWidth, 0);
      // Three.js retains its shared DFG lookup texture after the first PBR draw.
      // Verify object identity, not just a permissive nonzero texture allowance.
      assert.equal(cycle.memory.textures, 1);
      assert.deepEqual(cycle.remaining, [{ type: 'DataTexture', width: 16, height: 16, rendererLightingLUT: true, modelMap: false }]);
    }
    assert.deepEqual(requests, []); assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}
