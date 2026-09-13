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
`/tmp/web-local-glb-materials-tests.log`. Source check `64070` passed with zero errors and zero warnings,
log `/tmp/web-local-glb-materials-check.log`, using NODE_ENV=production. It
includes geometry/repacking/material modules and the narrowing correction, but
started before image/extension additions. See the latest combined check below.

## Decoded image ownership and cancellation

`decodeLocalGLBImages` validates embedded resource headers, then decodes one image
at a time using ImageBitmap without fetch or object URLs. It checks actual decoded
dimensions and cumulative pixels; JPEG EXIF transposition is accepted when it
preserves the declared dimensions' pixel count. The caller owns returned bitmaps
and gets an idempotent disposer. Rejected images, earlier successful images on
failure, and late results after cancellation or a 30-second decode timeout are
closed. ImageBitmap work itself cannot be interrupted; a late result is disposed
when the browser completes it. Untextured models do not require ImageBitmap support.

All 44 tests across eight GLB test files passed, session `67909` exit 0, log
`/tmp/web-local-glb-images-tests.log`. Decoder lifecycle tests use controlled mocks;
they do not alone prove actual browser image decoding. The isolated real-browser
check `node tooling/check-local-glb-images.mjs` passed as `69865` (exit 0), log
`/tmp/web-local-glb-images-browsers.log`. It checks a real embedded PNG, a truncated
payload with a valid header, resource closure, and zero network requests in
Chromium, Firefox and WebKit. All three engines returned 32×24 dimensions,
closed bitmap width zero, the expected corrupt-payload error and zero requests.
This initial run qualified PNG decoding; the expanded JPEG results are recorded below.
Source check `64070` passed; it started before the image module was added.
See the latest combined source check below.

## Explicit extension support

`validateLocalGLBExtensions` validates used/required declarations, rejects missing
or duplicate declarations, and checks extension placement and payload shape.
The initial supported extension is KHR_materials_unlit on materials. Unsupported
optional extensions are rejected explicitly rather than silently falling back to
an appearance that might differ from the original model. Compression, texture
transforms and other extensions remain unsupported until implemented and tested;
this is still work toward controlled local import, not completion of that feature.
Application-owned extras are not interpreted as renderer extensions. Original
source bytes remain the intended persistence/provenance source.

All four focused extension tests passed, session `66132` exit 0, log
`/tmp/web-local-glb-extensions-tests.log`. The earlier eight-file run passed 44
tests; a combined nine-file run has not yet been recorded. Browser decoder check
`69865` passed in Chromium, Firefox and WebKit (see scope above). Source check
`64070` passed but predates the image/extension modules. See the subsequent
combined check below.

## JPEG browser qualification and current source check

The isolated browser script now also encodes a real JPEG from the PNG fixture,
checks its actual decoded dimensions and disposal, inserts EXIF orientation 6
and verifies transposed dimensions, and rejects a JPEG truncated after its valid
SOF header. Every case runs with network requests blocked and counted. The run
passed as `37632` (exit 0), log `/tmp/web-local-glb-jpeg-browsers.log`. Chromium,
Firefox and WebKit all returned PNG/JPEG dimensions 32×24, EXIF-oriented JPEG
dimensions 24×32, closed bitmap state, expected corrupt-payload rejection and
zero network requests. This is new JPEG coverage, not an unchanged
rerun solely to obtain passing results.

The prior source check completed with zero errors/warnings. Fresh combined
source check `85887` passed with zero errors and zero warnings, log
`/tmp/web-local-glb-combined-check.log`, using NODE_ENV=production. It covers the
GLB runtime modules including image ownership and explicit extension validation.
The fixture/transport test files were added after it started.

## Complete textured integration fixture

`tooling/local-model-fixture.mjs` reproducibly generates
`tests/fixtures/local-model-textured-box.glb` from a Three.js box and the existing
`item-photo.png` test image. It has indexed triangles, positions, normals, UVs,
a metallic/roughness material and embedded PNG bytes. Geometry dimensions are
1 × 0.5 × 0.75 meters on X/Y/Z, corresponding to app width/depth/height
100 × 75 × 50 centimeters. A node translation places the bottom on ground level.
It is a test fixture, not a catalog asset with newly asserted image licensing.

