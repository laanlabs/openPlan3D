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
check completed with zero errors and zero warnings, log
`/tmp/web-local-glb-resources-check.log`, using NODE_ENV=production. It started
before the scene module was added; the new combined check below covers current source.

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
`/tmp/web-local-glb-resources-and-photos-tests.log`. The item-details rerun
with a 30-second CLI allowance terminated with 18 passes and one timeout in a
quota case carrying its own explicit 15-second limit. Log:
`/tmp/web-local-glb-photo-refactor-tests.log`, session `92179` exit 1. The two
previously timed-out storage/history cases passed this time. No value assertion
failed, but a single all-green item-details run has not been established.
The earlier type check completed cleanly; see the current combined check below.

## Scene traversal and instance budgets

`validateLocalGLBScene` bounds nodes (512), depth (64), mesh tables, per-scene
primitive instances (1024) and rendered vertex references (2 million). It
rejects cycles, multiple parents, duplicate/overlapping roots, bad references,
non-finite/malformed transforms, mixed matrix/TRS representations and an empty
active scene. Budgets count each mesh instance, not just each unique mesh.
It does not validate accessor byte ranges, mesh attribute semantics or geometry
values, and remains disconnected from the renderer until those checks exist.

Seventeen GLB tests pass across container, resources and scene modules, including
nested scenes, instancing limits, cycles, transform/reference errors and empty
scenes. Log: `/tmp/web-local-glb-scene-tests.log`, session `68708` exit 0.
The earlier check started before this scene module existed; see the latest
combined source-check status below.

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

## Accessor storage validation

`validateLocalGLBAccessors` checks component types, element shapes, alignment,
strided byte ranges, matrix column padding (allowing omitted trailing padding),
sparse replacement ranges and strictly increasing in-range sparse indices. It
rejects non-finite float data before decoding, without allocating geometry arrays.
A 64 MiB aggregate decoded-accessor budget includes zero-initialized accessors
and interleaved stride sizes. This is an accessor allocation budget, not a bound
on total renderer memory. Mesh semantics, bounds, extensions, materials, renderer
compatibility and resource disposal still require implementation before import UI.

Reference: [Khronos accessor storage and alignment](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#accessors).

Verification: all 23 tests in four GLB unit files passed, session `35442` exit 0,
log `/tmp/web-local-glb-accessors-tests.log`. Source check `88958` terminated
with one TypeScript narrowing error in the nested float scanner. Capturing the
validated component size in a separate numeric constant fixes that error without
changing runtime behavior. Log: `/tmp/web-local-glb-accessors-check.log`. The
fresh combined check is recorded below.

## Mesh geometry validation

`validateLocalGLBGeometry` composes the resource/accessor and scene checks, then
checks attribute references/counts and core attribute formats, vertex alignment,
index types and actual index values (including forbidden primitive-restart values),
draw modes/counts, and morph target count/weight consistency. Position bounds come
from actual bytes, including sparse overrides and zero-initialized values. Raw
component iteration uses one reusable vector rather than allocating full decoded
arrays. Bounds and maximum indices are cached by accessor to avoid rescanning
shared mesh data. Coordinates outside ±1,000,000 meters are rejected.

This is still not a renderer-ready import. Declared accessor bounds, extensions,
materials/textures, skin/animation behavior and final transformed bounds need a
combined import policy. Inspection of the installed GLTFLoader also found loader
compatibility work: it allocates full interleaved strides (even when glTF permits
omitted final padding) and sparse accessors over interleaved data need repacking.
The loader integration must handle those layouts faithfully rather than silently
misreading them. No model import UI is exposed.

The five-file GLB run passed all 29 tests, session `48974` exit 0, log
`/tmp/web-local-glb-geometry-tests.log`. See the latest combined source-check
status below; the preceding check did not cover all these additions.

## Dense geometry preparation for GLTFLoader

`repackLocalGLBGeometry` validates geometry and writes dense accessor storage,
resolving sparse replacements and interleaving before GLTFLoader sees the data.
It preserves the source document/bytes, retains original embedded buffer data
for image views, and replaces stale min/max metadata with bounds calculated from
actual values. Padded integer matrices become dense float matrices, including
normalization where needed. Repacked geometry is capped at 64 MiB and derived
JSON at 4 MiB; those limits do not claim a 64 MiB total process-memory ceiling.
The prepared buffer is an internal loading artifact, not a change to the 16 MiB
user input limit. Original bytes remain the intended persistence/provenance source.

This function alone does not authorize loading a model: material/extension,
texture decode and transformed-scene checks remain necessary. All 32 tests in
the six-file run `90962` passed (exit 0), log `/tmp/web-local-glb-repack-tests.log`,
including a real GLTFLoader parse of sparse interleaved geometry with omitted
trailing padding, bounds derived from bytes, and source preservation.
See the latest combined source-check status below.

## Core material and texture-reference checks

`validateLocalGLBMaterials` bounds materials (256), textures (64) and samplers
(64), validates image/sampler/texture/material references, checks core sampler
modes and material factor ranges, and requires the texture coordinate set used
by each material on its primitives. The current renderer supports coordinate
sets 0–3. Resource validation runs first, so malformed embedded images and
external image URIs are rejected before material processing. Geometry/accessor
validation remains responsible for the UV accessor formats and actual counts.

This layer validates core metallic/roughness materials, not extensions or actual
image decoding. It must be combined with the pending import policy and decoded
texture checks before models are rendered. Reference:
[Khronos materials specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#materials).

All 38 tests in seven GLB test files passed, session `23784` exit 0, log
`/tmp/web-local-glb-materials-tests.log`. Fresh source check `64070` is active,
log `/tmp/web-local-glb-materials-check.log`, using NODE_ENV=production. It
includes all geometry/repacking/material modules and the narrowing correction.
Do not claim a clean combined type check until it terminates.
