import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { browserBaseline } from '../browser-baseline.mjs';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [svelte({ configFile: false })],
  resolve: { alias: {
    '$lib': fileURLToPath(new URL('../../src/lib', import.meta.url)),
    '$app/env': fileURLToPath(new URL('./environment.ts', import.meta.url))
  } },
  build: { target: browserBaseline, outDir: process.env.RENDER_LAB_OUTPUT || '/tmp/openplan3d-render-site', emptyOutDir: true }
});
