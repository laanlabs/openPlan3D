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
Log: `/tmp/web-local-glb-container-tests.log`. Initial type check `72521`
terminated with one narrowing error in the parser (and a Vite configuration
fallback). Changed its throwing helper to a function declaration so TypeScript
recognizes the non-returning control-flow path. The clean-environment combined
check is active as session `21661`, log
`/tmp/web-local-glb-resources-check.log`, using NODE_ENV=production.

## Embedded resource layer

`validateLocalGLBResources` bounds buffer/image tables, requires a single
embedded buffer, rejects buffer/image URIs (including data/blob/relative URLs),
checks declared bytes and up to three zero padding bytes, and checks every
buffer-view range and stride. Compressed buffer-view extensions are rejected
until a bounded decoder path exists. Images must reference embedded views and
have matching JPG/PNG headers, at most 4096 pixels per side and 32 Mi pixels
summed across the image table. This inspects headers only: actual decoding and
checking decoded dimensions are still required before rendering.

Moved the unchanged JPG/PNG header reader to `rasterHeader.ts`; itemPhotos imports
and re-exports it, retaining its public API. Twelve GLB container/resource tests
pass. The combined item-details run had 29 passes and two five-second timeouts
in storage/history cases, with no failed value assertions. Its log is
`/tmp/web-local-glb-resources-and-photos-tests.log`. The item-details suite rerun
with a 30-second per-test CLI allowance is active in session `92179`, log
`/tmp/web-local-glb-photo-refactor-tests.log`. Do not claim photo regression or
combined type-check completion until those sessions finish.

## Remaining implementation

- Validate accessor bounds and extension handling before load; buffer/image
  resource checks above are implemented but are not full glTF validation.
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
