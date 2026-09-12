# Local custom-model import — in progress

The NEXT objective includes controlled local GLB import, bounded textures,
provenance and safe failure behavior. This feature is not complete. Current
furniture loading supports only bundled catalog models; project packages already
retain attachment bytes. No custom-model import UI is exposed yet.

## Container foundation

`readLocalGLB` reads glTF 2.0 containers without renderer allocation or network
access. Limits: 16 MiB input, 2 MiB JSON. It checks magic/container version,
exact total length, chunk alignment/bounds/order/uniqueness, JSON validity,
unique keys/nesting, and asset version. It retains a view of binary bytes and
ignores bounded unknown chunks. The existing strict package JSON reader is
reused behind a GLB-specific error. This is not full glTF validation and its
result must not be sent to a renderer until the next validation layer exists.

Reference: [Khronos glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification).

Six unit tests pass: subarray offsets/exact bytes, JSON-only/unknown chunks,
corrupt/truncated headers and size limits, duplicate/reordered/misaligned chunks,
asset version independence, and oversized/duplicate/malformed/deep JSON.
Log: `/tmp/web-local-glb-container-tests.log`. Type checking is pending in
`/tmp/web-local-glb-container-check.log` (session `72521`). This invocation
fell back to svelte.config.js after the Vite config required NODE_ENV=production.
It remains live; poll to terminal, then use the required environment for a clean
configuration check. No type-check pass is claimed yet.

## Remaining implementation

- Validate local-only resource references and accessor/buffer bounds before load.
- Bound decoded images, geometry, scene hierarchy and instantiated complexity.
- Retain original bytes, filename, display name and user-supplied provenance in
  project-owned attachments; enforce a project budget and validation on reopen.
- Parse using isolated resource ownership and blocked external loads, with
  cleanup on error, disposal and asynchronous replacement.
- Preview dimensions/origin and let the user place the model with existing
  furniture transforms; integrate catalog/sidebar labels and plan footprints.
- Preserve geometry/metadata through Undo, save/reopen, JSON and project-package
  returns; keep unsupported native rendering explicit while retaining bytes.
- Translate the UI and qualify malformed imports, usable failures, local-only
  behavior, placement, editing, exports and resource cleanup in all engines.

Do not label the container reader as completed custom-model import support.