The integration test combines extension, material, geometry and repacking checks,
asserts known bounds and instance counts, and compares the original embedded PNG
bytes after repacking. Its focused test passed, run `47478` exit 0, log
`/tmp/web-local-glb-fixture-tests.log`. Runtime source stayed unchanged through combined check `85887`, which passed;
this newly added test file postdates that check.

Storage/placement integration observations before the model-definition change below: FurnitureItem
stores dimensions in centimeters and resolves catalog models through
`createPlacedFurnitureModel`; custom model references do not exist yet. Project
packages already retain base64 asset bytes, but attachment deletion currently
checks photo/tracing references. Model persistence must add reference validation
and protect assets used by model instances before exposing removal controls.
The original GLB should remain the persistence/provenance source; the repacked
buffer is a temporary loading artifact. The import/placement UI remains absent.

## Original GLB attachment transport

A focused transport test now uses the complete textured fixture as a retained
`.glb` attachment. It exercises two web package encode/decode round trips with
JSON recovery between them, checking original bytes and attachment labels. It
also exercises pooled saved-version storage, requiring one stored copy of the
GLB and complete standalone projects after history hydration. Both tests passed,
run `33713` exit 0, log `/tmp/web-local-glb-transport-tests.log`.

This tests existing generic attachment transport, not model-aware persistence:
model-aware definitions/references were still unimplemented at this checkpoint
(the next section records their implementation). It does not qualify a native app import/export cycle for GLB data.
The prior combined source check passed with zero errors and warnings; no runtime
source changed during this transport verification work.

## Model definitions, instance references and deletion protection

Projects now optionally store `customModels`, and furniture may reference a
`customModelId`. Definitions retain a name, original attachment filename/source
filename, SHA-256 digest, source byte length, centimeter dimensions and optional
attribution/license/source URL. Existing catalog IDs remain procedural fallbacks.
Project reading checks bounded/unique definitions, metadata shapes, safe GLB
filenames, digest format, dimensions and same-project furniture references. When
retained asset storage exists, every model attachment must exist with a matching
encoded length. Package `web.json` transports definitions separately from assets,
so detached definitions are readable; model loading must still resolve and verify
original bytes/digests and run the GLB admission checks. This is structural data
validation, not permission to load arbitrary retained bytes into a renderer.

Attachment usage now includes every model definition, even one with no placed
instances. The generic attachment deletion path refuses to remove its original
GLB until the definition is removed. No import or model-removal UI is exposed yet.
The remaining work includes a bounded load/preview pipeline, original-byte hash
verification, model import/removal operations with storage budgeting, placement,
localization and full browser/native return qualification.

Focused definition and generic transport run `12846` passed, log
`/tmp/web-custom-model-definitions-tests.log`. Existing project-validation and
item-details regression run `57520` terminated with 70 passes and two timeouts
(exit 1), log `/tmp/web-custom-model-legacy-regression-tests.log`. All 53 project
validation tests passed. The two photo/history cases timed out at their existing
15-second quota-estimate and five-second crafted-history limits; no value
assertions failed. These cases also timed out in earlier runs before this change,
but that does not establish an all-green regression suite. Type check `89302` passed with zero errors and zero warnings, log
`/tmp/web-custom-model-definitions-check.log`; it predates source/removal modules. Legacy files do not gain optional model fields.

## Original source verification before loading

`readCustomModelSource` resolves original bytes only from the project's retained
attachment dictionary. It checks structural definitions, attachment presence,
encoded/decoded byte lengths, base64 characters/padding length, SHA-256 via
Web Crypto, and the GLB container. It does not fetch provenance URLs. Definition
metadata and immutable encoded bytes are captured before hashing, so subsequent
project edits cannot change the metadata returned with an earlier byte snapshot.
Cancellation is checked before work and after hashing; Web Crypto itself cannot
be interrupted. Missing browser crypto support produces an explicit failure.

