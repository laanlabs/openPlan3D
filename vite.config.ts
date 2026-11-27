import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { renderLabAsset } from './tooling/render-lab-asset.ts';
import { catalogAssets } from './tooling/catalog-assets.mjs';

export default defineConfig({
	// Vite 7's browser baseline, kept through the move to Vite 8. Vite 8's default (Safari 16.4, Chrome 111,
	// Firefox 114) would leave the responsive CSS as media range queries, which Safari 16.0 to 16.3 ignores.
	build: { target: ['chrome107', 'edge107', 'firefox104', 'safari16'] },
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
