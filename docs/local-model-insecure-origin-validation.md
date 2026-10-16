# Local models on insecure origins — 2026-10-16

A project with a locally imported (IKEA) GLB rendered as its procedural fallback
box on Android Chrome when the editor was loaded over plain HTTP
(`http://192.168.x.x:5173`). The same project rendered correctly on a secure
origin (localhost or HTTPS).

## Root cause

The custom-model pipeline verifies the stored GLB with Web Crypto, which exists
only in a **secure context**:

- `src/lib/services/customModelSource.ts` (render) and
  `src/lib/services/customModelImport.ts` (add) required `crypto.subtle` and threw
  `'This browser cannot verify local model files.'` when it was missing.
- `src/lib/services/itemPhotos.ts` hashed photos with `crypto.subtle` unguarded.
- `crypto.randomUUID()` (also secure-context-only) was called unguarded in
  `customModels.ts`, `projectPackageBridge.ts`, `projectPackage.ts` and
  `localDatabase.ts`.

On an insecure origin `crypto.subtle` is `undefined`, so `readCustomModelSource`
rejected and `createProjectFurniture` kept the fallback box
(`src/lib/utils/furnitureModelLoader.ts`), logging
`[FurnitureLoader] Custom model unavailable: …`. Project import itself does not
hash, which is why the project loaded but the model did not.

This is origin-based, not mobile-specific: it also fails on desktop over plain
HTTP, while localhost and HTTPS are unaffected.

## Change

- `src/lib/utils/sha256.ts`: `sha256Hex(bytes)` uses `crypto.subtle.digest` when
  available and otherwise a self-contained pure-JS SHA-256 (no dependency). The
  three hash sites now call it; the hard "cannot verify" failure is gone.
- `src/lib/utils/randomId.ts`: `randomId()` returns `crypto.randomUUID()` when
  available, else a v4 UUID built from `crypto.getRandomValues`, else a
  `Math.random` fallback. The unguarded `crypto.randomUUID()` call sites use it.

Integrity is preserved: the fallback produces the same digest, so corrupt or
mismatched attachments are still rejected on insecure origins.

## Verification

- `tests/sha256.test.ts`: the pure-JS digest matches Node's `crypto` for empty,
  text, 1000-byte and 4096-byte inputs; the Web Crypto, no-subtle and no-crypto
  paths all match; a subarray view hashes only its own bytes.
- `tests/randomId.test.ts`: UUID v4 shape and uniqueness via `randomUUID`, via
  `getRandomValues` only, and with no crypto API at all.
- `tests/custom-model-source.test.ts`: the digest verifies and corruption is
  still rejected when `crypto` has no `subtle`.
- `tests/custom-model-import.test.ts`: a model imports and re-verifies with no
  `crypto.subtle`.
- `npm test` 1198 passed (129 files); `npm run check` 0 errors/0 warnings;
  `npm run build` passed.

## Limits

A browser regression cannot cover this: the Playwright server runs on
`127.0.0.1`, a secure context, and an insecure hostname cannot be aliased
portably. Coverage is at the unit level; a physical-device check over the LAN IP
remains the interactive confirmation. The pure-JS digest is slower than Web
Crypto for large files, but only runs on insecure origins.
