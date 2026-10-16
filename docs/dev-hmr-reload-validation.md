# Dev-server HMR reload discarded imports — 2026-10-16

Choosing a file for **Import project** or **Restore library backup** on a phone
via the local dev server (`npm run dev -- --host`) picked the file, started the
import, then a few seconds later the page reloaded and the import was gone. The
same flow worked with Chrome's "Request desktop site" and in production.

## Root cause

Not an app bug. Vite's HMR client reloads the whole document once its websocket
reconnects after a drop (`vitejs/vite#5675`, `#18489`): opening the OS file
picker backgrounds the tab, the socket closes, and on return the client probes
the server with a `vite-ping` websocket and then calls `location.reload()`
(`node_modules/vite/dist/client/client.mjs:863-871`). The reload lands while the
import is still reading/parsing the file. Production ships no HMR client, so it
is unaffected.

Reproduced by dropping the HMR socket while the dev server stayed up: the page
reloaded (document load counter `1 → 2`).

## Change

`src/hooks.server.ts` adds a `handle` hook that, **only in dev and only when the
request host is not localhost**, injects a small script before `@vite/client`. It
replaces `WebSocket` so the `vite-ping` reconnect probe fails (and disables
`SharedWorker` so the probe takes the page path), which stops the reload while
the normal `vite-hmr` connection keeps working. Localhost is untouched (a server
restart there should still reload) and production never receives the script. Set
`O3D_HMR_ON_NETWORK=true` to opt out.

`server.ws: false` and `server.hmr: false` were rejected: the former spams
"failed to connect to websocket" errors on every load, the latter still opens the
socket (vitejs/vite#10840) and still reloads.

## Verification

- Playwright reproduction that captures the HMR socket and closes it:
  - before the change (network host): `RELOADED: true` (loads `1 → 2`).
  - after the change (network host): `RELOADED: false`, HMR socket still
    connected, no page errors.
- The probe is injected only for non-localhost hosts (present via the LAN IP,
  absent via `127.0.0.1`); on localhost the disconnect still reloads, as before.
- The production `build/` contains no probe (`dev` is false).
- `npm test` 1187 passed (127 files); `npm run check` 0 errors/0 warnings;
  `npm run build` passed.

## Limits

This is a development-server convenience. A genuine mobile tab discard under
memory pressure (the OS reloading the tab while the picker is open) is a
different, browser-driven case and is not addressed here; test the production
build for the accurate production behavior. The browser regression suite runs
against the production build and therefore cannot cover this dev-only path.