Hash/container verification is not renderer admission: geometry, material,
extension, scene and texture checks must still be composed in the loading path.
All nine source/definition tests passed, run `10510` exit 0, log
`/tmp/web-custom-model-source-tests.log`. It covers exact bytes, independent
metadata, missing/detached sources, malformed base64, same-length corruption,
matching-hash invalid containers, cancellation and mutation during hashing.
Type-check `89302` passed but predates this source-verification module; see
the new combined check below.

## Model removal operation

`removeCustomModel` reads/clones the project, refuses removal while any floor has
furniture referencing the model, and removes an unused definition. It removes the
source attachment and label only when no remaining model definition or existing
photo/tracing reference uses it. Shared sources remain intact. The input project
and prior snapshot bytes stay unchanged; UI integration must commit the returned
project through the normal undo/save transaction. No model-removal UI exists yet.

All 13 definition/removal and source tests passed, run `57563` exit 0, log
`/tmp/web-custom-model-removal-tests.log`, including another-floor references,
shared definitions, attachment metadata references and non-mutation. The preceding
type check passed with zero errors/warnings. The subsequent combined check
`26892` also passed with zero errors/warnings, log
`/tmp/web-custom-model-source-removal-check.log`, covering the source and removal
modules but starting before the loader was added.

## Combined static model loader

`loadLocalGLBModel` now composes container, extension, material, geometry/repacking
and decoded-image validation with GLTFLoader. It snapshots input bytes before
asynchronous work, supplies decoded images through an embedded-texture plugin,
sets core sampler behavior, and blocks every attempted external resource URL.
The returned scene has measured meter dimensions and a single idempotent owner
that disposes geometries, materials, texture wrappers and image bitmaps. Error
paths dispose owned decoded images. Final world transforms/bounds are checked
for finite values, nonempty geometry and the supported coordinate range.
`loadCustomModel` first verifies a project's retained bytes/digest, then delegates
to this same loader while returning the captured model definition.

The initial furniture profile is explicitly static: animations, skins and cameras
are rejected, rather than silently dropped. Unit quaternions, affine matrices and
node morph-weight shapes are checked; static morph geometry remains supported.
This restriction is not a claim of complete glTF feature support. The import UI
must surface unsupported-profile errors without modifying the project or losing
the original source. The owner must remain alive while any renderer uses its
bitmaps; placement/cache lifetime integration remains to implement.

Nine loader/source tests passed, run `12401` exit 0, log
`/tmp/web-custom-model-loader-tests.log`. These use real GLTFLoader geometry and
material construction with controlled bitmap mocks; they do not yet qualify GPU
rendering of the combined loader. The added retained-project-to-scene test was
not in that collected run and passed separately as `21018` (one selected test,
five unselected), log `/tmp/web-custom-model-load-retained-test.log`. Type check `26892` passed but predates the loader module; see the subsequent
combined check below.

## Combined loader browser rendering and GPU cleanup

`tooling/check-local-glb-model.mjs` bundles the actual loader, loads the complete
textured fixture in isolated browsers, renders it with WebGL, and asserts measured
dimensions, visible foreground pixels, uploaded geometry/textures and no graphics
errors. It saves a frame before disposal, then removes the model and checks zero
remaining geometry counters, texture ownership and a closed image bitmap. Network
requests are blocked/countable and browser errors are collected. Chromium uses
the same SwiftShader flags as the existing app browser suite.

The combined source check including the loader completed with zero errors and
zero warnings (`/tmp/web-custom-model-loader-check.log`, run `6285`).

Browser qualification remains incomplete. Chromium rendered the expected dimensions
and 13,016 foreground pixels with no GL errors, network requests or browser errors.
Across three load/dispose cycles, geometry returned to zero, the model bitmap closed,
and one 16×16 DataTexture remained without accumulating additional textures.
The original zero-texture assertion failed; Three.js creates a shared DFG lighting
lookup texture on the first PBR draw. However, the subsequent direct `getDFGLUT()`
identity assertion also failed, so the identity of the retained texture has not yet
been conclusively verified by the harness. Investigate module identity/bundling and
renderer ownership before claiming a passed cleanup check. No production disposal
change was made on the basis of these diagnostics.

