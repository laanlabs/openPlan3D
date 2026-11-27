import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { renderLabAsset } from './tooling/render-lab-asset.ts';
import { catalogAssets } from './tooling/catalog-assets.mjs';
import { browserBaseline } from './tooling/browser-baseline.mjs';

export default defineConfig({
	build: { target: browserBaseline },
	plugins: [
    {
      name: 'require-production-build',
      apply: 'build',
      // `svelte-kit sync` resolves this config as a build without building, so check when a build starts.
      buildStart() {
        if (!this.environment.config.isProduction) {
          throw new Error('Production builds require NODE_ENV=production. Use NPM_CONFIG_INCLUDE=dev to install build tools.');
        }
      },
    },
    renderLabAsset(), catalogAssets(), tailwindcss(),
    sveltekit({ adapter: adapter(), alias: { $lib: 'src/lib' } }),
  ]
});
