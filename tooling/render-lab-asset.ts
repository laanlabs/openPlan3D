import { createReadStream, statSync } from 'node:fs';
import type { Plugin } from 'vite';

/** Explicit opt-in, loopback-only development asset. Never emitted into builds. */
export function renderLabAsset(): Plugin {
  return {
    name: 'local-render-lab-asset',
    apply: 'serve',
    configureServer(server) {
      const file = process.env.OPENPLAN3D_RENDER_LAB_ASSET;
      server.middlewares.use('/__render-lab/scene.glb', (req, res, next) => {
        if (!file) return next();
        const address = req.socket.remoteAddress;
        if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address ?? '')) {
          res.statusCode = 403; res.end(); return;
        }
        if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return; }
        try {
          const size = statSync(file).size;
          if (size > 128 * 1024 * 1024) throw new Error('Asset too large');
          res.setHeader('Content-Type', 'model/gltf-binary');
          res.setHeader('Content-Length', size);
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
          if (req.method === 'HEAD') res.end();
          else createReadStream(file).on('error', () => res.destroy()).pipe(res);
        } catch { res.statusCode = 404; res.end(); }
      });
    }
  };
}