The latest run terminated with an assertion failure, recorded in
`/tmp/web-custom-model-browser-render-ownership.log`. Firefox and WebKit were not
reached by this run. The Chromium frame was visually inspected and showed the
expected blue textured cuboid. The checked-in harness is an unfinished diagnostic,
not a passing regression test. This harness does not qualify placement or app UI.


## Renderer ownership qualification resolved

Run `42690` exited 0 (`/tmp/web-custom-model-browser-uniform-ownership.log`).
The earlier identity assertion imported a separate source-module singleton beside
Three's built module. The corrected harness reads the actual material's renderer
`uniforms.dfgLUT.value` before disposal, then checks the remaining texture against
that object. No production disposal change was needed.

Chromium, Firefox and WebKit each passed expected dimensions, visible rendering,
zero GL/browser errors and zero network requests. Three successive load/dispose
cycles per engine released all model geometry and closed each decoded bitmap;
only the exact renderer DFG texture remained, with no texture accumulation.
Foreground pixel counts were 13,016 / 13,011 / 13,011 respectively. This qualifies
the fixture and owned-loader lifecycle, not the still-unimplemented application UI.

## Local model preparation and admission

`customModelImport.ts` adds file preparation through the complete loader, immutable
original-byte retention, digest-based attachment names, measured centimeter
sizes, user-supplied provenance, and pure admission against a project/history.
Preview scene or dimensions edits cannot change the private admitted source.
Disposed or forged preview handles cannot be admitted. Identical imports reuse
existing definitions/metadata; conflicting or damaged sources are rejected.
The operation preserves inputs and shares the existing attachment/history budget
calculation, including browser quota headroom. File type/size, model count,
attachment count and positive furniture dimensions are enforced. The eventual UI
must commit the result through the normal undo/save transaction and dispose the
preview when done; admission itself does not persist anything.

Four tests passed (`12644`, `/tmp/web-custom-model-import-tests.log`), covering
exact retained bytes, preview mutation isolation, duplicate imports, provenance,
expired/forged previews, quota rejection, source collisions and cancellation.
The type check including this module is active as `39167`, log
`/tmp/web-custom-model-import-check.log`; do not treat the earlier loader check
as qualification of this later module. Import UI, placement, localization and
full workflow/native return checks remain open.


## Saved custom-model rendering and instance lifetimes

Admission type check `39167` completed with zero errors and warnings.
`createPlacedFurnitureModel` now resolves `customModelId` through the verified
local source pipeline, with a procedural fallback while loading. It uses saved
size overrides or model definition dimensions, centers the actual geometry at
its base in centimeters, and preserves saved position, rotation and axis scales.
The active-floor viewer supplies the project; scene signatures include model
definitions without serializing attachment payloads. This adds rendering of saved
references; no import/placement UI is exposed yet, and inactive stacked floors
still use their existing simplified rendering.

Project-source leases share decoded bitmaps while instances remain live, clone
instance geometry/materials/texture wrappers, cancel abandoned pending loads and
release source images after the last instance's GPU cleanup. Source/metadata
changes bypass stale entries. Disposal callbacks use the existing recursive
scene teardown, including containers removed before their model loads. The custom
pipeline is dynamically imported so ordinary catalog use does not eagerly load
its validation modules.

Initial placement/catalog run `63422` had 15 passes and one existing nested-model
fit test timing out during module import. After lazy loading, run `6699` passed
all 17 tests (`/tmp/web-custom-model-placement-lazy-tests.log`), including shared
instance disposal, late decoder completion after removal, real geometry fitting,
missing size overrides and definition signature invalidation. The expanded seven-test placement file passed as `70186`
(`/tmp/web-custom-model-placement-lifetime-tests.log`), including the additional
shared pending-load and same-project source-change cases. Type check `77127`
passed with zero errors/warnings but began before the final lazy-load and
size-default edits. A final check is running in
`/tmp/web-custom-model-placement-final-check.log`; its result remains pending.


## Import, preview and retained-model interface

