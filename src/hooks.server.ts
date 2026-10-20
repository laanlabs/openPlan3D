import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

/**
 * When the dev server is opened from another device (e.g. a phone via `--host`),
 * Vite's HMR client reloads the whole page once its websocket reconnects after a
 * drop (vitejs/vite#5675). Opening the OS file picker backgrounds the tab, drops
 * the socket, and that reload then discards an in-progress import or library
 * restore. The reload is gated by a `vite-ping` websocket probe; make that probe
 * fail so the page stays put while normal HMR keeps working. Localhost is left
 * untouched (there a server restart should still reload), and production never
 * receives this script. Set O3D_HMR_ON_NETWORK=true to opt out.
 */
const NO_RELOAD_PROBE = `(() => {
  const Native = window.WebSocket;
  function Patched(url, protocols) {
    const list = Array.isArray(protocols) ? protocols : (protocols ? [protocols] : []);
    if (list.includes('vite-ping')) {
      const socket = new EventTarget();
      socket.close = () => {};
      setTimeout(() => socket.dispatchEvent(new Event('error')), 0);
      return socket;
    }
    return new Native(url, protocols);
  }
  Patched.prototype = Native.prototype;
  Patched.CONNECTING = Native.CONNECTING;
  Patched.OPEN = Native.OPEN;
  Patched.CLOSING = Native.CLOSING;
  Patched.CLOSED = Native.CLOSED;
  window.WebSocket = Patched;
  // Force Vite's reconnect probe onto the page path so the override applies.
  try { window.SharedWorker = undefined; } catch {}
})();`;

const isLocalHost = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '';

export const handle: Handle = async ({ event, resolve }) => {
  if (!dev || isLocalHost(event.url.hostname) || process.env.O3D_HMR_ON_NETWORK === 'true') {
    return resolve(event);
  }
  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('<head>', `<head><script>${NO_RELOAD_PROBE}</script>`),
  });
};
