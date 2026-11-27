import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/** Emit catalog files through Vite so adapter-node's immutable asset caching applies.
 * @returns {import('vite').Plugin}
 */
export function catalogAssets() {
  const virtualId = 'virtual:catalog-assets';
  let root = '', building = false;
  return {
    name: 'catalog-assets',
    configResolved(config) {
      root = config.root;
      building = config.command === 'build';
    },
    resolveId(id) { if (id === virtualId) return '\0' + virtualId; },
    // Vite 8's own asset plugin also answers resolveFileUrl and runs first by default; it would give the
    // client build URLs relative to the importing chunk. 'pre' keeps the root-relative public path.
    resolveFileUrl: {
      order: 'pre',
      handler({ moduleId, fileName }) {
        if (moduleId === '\0' + virtualId) return JSON.stringify('/' + fileName);
      },
    },
    load(id) {
      if (id !== '\0' + virtualId) return;
      const entries = [];
      for (const directory of ['models', 'textures']) {
        for (const file of readdirSync(resolve(root, 'static', directory)).sort()) {
          if (!/\.(glb|jpe?g|png|webp)$/.test(file)) continue;
          const path = resolve(root, 'static', directory, file);
          this.addWatchFile(path);
          const key = `/${directory}/${file}`;
          const url = building
            ? `import.meta.ROLLUP_FILE_URL_${this.emitFile({ type: 'asset', name: file, source: readFileSync(path) })}`
            : JSON.stringify(key);
          entries.push(`${JSON.stringify(key)}: ${url}`);
        }
      }
      return `export default {${entries.join(',\n')}};`;
    },
  };
}