Final placement type check `59212` passed with zero errors/warnings.
The Objects tab now includes a custom-model panel: choose a GLB, inspect an
orbitable preview with reset control, supply a name/optional provenance, and
admit the original source through storage/history checks. Prepared handles use
Svelte raw state so proxying cannot break their private source identity. Cancel,
tab destruction and project-ID changes abort pending work and dispose previews.
Async admission rejects a changed project before committing through the existing
Undo transaction. The interface explicitly asks users to save afterward, matching
other editor changes; it does not claim an automatic persistent save.

Retained models expose placement at the 2D view center, selection for subsequent
movement/resizing, and confirmed unused-model removal. A pure placement operation
stores explicit dimensions and a procedural catalog fallback; one focused test
passed as `28230` (`/tmp/web-custom-model-place-operation-tests.log`). All new
interface labels are available in English and Portuguese, but detailed service
validation diagnostics still need localization. Compiler-only checks of both new
Svelte components reported no warnings.

UI source check `55921` passed with zero errors/warnings
(`/tmp/web-custom-model-ui-check.log`). Production build `94629` is running (`/tmp/web-custom-model-ui-build.log`). The new
browser test covers preview, exact retained digest/source, placement Undo/Redo,
then confirmed storage persistence and reload. It has not run yet; wait for the
new build rather than using the older production output. Broader browser,
physical-device/native return and accessibility qualification remain open.


### Production build and first UI workflow passed

Production build `94629` exited 0, including adapter output, log
`/tmp/web-custom-model-ui-build.log`. Chromium run `95224` exited 0 with one
workflow passed in 2.9 minutes, log `/tmp/web-custom-model-ui-chromium.log`.
The actual Objects-panel workflow verified a visible preview and dimensions,
user-entered name/attribution, exact original digest and base64 bytes in export,
placement dimensions/reference, full floor equality across Undo/Redo, then
confirmed persistence before reload and restored model/source/furniture equality.
No page errors were reported. This test does not yet exercise cancellation,
removal, model rendering in the full 3D viewer, Portuguese controls or other browsers.
The preview screenshot is attached to the local Playwright report.


## Broader UI qualification and saved display names

Firefox/WebKit run `63246` is active against the previously qualified production
build, log `/tmp/web-custom-model-ui-other-browsers.log`; it must reach terminal
results before claiming those workflows pass or starting another test server.
A separate `custom-model-removal.spec.ts` now covers Escape cancellation and focus
restoration, malformed-source rejection without project mutation, cancelled removal,
then unused source/label cleanup and restoration through Undo/Redo. It has not run
and must wait for the occupied browser server to finish.

The canvas, Layers list and Properties heading now resolve a custom model's saved
name before using catalog/unknown labels. User-authored names stay verbatim across
interface languages; normal catalog fallback behavior remains unchanged. Type check
`79860` is active, log `/tmp/web-custom-model-labels-check.log`. This source change
is newer than the running browser build and needs separate qualification; do not
attribute current Firefox/WebKit results to the new labels.


## WebKit workflow and admission error translations

Run `63246` terminated with exit 1: WebKit passed the complete import/preview,
source retention, placement Undo/Redo and save/reload workflow in 1.2 minutes.
Firefox hit the 180-second test limit and a further 60-second teardown limit;
its failure snapshot showed the initial editor Build tab, so model import was
not qualified. Its trace archive remained unreadable even after process exit.
No failing model value assertion or root cause was established. Keep Firefox
qualification open rather than treating this as a model correctness failure or
as a passing workflow. Log: `/tmp/web-custom-model-ui-other-browsers.log`.

Chromium cancellation/removal run `45654` is now active, log
`/tmp/web-custom-model-removal-ui.log`. It uses the existing production build and
does not qualify the newer name-label or translation changes.

`customModelMessages.ts` now translates 24 common file/admission, source identity,
storage, decoder, definition and removal errors. The panel resolves these keys
reactively for English/Portuguese and preserves unknown validator diagnostics.
The dictionary test passed (`46336`, `/tmp/web-custom-model-messages-tests.log`).
This is partial diagnostic localization: geometry and other validator details
outside the registered messages remain untranslated. Label type check `79860`
was already running before these edits and cannot qualify the new translations;
a later final check/build and Portuguese browser check are still required.


Label type check `79860` completed with zero errors/warnings. Fresh check `10317`
is active for the subsequent error translations, log
`/tmp/web-custom-model-messages-check.log`. Cancellation/removal browser run
`45654` remains live; do not restart it or start a competing server solely because
its output is quiet. All code through `031332f` is committed and pushed.


## Cancellation trace and focused workflow rerun preparation

Run `45654` exited 1 on the 180-second budget while exporting after the removal
confirmation. Its readable trace showed successful Escape cancellation/focus
restoration, exact project equality after cancellation, invalid GLB rejection
without mutation, valid admission, then cancelled-removal equality. It did not
reach verified removal/Undo/Redo comparisons. Ordinary toolbar clicks consumed
large intervals (the initial Export action roughly 59 seconds); no model value
assertion failed. This remains an incomplete workflow, not a pass.

`custom-model-removal.spec.ts` now separates cancellation/invalid input from the
removal/Undo/Redo sequence, preserving every assertion with independent test
budgets. `custom-model-localization.spec.ts` adds Portuguese controls, translated
invalid-source and used-model errors, retained verbatim custom names in the
canvas/Properties heading, and no fetching of provenance URLs. These new tests
have not run. Current production build `33714` is active at
`/tmp/web-custom-model-labels-messages-build.log`; wait for completion before
running tests against the new labels/messages. Type check `10317` remains active
at `/tmp/web-custom-model-messages-check.log`.


### Restore lazy preview loading before the next browser run

Translation type check `10317` passed with zero errors/warnings. Build `33714`
completed successfully, including adapter output, for names/messages. Review then
found that the panel's static preview-component import pulled Three.js into the
initial editor graph despite the existing lazy 3D-viewer design. The preview
component now loads alongside model preparation only after file selection, with
a generation check before decoding if the request was cancelled during imports.
This removes the eager import; it is not a proven fix for the earlier timeouts.

The revised panel compiled without Svelte warnings. Fresh source check `85089`
(`/tmp/web-custom-model-lazy-preview-check.log`) and build `7222`
(`/tmp/web-custom-model-lazy-preview-build.log`) are active. The split removal and
Portuguese UI tests must run after this build finishes so their evidence applies
to the final loading path. No browser test server is currently active.


### Full-viewer lifetime test prepared

`custom-model-viewer.spec.ts` now drives real UI import, creates two placed
instances, enters the full 3D viewer, observes uploads of the fixture's decoded
bitmap through WebGL, verifies one shared decode beyond the disposed preview,
and checks that leaving the viewer closes that image. It also captures a viewer
frame and records page errors. This test is not yet run; its instrumentation is
a test observation, not production code. Build `7222` and type check `85089`
remain active and must reach terminal results before browser qualification.


### Current source ready; browser workflows running

Type check `85089` completed with zero errors/warnings. Build `7222` completed
successfully, including adapter packaging (`/tmp/web-custom-model-lazy-preview-build.log`).
Chromium run `84773` is now active, log `/tmp/web-custom-model-current-ui.log`,
covering four tests across cancellation/removal, Portuguese controls and full
viewer image lifetime. These tests use the current name/message/lazy-preview
source. Their outcomes remain pending; no competing browser server should start
until this run is terminal.


### All four current Chromium workflows passed

Run `84773` exited 0: four tests passed in 6.7 minutes, log
`/tmp/web-custom-model-current-ui.log`. Portuguese controls passed in 2.2 minutes;
cancellation/invalid input in 43 seconds; removal Undo/Redo in 1.5 minutes; full
viewer lifetime in 2.0 minutes. The first confirms verbatim custom names in canvas
and Properties, translated public-source and used-model errors, and no provenance
URL fetching. Cancellation restores focus and leaves exported project data equal.
Unused removal deletes the definition/source/attachment label, and Undo/Redo
restores/removes exact source and metadata. Two placed instances share one newly
decoded model image in the full viewer, upload it through WebGL, and close it on
leaving 3D. No page errors were reported.

Both captured frames were visually inspected: the 3D viewer shows the blue model
at its expected proportions, and the Portuguese editor shows the saved custom
name and readable removal error without overlapping controls. Copies are retained
at `/tmp/openplan-custom-model-ui-viewer-qualified.png` and
`/tmp/openplan-custom-model-ui-portuguese-qualified.png`. This closes the recorded
Chromium workflow checks, not Firefox, mobile/accessibility, other validator
translations, native return or broader NEXT requirements.


## Firefox passed; controlled validator translations expanded

Current-build Firefox run `55495` exited 0: the full original import/preview,
source preservation, placement Undo/Redo and confirmed save/reload workflow passed
in 3.2 minutes (`/tmp/web-custom-model-firefox-current.log`). This resolves that
specific unqualified workflow after the earlier timeout. It does not prove the
lazy-loading change was the cause of the timing difference, nor qualify every
new workflow in Firefox.

The error registry adds 132 fixed messages covering GLB containers, resources,
scene graphs, accessors, geometry, materials, definitions, static loading and
retained-source integrity. Three pattern translations preserve variable attribute
and extension identifiers literally, including braces. Known bounded table/field
variants are registered explicitly. Unknown external diagnostics remain intact;
own-property lookup avoids inherited object properties being treated as keys.

Three tests across the dictionary/pattern suite and a TypeScript AST inventory
passed (`46495`, `/tmp/web-custom-model-diagnostics-coverage.log`). The inventory
checks every fixed error emitted directly by the 14 controlled pipeline modules;
it does not claim coverage of all transitive project-storage or external-library
errors. A new Portuguese browser case exercises unsupported extension identifiers
and invalid accessor normalization. It has not run on this expanded source yet.
Type check `12414` and build `75751` are active, with logs
`/tmp/web-custom-model-validator-translations-check.log` and
`/tmp/web-custom-model-validator-translations-build.log`. Fluent review and broader
UI/native/physical-device requirements remain open.


## Final checkpoint verification

Expanded-validator type check `12414` completed with zero errors and warnings;
production build `75751` completed successfully (6m 18s plus adapter output).
The additional Portuguese validator browser case remains pending.

The new native-return bridge suite passes both cases after correcting its floor
fixture to use `createDefaultFloor(1)`. It exercises UI-admitted model references,
native-plan move/resize/rotation/floor edits, instance deletion, exact retained GLB
bytes, and explicit unused-model removal. This edits package JSON in the web test;
it does not establish a real Swift or physical-device round trip. Log:
`/tmp/web-custom-model-native-edit-bridge-tests.log`. Broader NEXT work remains open.


## Portuguese validator browser check passed

Chromium run `10501` passed the new Portuguese validator case in 2.1 minutes
(`/tmp/web-custom-model-portuguese-validator-browser.log`). Unsupported extension
identifiers retain literal braces; invalid accessor normalization receives the
translated diagnostic, without exposing an admission action for the invalid file.

A real web package was generated through `prepareCustomModel`, `attachCustomModel`,
`placeCustomModel`, and `projectPackageBytes` for the native test fixture
`FloorPlanTests/Fixtures/web-custom-model-package.zip`. The fixture includes the
original textured GLB, a placed model and a second floor. Native XCTest now checks
actual import/save/export with move, size, rotation and floor changes, preserving
sidecar and GLB bytes. Its simulator run is pending; no native pass claimed yet.


## Shared storage diagnostic correction

The snapshot expansion limit now describes attachments and smaller files, so the
same error is accurate for both photos and retained GLBs. The custom-model error
registry now includes the shared history-size and unreadable-history diagnostics
using existing English/Portuguese service translations. Limits and recovery
behavior are unchanged. Translation suites (`13515`) and sequential type check /
production build (`22153`) are running; logs are
`/tmp/web-custom-model-shared-storage-messages.log`,
`/tmp/web-custom-model-shared-storage-check.log`, and
`/tmp/web-custom-model-shared-storage-build.log`.

Native simulator test `6249` remains active at this checkpoint, using isolated
derived data `/tmp/openplan3d-render-ios-build`; its log is
`/tmp/openplan3d-custom-model-native-return-tests.log`. Read its terminal result
before consuming the actual Swift return fixture or claiming native qualification.


## Keyboard-operable model preview

All 44 translation/service-message tests passed (`13515`, 136.53 seconds). The
shared-storage type/build sequence `22153` and native test `6249` remain active.

The preview now has native buttons for four orbit directions and two zoom actions,
with 44px minimum target height, visible keyboard focus, English/Portuguese labels
and a translated image name. Orbit elevation and zoom stay within bounded camera
limits; reset restores the initial view. Preview-only controls hide if WebGL fails.
A new browser case drives each button with Enter and reset with Space, checks the
rendered canvas changes and returns to its original image, and checks cancellation
and page errors. This code is newer than the active validation sequence and requires
a fresh type/build check, browser run and visual inspection. No accessibility or
physical-device completion is claimed.


## Actual native storage round trip passed

Simulator run `6249` exited 0 with `TEST SUCCEEDED`. The selected
`testCustomModelSourceSurvivesNativeEditingAndExport` passed in 0.254 seconds after
the app/test build. Swift imported the real web package into isolated session
storage, saved furniture edits and exported a new package; GLB and web/baseline/
mapping bytes remained exact. Log: `/tmp/openplan3d-custom-model-native-return-tests.log`.
The test's actual output is checked in as
`tests/fixtures/swift-return-custom-model-package.zip`.

Web run `7041` preserved model definitions, source bytes and geometry but failed
its last assertion on uppercase Swift UUID spelling versus normalized lowercase
web UUID spelling. The corrected assertion follows the existing reader identity
normalization; no runtime code changed. Fresh run `17274` passed all three tests
in 36.88 seconds (`/tmp/web-custom-model-actual-swift-return-final.log`), including
direct import of the actual Swift ZIP and another web export. This qualifies the
storage/bridge contract, not native UI, native GLB rendering or physical devices.

Shared-storage type check completed with zero errors/warnings, and build `22153`
completed with exit 0, including Node adapter output. Bundling began after the
keyboard-control changes, so that production output includes them. Fresh keyboard
type check `73539` remains active (`/tmp/web-custom-model-keyboard-check.log`);
Chromium keyboard case `67983` is running on that build
(`/tmp/web-custom-model-preview-keyboard-browser.log`).


## Keyboard workflow timeout before preview

Chromium run `67983` exited 1 on the 180-second whole-test budget while selecting
the input file; it never reached the preview or keyboard assertions. Its trace
recorded roughly 19 seconds navigating to the editor and 141 seconds opening the
Objects tab. The final snapshot showed the Objects panel and model-import region.
This is not evidence that rotation/zoom failed, nor proof of a product fix.

The case now allows 360 seconds for editor startup and all six keyboard/image
checks; every assertion remains. Run `82817` is active on the same verified build
(`/tmp/web-custom-model-preview-keyboard-browser-final.log`). The original failure
log is `/tmp/web-custom-model-preview-keyboard-browser.log`. Fresh type check
`73539` remains active.


## Keyboard controls qualified in Chromium

Fresh type check `73539` exited 0 with zero errors/warnings on the keyboard-control
source. Chromium rerun `82817` exited 0: its six orbit/zoom buttons were focused and
activated with Enter; each changed the rendered image, and Space on Reset returned
the canvas exactly to its initial image. Cancellation completed with no page
errors. The test took 5.4 minutes (6.1 minutes including runner overhead); the
earlier 180-second attempt remains a startup timeout, not a passing run.
Log: `/tmp/web-custom-model-preview-keyboard-browser-final.log`.

The attached 512px-wide dialog screenshot was visually checked: model, control
labels and metadata fields are legible, with no control overlap. The form scrolls
within the dialog height. Copy: `/tmp/openplan-custom-model-keyboard-qualified.png`.
This qualifies the named Chromium keyboard workflow, not mobile touch, physical
assistive technology or the other engines.
