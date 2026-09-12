# Next work and pause handoff

## Editor dismissal reproduction — September 12

Done closed without edits, but stayed open after adding and rotating a chair
through menus. The file saved successfully; no canvas drag was involved. See
`docs/reviews/2026-09-12-editor-menu-dismissal.md` for the reproduction and
save-failure safeguard required for the next experiment. Native source remains
unchanged while simulator session `50299` runs.

## Full-scan import dismissal — Catalyst verified, simulator running

Initial Cancel and post-import Back to Library/Done now pass live Catalyst
checks. Two synthetic imports preserved every source hash. All 21 selected
Catalyst dataset tests passed, including the existing 194-frame/394-file real
scan preservation check. The iPhone simulator selection remains active in
session `50299`, log `/tmp/native-scan-local-dismiss-ios.log`. See
`docs/reviews/2026-09-12-full-scan-dismissal.md` before resuming. Physical UI,
editor dismissal and broader NEXT work remain open.

## Project-package import dismissal — September 12

Initial Cancel and post-import Back to Library/Done now dismiss through a shared
button inside the presented sheet. All three paths passed live isolated Catalyst
checks, including two independent real package imports. Catalyst build and 12
iPhone simulator package tests passed. See
`docs/reviews/2026-09-12-import-sheet-dismissal.md`. Full-scan import, editor
dismissal, physical-device UI and broader NEXT work remain open.

## Native export sheet dismissal — September 12

Export Options now requests dismissal from inside its own sheet before the
existing onDismiss callback starts queued work. Live isolated Catalyst checks
verified Cancel, package export/save, PDF export and save cancellation without
Escape. The Catalyst build and 12 iPhone simulator package tests passed. See
`docs/reviews/2026-09-12-export-sheet-dismissal.md`. Separate editor/import-sheet
delays, physical share-sheet checks and the broader backlog remain open.

## Floor-specific tracing image checkpoint — September 12

Tracing images now support optional native floor ownership. Native rendering,
scaling and fitting respect the owner; legacy images without an owner remain
plan-wide. Package exchange preserves ownership through floor reordering and
renumbering, including image-only floors, and retains original asset bytes.

Validation: 28 web package tests passed, Svelte check reported zero errors and
warnings, and 16 selected tests passed on both Mac Catalyst and iPhone 17 Pro
simulator. The production web build passed. Live isolated Catalyst checks
confirmed visibility, fitting and owner-specific menu controls while switching
floors. Actual native re-export/browser checks also passed: six cases across
Chromium, Firefox and WebKit verify owned and legacy image visibility, rotation,
returned floor ownership and exact PNG bytes. See
`docs/reviews/2026-09-12-underlay-floor-validation.md`. Earlier full-suite results
below apply to their recorded source revisions, not this change.
The broader NEXT backlog remains open.

## Native full-suite checkpoint — September 12

Both full native suites passed on production source `5838f4b`: 256 reported,
254 passed, two opt-in integration skips and zero failures on each of Mac
Catalyst and iPhone 17 Pro simulator. XCTest durations were 103.930 and 91.378
seconds. Both processes terminated with exit 0 (sessions `29871` and `26834`;
`/tmp/native-sept12-full-{catalyst,ios}.log`). Skipped worker integrations lacked
external inputs and are not counted as passes.

Rotated tracing-image fitting also passed the unchanged-plan Catalyst visual
check. The cropped-underlay fitting issue is addressed and verified. No native
build or test process remains active. Full physical-device, release, billing and
broader NEXT requirements remain open. Native details and reproducible commands
are in `openplan3d-ios/docs/native-september12-full-validation.md`.

## Native tracing-image fitting — September 12

The prior native UI check showed the tall rotated tracing image cropped below
the walls. Native editor framing now unions the active plan geometry with the
rotated underlay rectangle, using the same decoded-image aspect ratio as drawing.
Image-only plans fit the actual image location, without adding default origin
bounds. Missing/invalid dimensions fall back to the original geometry bounds.
Measurement and export `bounds` remain unchanged. Initial loading reads image
dimensions before fitting; importing a fresh trace also fits the complete image.

New `UnderlayFitTests` project all four corners at five angles into a padded
viewport, preserve geometry bounds, and cover remote image-only plans and invalid
image dimensions. The first Catalyst attempt compiled the app but failed on an
ambiguous `.infinity` test literal; it is now explicitly `CGFloat.infinity`.
The corrected Catalyst run passed all 14 selected fit/package tests (session
`41154`, terminal exit 0; `/tmp/native-underlay-fit-catalyst-fixed.log`).

Visual verification of `5838f4b` also passed using the same saved synthetic plan
in `/tmp/OpenPlan3D-Underlay-Fit-QA.app`. The running executable path was verified.
This new QA binary reused only the prior isolated rotated-underlay sandbox; the
installed development app was not used. On opening the editor, the full tall
image and all walls are visible, with the image's bottom edge above the toolbar.
The prior build cropped the lower image in this same plan. Rotation and color
orientation remain correct. The QA app was closed after inspection.

All 14 selected tests also passed on the iPhone 17 Pro simulator (session
`35632`, terminal exit 0; `/tmp/native-underlay-fit-ios.log`). Native source
`5838f4b` now has selected Catalyst/simulator and Catalyst visual verification.
The broader NEXT/device/release work remains open.

## Rotated tracing-image package support — September 12

The first web floor's PNG/JPEG/GIF tracing image now maps to the native underlay
at arbitrary rotation using optional clockwise-radian `angle` metadata. The native
canvas rotates the image around its existing center. Save/reopen and package
return retain the angle and original image bytes. Omitted legacy angles remain
omitted; native angle changes and explicit resets update web rotation without
resetting opacity or locking. Both readers validate optional angles consistently.

Validation: 24 web package tests passed after four new cases failed on the old
implementation; web type checking reports zero errors/warnings and production
build passed. Native package tests passed on Mac Catalyst (11 tests, session
`58398`, exit 0) and iPhone 17 Pro simulator (12 tests including invalid-angle
and explicit-reset coverage, session `75363`, exit 0). Rotated PNG/JPEG save,
reopen, import and re-export preserve exact asset bytes. Logs are
`/tmp/web-underlay-rotation-{before,unit,check,build}.log` and
`/tmp/native-underlay-rotation-{catalyst,ios}.log`.

Native visual inspection and live native export returned through all three
browser engines now pass; see [the UI report](docs/reviews/2026-09-12-underlay-rotation-ui.md).
The subsequent native fitting change includes the rotated image extent and is
verified in both selected test suites and the same native QA plan.
No build or test process remains active. Device, release and broader NEXT work
remain open.

## Fractional window clearance in elevation — September 12

Reproduced a window extending above a fractional wall top after an elevation
drag: a 250.25 cm wall exported a 250.5 cm window top (Chromium session `50371`,
exit 1, 5.8 seconds; `/tmp/web-elevation-clearance-before.log`). Rounding the
already-clamped sill height caused the 0.25 cm overrun. Elevation dragging now
rounds the requested sill first, then clamps it to the exact lower wall height
across the opening, retaining fractional limits on flat and sloped walls.

All 15 focused browser cases passed in two minutes (session `92103`, terminal
exit 0; `/tmp/web-elevation-clearance-browser.log`): flat, rising and falling
wall limits plus Escape/Undo drag workflows in Chromium, Firefox and WebKit.
Exports verify the opening reaches but does not cross the wall top, other fields
remain exact, and Undo/Redo restores the full original/moved floor. Type checking
reports zero errors and warnings; the production build passed (session `28955`,
exit 0; `/tmp/web-elevation-clearance-{check,build}.log`). No browser process is
active. Earlier full-suite qualifications remain historical; broader NEXT
requirements and the intermittent nested-room Undo investigation remain open.

## History shortcuts during pointer drags — September 12

A new Chromium reproduction confirms that pressing Undo while a room-label
press is still held leaves the label displaced by 60 pixels after mouseup.
The pending label offset was committed after history replay. The canvas now
finishes its active pointer gesture before applying Undo/Redo shortcuts, so
mouseup cannot overwrite the restored state. This is a separate reproduced
failure; it does not establish the cause of the earlier intermittent nested-room
Undo failure after a completed mouse release.

The new regression covers interrupted label dragging and Redo. Seven geometry
workflows also exercise Undo while pressed, exact exported geometry restoration,
Redo, and subsequent Undo/Redo. Existing mouse-release cases remain intact.
The pre-fix Chromium case failed in 15.6 seconds (session `35372`, exit 1;
`/tmp/web-label-mid-drag-undo-before.log`). Type checking reports zero errors
and warnings; the production build passed (session `31291`, exit 0).
The pre-change full unit checkpoint passed 1,037 tests in 99 files in 3.42 seconds
(session `92756`, exit 0; `/tmp/web-sept12-full-unit.log`). The same full suite
also passed on `df4dfa4`: 1,037 tests in 99 files, 30.12 seconds (session `66523`,
exit 0; `/tmp/web-mid-drag-history-unit.log`).

All 48 focused browser cases passed in 11 minutes (session `26654`, terminal
exit 0; `/tmp/web-mid-drag-history-browser.log`): 16 per engine, covering both
normal release and Undo while held for seven geometry types and room labels.
The room-label case failed before the fix and now passes in all three engines.

The separate elevation reproduction also failed (session `49556`, terminal
exit 1, 18 seconds; `/tmp/web-elevation-mid-drag-before.log`). After Undo and
mouseup, the exported window retained position `0.5666111677120893` and sill
height `110`, rather than the original `0.5` and `90`. The elevation capture-phase
listener now ends its drag group before the global history shortcut runs.
Focused text fields retain native Undo/Redo behavior. Type checking reports zero
errors and warnings and the production build passed (session `28836`, exit 0).

All six elevation cases passed in 1.1 minutes (session `96723`, terminal exit 0;
`/tmp/web-elevation-mid-drag-browser.log`), covering normal Escape exit and Undo
while held in Chromium, Firefox and WebKit. Exact exported geometry, Redo and
subsequent Undo/Redo assertions passed. No browser process remains active.

The 48 passing plan-canvas cases above apply to `df4dfa4`; the six elevation
cases apply to `e6da660`. The older 1,116-case qualification applies to runtime
`03e0ae1`; it is not a full-suite result for these new changes. Broader NEXT
requirements, including the earlier intermittent nested-room Undo issue, remain
open.

## Current browser qualification — all 1,116 cases passed

Full stage 4 finished successfully (session `22429`, terminal exit 0):
546 passed in 1.5 hours; `/tmp/web-orbit-fixed-full-browser-4.log`.
Exact inventory matching across the four continuation stages and focused
verification logs confirms 1,116 unique current-runtime passes: 372 each in
Chromium, Firefox and WebKit. Repeated cases count only once. Production
remains `03e0ae1`; this qualification combines the resumed runs and focused
reruns after test synchronization/budget fixes, rather than one uninterrupted
suite run. No browser qualification process remains active.

The earlier intermittent nested-room Undo failure remains unexplained despite
passing subsequent coverage. Broader NEXT requirements remain incomplete.

## Current browser qualification — photo recovery verified; suite resumed

Full orbit-runtime stage 2 is terminal (session `46921`, exit 1): 282 passed,
one failed, 583 not run in 56.2 minutes. Log:
`/tmp/web-orbit-fixed-full-browser-2.log`. Including the 250 retained passes,
532 current-runtime cases passed. The Firefox bad-photo/quota recovery test
failed at item-details.spec.ts:224 while awaiting the second photo chooser.
The Add photo click completed about five seconds into the test, but no chooser
event arrived before the 60-second total timeout. The snapshot shows the
expected storage-full banner after editing the note. This is not evidence that
the test merely needs more time. Original trace and context are preserved in
`/tmp/web-photo-chooser-failure`. The unchanged Firefox reproduction passed in 39.2 seconds (session `43729`,
exit 0; `/tmp/web-photo-chooser-repro.log`). The failed trace selected the old
Add photo coordinates while the note autosave could introduce the storage-error
banner; a layout race is a hypothesis, not a confirmed product defect. The test
now explicitly waits for the expected storage-full alert after editing the note
before clicking Add photo. This adds synchronization and preserves all original
photo, saved-byte, draft-export and retry assertions. Production is unchanged.
All three traced photo/quota cases passed in 2.6 minutes (session `80528`,
terminal exit 0; `/tmp/web-photo-quota-all-engines.log`). This verifies the
synchronized workflow but does not prove the original layout-race hypothesis.
Exact inventory matching establishes 534 unique current-runtime passes;
Playwright confirms 582 remaining tests in 136 files. Full stage 3 runs in
session `63876`, `/tmp/web-orbit-fixed-full-browser-3.log`, using
`/tmp/web-orbit-fixed-remaining.txt`. Poll that handle before competing runs.
Full qualification, the intermittent nested-room Undo issue and broader NEXT
requirements remain incomplete.

## Orbit damping fix — PDF checks passed; full browser suite resumed

The unchanged Chromium idle reproduction failed again after orbit (session
`88961`, terminal exit 1; `/tmp/web-viewer-idle-repro.log`). An isolated run with
the installed OrbitControls needs 165 frames to settle a large-scene orbit:
2.75 seconds at 60 fps, but 41.25 seconds at 4 fps. The viewer now scales damping
by elapsed time, preserving the 60 Hz response and restoring the configured
factor for pointer-event updates. Its clock resets when orbit rendering sleeps
or walkthrough takes over. The browser idle assertion has not been relaxed.

All 26 focused damping/framing unit tests passed, including equal camera position
after one second at 4–120 fps and settling within five seconds at those rates.
Log: `/tmp/web-orbit-damping-unit.log`. Type checking completed with zero errors
and warnings (session `79798`, exit 0; `/tmp/web-orbit-damping-check.log`).
The production build passed (session `33825`, exit 0;
`/tmp/web-orbit-damping-build.log`). Production source is `03e0ae1`.
All 18 idle-rendering, framing and texture-recovery cases passed across all three
engines in 2.3 minutes (session `54192`, terminal exit 0;
`/tmp/web-orbit-damping-browser.log`). The original idle assertion is unchanged.
The current 1,116-case inventory is `/tmp/web-orbit-fixed-inventory.log`.
Full stage 1 is terminal (session `23185`, exit 1): 229 passed, one failed,
868 not run, log `/tmp/web-orbit-fixed-full-browser-1.log`. Together with the
18 focused passes, 247 distinct cases passed on this runtime. The PDF source
case failed at `pdf-3d-source.spec.ts:31`: its 10-second canvas visibility wait
expired while the snapshot still showed “Loading 3D viewer…”. The trace contains
no console errors. The unchanged Chromium reproduction passed in 48.8 seconds (session `62767`,
exit 0; `/tmp/web-pdf-source-repro.log`). Its trace records 13.27 seconds for
the successful canvas visibility check despite the configured 10-second wait.
This test now allows 60 seconds for lazy viewer startup and 180 seconds for the
whole multi-export workflow; all canvas-source, page-count, recovery, notice and
failed-download assertions remain unchanged. Production source is unchanged.
All three PDF cases passed (session `77637`, terminal exit 0, two minutes;
`/tmp/web-pdf-source-all-engines.log`), including source selection, recovery,
page counts and failure notices. Exact inventory matching establishes 250 unique
current-runtime passes. Playwright confirms 866 remaining tests in 136 files.
Full stage 2 runs in session `46921`, `/tmp/web-orbit-fixed-full-browser-2.log`,
using `/tmp/web-orbit-fixed-remaining.txt`. Poll that handle before competing runs.
This production change invalidates prior-runtime browser pass credit: the 374
passes documented below belong to the thumbnail-fixed runtime, not this fix.
Full browser qualification, the intermittent nested-room Undo investigation,
and broader NEXT requirements remain incomplete.

## Reserved project-ID thumbnail fix — verified; nested-room Undo failure under investigation

The library now uses only own thumbnail entries, preventing missing previews
for `__proto__`, `constructor`, and `toString` from becoming inherited values
and invalid image requests. Imported IDs and project data are unchanged.
All nine thumbnail cases passed across Chromium, Firefox and WebKit: absent
previews, saved previews, and preview-read failures, including ordinary IDs.
All 15 save-conflict cases also passed. Type checking reports zero errors and
warnings; the production build passed. Production source is `c14fce7`.

Logs: `/tmp/web-reserved-thumbnail-check.log`, `/tmp/web-reserved-thumbnail-build.log`,
`/tmp/web-reserved-thumbnail-browser.log` (eight Chromium passes), and
`/tmp/web-reserved-thumbnail-browser-2.log` (16 Firefox/WebKit passes). All those
sessions are terminal. The Firefox request assertion exempts only the exact
favicon URL declared by the document; thumbnail and unexpected-request checks
remain intact.

The updated inventory contains 1,116 cases. The full run passed 243 cases, then
furniture category previews reached a 10-second canvas-readiness deadline.
The snapshot had mounted 3D controls; the canvas assertion had not completed.
That wait now allows 60 seconds within a 180-second workflow, retaining category,
metadata and exact model-download checks. Session `44047` is terminal; log
`/tmp/web-thumbnail-fixed-full-browser-1.log`. With the focused checks, 267
distinct current-runtime passes match the inventory and are retained in
`/tmp/web-thumbnail-fixed-passed.txt`. Playwright confirms 849 remaining cases;
stage 2 ran in session `99630`, log `/tmp/web-thumbnail-fixed-full-browser-2.log`.
It terminated after 11 passes (5.8 minutes), at the mobile damaged-import
case’s 10-second canvas deadline while the snapshot showed the loading viewer.
The wait now allows 60 seconds within 180 seconds overall; exact project,
library, undo/redo and extension checks remain. There are 278 distinct retained
passes; Playwright confirmed 838 remaining cases. Stage 3, session `76367`,
is terminal: 15 passed, then nested-room label Undo failed at room-slabs.spec.ts:99.
The label moved 40 pixels as expected but remained there after Undo. This is
a behavioral failure, not a viewer-readiness timeout. There are 293 distinct
current-runtime passes. Log: `/tmp/web-thumbnail-fixed-full-browser-3.log`.
The unchanged Chromium reproduction passed the entire workflow in 2.2 minutes
(session `32789`, terminal exit 0; `/tmp/web-nested-undo-repro.log`). The traced
all-engine run also passed unchanged: Chromium 2.2 minutes, Firefox 44.9 seconds,
and WebKit 35.5 seconds (session `59904`, terminal exit 0;
`/tmp/web-nested-undo-all-engines.log`). Saved traces are in
`/tmp/web-nested-undo-passing-traces`. The original intermittent Undo failure
remains unexplained and open; passing reruns are not proof of a fix.
There are 296 unique current-runtime passes (the Chromium repeat counts once).
Playwright confirmed 820 remaining cases. Stage 4 (session `42770`) is terminal:
its first case, room slabs across floor switches, exhausted its 60-second total
budget during the second 3D export. The first export and slab checks had passed.
Log: `/tmp/web-thumbnail-fixed-full-browser-4.log`. That multi-export workflow
now uses `test.slow()` (180 seconds), as does the neighboring nested-room case
via its explicit timeout. Geometry, persistence, export and page-error assertions
are retained. No runtime change was made. The same 820 cases, confirmed again
by Playwright, ran in stage 5, session `89669`, now terminal after 48 passes.
Log: `/tmp/web-thumbnail-fixed-full-browser-5.log`. The wall-photo 3D recovery
case never observed an active connected WebGL context within its 15-second
idle check. The trace shows mounted viewer controls and only the deliberately
aborted texture request as a console error. The 3D cases now allow 60 seconds
for the first connected draw before the unchanged 15-second idle check, within
180 seconds overall. Exact retry count, pixel-change and no-input redraw checks
remain. All six focused 3D cases passed in 3.3 minutes across Chromium, Firefox
and WebKit (session `24549`, terminal exit 0;
`/tmp/web-texture-startup-browser.log`). There are 350 unique current-runtime
passes. Stage 6 (session `43409`) is terminal after 24 passes, bringing the
unique current-runtime count to 374. Log: `/tmp/web-thumbnail-fixed-full-browser-6.log`.
The viewer-idle case failed after orbit: one animation callback remained pending
through its 40-second idle check. Trace samples show callbacks continuing to
advance (20 to 169), about four frames per second, rather than a stalled process.
The viewer uses fixed per-frame orbit damping (0.08); investigation must determine
whether slow damping accounts for the failure. The idle assertion is unchanged.
The unchanged Chromium reproduction (session `88961`) also failed; see the
orbit damping fix above. Log: `/tmp/web-viewer-idle-repro.log`. This historical
thumbnail-runtime full suite is stopped.
Inventory: `/tmp/web-thumbnail-fixed-inventory.log`; remaining list:
`/tmp/web-thumbnail-fixed-remaining.txt`. Do not mix prior-runtime passes into
this run. Poll the active handle before competing browser tests or rebuilds.
Full qualification and broader NEXT requirements remain incomplete.

## Unknown-furniture caption regression — September 11

Browser qualification against `87d3c86` stopped after 343 distinct passes.
The unknown-furniture editing test found that the canvas caption displayed the
internal catalog ID instead of the established “Unknown furniture” fallback.
The canvas now supplies a translated caption only for a known catalog entry,
allowing the renderer to retain its unknown-item fallback. This is a production
change: the prior 343 passes do not qualify the corrected runtime.

Type checking passed with zero errors/warnings and the production build passed. Logs:
`/tmp/web-unknown-caption-check.log` and `/tmp/web-unknown-caption-build.log`.
All nine unknown-furniture editing and known-caption localization cases passed
across Chromium, Firefox and WebKit (2.6 minutes), log
`/tmp/web-unknown-caption-browser.log`; session `91439` is terminal.
Full qualification against corrected runtime `b3c7fa6` passed 104 cases, then
the floor-elevation test hit a 10-second 3D readiness wait while loading. That
assertion now allows 60 seconds, with all geometry/reload/stack checks retained.
That continuation passed 52 more cases, then mobile legacy-furniture recovery
reached its 10-second 3D readiness deadline while loading. Both viewport variants
now allow 60 seconds for readiness within a 180-second workflow; recovery-byte,
model-download and editing assertions are unchanged. The next continuation passed
81 cases, then mobile same-ID import recovery reached its 10-second canvas wait
while the 3D viewer was loading. That wait now allows 60 seconds within its
existing 180-second workflow; persistence and copy-isolation checks are unchanged.
Stage 4 ended after 40 passes (277 total on runtime `b3c7fa6`), then the
save-conflict recovery test reached a 10-second canvas wait while loading. Its
readiness wait now allows 60 seconds within a 180-second workflow; all conflict,
backup, copy and reload assertions remain. Session `8168` and all previous
continuations are terminal. Log: `/tmp/web-caption-fixed-full-browser-4.log`.
The 277 passes do not qualify the subsequent thumbnail fix.
Poll the live handle before competing browser tests or production rebuilds.
The previous browser session `27671` is terminal (97 passes in its last stage).
See [the prior qualification report](docs/reviews/2026-09-11-catalog-browser-qualification.md).
Broader NEXT requirements remain open.

## Command-palette furniture names — September 11

Furniture results now react to the selected language and share catalog names
and category translations. Original English names/categories and catalog IDs
remain search aliases; matching stays accent-insensitive. Three focused unit
tests pass, check reports zero diagnostics, build passes, and three browser
engine cases pass (1.5 minutes). The browser flow finds Fogão through `fogao`,
finds Poltrona through Portuguese, English and ID queries, executes with Enter,
and confirms the exported new object still has catalog ID `chair` with unchanged
walls. Full interface/fluent-language review, physical accessibility and wider
NEXT requirements remain open.

## SVG and DXF furniture captions — September 11

Vector furniture labels now use the selected language from both the export menu
and command palette. The exporters accept an explicit locale with English as
the default for existing callers; the DWG-to-DXF fallback passes it through too.
Unknown-item fallback text and source project data remain unchanged.

All 28 focused export/catalog tests pass. The new comparison checks exact SVG
equality apart from translated captions and every DXF tag apart from captions
and freshly allocated entity handles/references, plus unchanged source JSON.
Final production check reports zero diagnostics and build passes. All three
browser engines passed real Portuguese SVG/DXF downloads and before/after floor
equality (1.4 minutes). Other export wording, native CAD-reader review, fluent
Portuguese review, physical accessibility and the wider NEXT backlog remain open.

## Live 2D furniture captions — September 11

The 2D editor passes localized furniture names into the pure caption renderer.
Changing language invalidates the draw scheduler once through a cleaned-up
subscription, so a stationary plan updates without an edit or camera movement.
Unknown catalog entries retain the renderer’s “Unknown furniture” fallback
after the regression fix recorded above. Renderer callers that omit a caption
retain their existing default labels.

Six focused unit tests pass, check reports zero diagnostics, build passes, and
all three browser-engine cases pass (1.5 minutes): actual canvas fillText records
show English→Portuguese→English changes while Settings stays open, with exact
exported floor equality. SVG/DXF label localization, broader export review,
physical accessibility and the wider NEXT backlog remain open.

## Full unit checkpoint after catalog localization — September 11

Source `5980437` passed all **1,034 unit tests in 98 files** (76.05 seconds).
The process finished successfully; no unit runner remains active. This covers the
catalog-name and history-label changes together with the existing unit suite.
The latest scoped browser evidence remains 24 catalog cases and nine Layers/3D/
photo cases; the earlier 1,098-case full browser audit applies to `ddf7d90`.

The naming audit found remaining direct catalog-name reads in
`canvasRenderer.ts` (2D furniture captions), `export.ts` (SVG labels), and
`cadExport.ts` (DXF labels). Extend those deliberately with locale-aware redraw
and export checks while preserving geometry and unknown/source identifiers.
This checkpoint does not close those gaps, fluent review, physical accessibility,
native/device work or release gates.

## Furniture names in Layers and 3D — September 11

Layers, the 3D furniture picker and its placement hint now share the Portuguese
catalog names used by object cards and properties. Unknown identifiers retain
their original text. Three focused unit tests, production check (zero diagnostics)
and build pass. All nine affected Chromium/Firefox/WebKit cases pass (5.0 minutes),
covering translated Layers selection, finish persistence, exact photo bytes and
3D placement with catalog identity and full Undo/Redo export equality.

The first Chromium 3D run exhausted its 60-second deadline during the final Redo
export after earlier assertions passed. Its bounded slow-test allowance is now
180 seconds; the rerun retained every assertion and passed. This is scoped
browser evidence, not a fresh full-suite checkpoint. Fluent Portuguese review,
remaining interface text, physical accessibility and wider NEXT work remain open.

## Portuguese furniture catalog names — September 11

Added display names for all 191 built-in and import-preview catalog IDs. Object
cards, recent items, favorites, hover previews, properties headings and generated
Undo descriptions now use them in Portuguese. Search accepts both original
English names and accent-free Portuguese names. Catalog IDs, dimensions, saved
data, drag payloads and unknown/custom identifiers stay unchanged.

Three focused unit tests pass, including exact catalog coverage and unchanged
catalog/history data. Production check reports zero diagnostics, build passes,
and all 24 scoped Chromium/Firefox/WebKit cases pass (9.8 minutes): category and
bilingual search, keyboard favorites/recent placement, focus, and Portuguese
properties persistence. The full browser suite was not rerun. Remaining naming
surfaces such as Layers and the 3D catalog, fluent Portuguese review, physical
accessibility and the wider NEXT requirements remain open.

## Generated opening and column history labels — September 11

Undo display now recognizes the 15 generated descriptions for supported door,
window and column types and uses the existing localized catalog/type labels.
The lookup enumerates exact known descriptions; unknown types, appended text,
English descriptions and stored history remain unchanged. Eight focused history
tests pass, including real door/window/column actions with exact project/history
preservation assertions. Production check reports zero diagnostics and build
passes. This adds no fresh browser-suite evidence. Furniture catalog descriptions,
broader interface review and physical accessibility remain open.

## Additional built-in history translations — September 11

The display-only Undo map now also translates eight existing descriptions for
furniture stacking order, item details, adding/reusing photos, deleting retained
attachments and locking/unlocking selection. Stored descriptions and unknown
text remain unchanged. Seven focused history unit tests pass; production build
and the explicit-production Svelte check pass with zero diagnostics. No browser
suite was rerun for this string-map extension; the full browser checkpoint below
remains evidence for its named earlier runtime. Dynamic catalog descriptions,
full interface review and physical accessibility remain open.

## Full browser qualification complete — September 11

All 1,098 distinct browser cases in 136 files now pass against runtime `ddf7d90`
after the shared history fixes: 366 cases per engine, with exact inventory
agreement. This was staged qualification after correcting one stale Portuguese
test expectation. All processes are terminal; no browser continuation is active.
The same runtime passed all 1,032 unit tests, check and build. See
[the completed report](docs/reviews/2026-09-11-history-browser-qualification.md).
The broader backlog, physical-device and release gates remain open.

## Undo group lifecycle — September 11 checkpoint

Reproduced unchanged groups clearing Redo and pending groups inserting an old
project into Undo after a replacement project loads. Unchanged groups now leave
history intact; loading clears pending group state and descriptions. Nested
changed groups still commit one action and discard the superseded redo branch.
All 1,032 unit tests in 97 files pass (24.08s), check/build pass without
diagnostics, and 24 Chromium/Firefox/WebKit drag cases pass (3.3 minutes): leaving
elevation during a window drag plus stair, column, text, endpoint, parallel-wall,
curve and room drags with Undo restoration. Physical-device, release and broader
NEXT requirements remain open.

## Multi-step history replay — September 11 checkpoint

Three failing regressions reproduced shifted Redo descriptions after history
jumps (including an existing redo tail), and invalid indices changing project
state. Jumps now preserve each action's state, description and timestamp and
reject noninteger/out-of-range indices before touching history. Intermediate
project states are not published. All 1,029 unit tests in 96 files pass (25.52s),
check/build pass with zero diagnostics, and all 24 bilingual desktop/phone
history browser cases pass (2.4 minutes). This is a fresh full unit checkpoint,
not a full browser-suite or physical-device qualification; broader NEXT scope
remains open.

## Populated mobile Undo History — September 11 checkpoint

Reproduced keyboard focus disappearing when a selected history entry is removed.
History activation now focuses Close after the DOM update, with guards against
a closed panel or focus already moved elsewhere. Check/build pass with zero
diagnostics and 24 bilingual Chromium/Firefox/WebKit cases pass (2.4 minutes).
Populated-panel checks now cover 1440/390px, light/dark text contrast, mobile
overflow entry, Enter activation, Escape dismissal, restored opener focus and
exact exported floor restoration. Existing empty-panel keyboard cases also pass.
Physical touch/assistive-technology qualification and the full native/release
and remaining interface backlog are still open.

## Undo History mobile entry and focus — September 11 checkpoint

Added Undo History to the phone overflow menu. Opening the panel focuses Close;
Escape and Close return focus to the desktop toggle or persistent More actions
button. The panel remains nonmodal. A desktop regression reproduced missing
focus before the fix. Check/build pass with zero diagnostics, and 18 bilingual
Chromium/Firefox/WebKit cases pass (2.1 minutes): empty-panel entry, dismissal,
focus restoration and horizontal bounds at 1440/390px, plus the populated desktop
contrast and exact keyboard Undo/export checks. Populated phone interactions,
physical assistive technology and the wider native/release backlog remain open.

## Undo History contrast — September 11 checkpoint

Darkened faint history metadata and added a readable dark-theme current-state
color and explicit keyboard focus outlines. All six English/Portuguese browser
cases pass across Chromium, Firefox and WebKit (1.7 minutes). They measure at
least 4.5:1 for populated-panel text in settled light/dark themes and activate
the floor-history action with Enter, preserving exact exported floor restoration.
Check reports zero diagnostics and production build passes. This covers the
populated desktop panel; empty-state, phone and physical assistive-technology
qualification and the wider NEXT backlog remain open.

## Undo action descriptions — September 11 checkpoint

Undo History now translates 33 recognized built-in descriptions for English and
Portuguese at display time. Unknown descriptions and stored history remain intact.
Six focused unit tests, check (zero diagnostics), production build and all six
English/Portuguese Chromium/Firefox/WebKit history cases pass. The browser run
took 4.5 minutes with a bounded slow-test allowance after the initial 60-second
deadline expired during the final export; all preservation assertions remain.
Dynamic action descriptions, broader interface/catalog review and physical-device
and release qualification remain open. This checkpoint does not close the backlog.

Updated September 9, 2026. This is the current backlog for the web app and iPhone
companion. It supersedes the historical “next” sections in the
[original review and batch log](docs/reviews/2026-09-05-current-state-and-roadmap.md).
Priorities below are proposed order, not release dates or a claim of complete
Planner 5D parity.

## Computer-switch handoff

For the archived September 8–9 scan/render/video session, start with the
[session handoff](docs/session-handoff-2026-09-09.md). It records the final video
and Blender files, public default-model deployment, open experimental PRs and
native release work that remains.

Start the next session with the native
[new-computer handoff and copyable prompt](https://github.com/laanlabs/openplan3d-ios/blob/main/docs/new-computer-handoff.md).
It records setup, tested state, local data that does not transfer through Git,
and the next bounded implementation batch. The native repository is private and
requires an authorized GitHub account.

Rendering direction: **Blender Cycles on the Mac for finished renders; Three.js
for interactive web previews/editing/walkthroughs**. Share the geometry, camera
and texture preparation pipeline. Start with the full scan dataset and calibration
validator, then the Blender path; keep the existing native preview and web
renderer during that work. Browser path tracing is optional future scope. See
[the rendering plan](https://github.com/laanlabs/openplan3d-ios/blob/main/docs/universal-app-and-rendering-plan.md).
Keep full scans, photo textures, render jobs and outputs local by default.

## Native full-scan v1 dataset slice

The native continuation adds a normative v1 contract, bounded streamed local
scan import/export, corruption/path-traversal regression coverage and explicit
calibration/coordinate metadata. Complete Mac Catalyst and iPhone simulator
suites each pass **82 tests**, including a transferred legacy real scan: all
394 original files / 194 frame pairs retain identical bytes and hashes through
export, independent import and re-export. Private scan content stays out of Git.
See [the native validation report](https://github.com/laanlabs/openplan3d-ios/blob/main/docs/full-scan-v1-validation.md)
and [contract](https://github.com/laanlabs/openplan3d-ios/blob/main/docs/full-scan-v1.md).

All transferred frames remain `legacy-incomplete`. Physical capture with the new
metadata and measured reprojection are still pending. Native issue #8 remains
open for physical calibration, captured-camera rendering and photo texturing.
The native original-scan queue now includes status/cleanup/limits UI, verified
image previews and save dialogs, plus submit/list/cancel/remove/export local
commands. A separate pinned Blender worker supports continuous queue processing,
immutable RoomPlan preparation, cancellation and crash recovery. **91 native tests
ran on each platform with one optional skip and zero failures; 40 renderer checks
and three CLI checks passed**, including real Blender and Swift/Python handoff.
See `docs/native-render-queue-validation.md` in the native checkout. Full-scan
exports also handle macOS ancestor path aliases correctly. Signed worker
packaging, edited-plan adapters and measured photo projection remain open. The next
camera batch now supports validated captured-camera scene attachment, rectangular
renders/native previews and explicit landmark-error reports. **51 renderer checks
passed**, including seven real-Blender cases; synthetic numerical error was below
0.001 px and actual raster-marker error below 0.14 px. See native
`docs/captured-camera-validation.md`. Native captured-frame selection is now
implemented with source-photo thumbnails, unavailable-frame reasons, frozen frame
metadata and local-command support. **96 native tests ran on each platform with
one optional skip and zero failures; 53 renderer checks and four CLI checks passed**.
The native-selected camera completed a Blender render and its verified preview.
See native `docs/native-frame-selection-validation.md`. Photo/render comparison
now adds verified source-photo and opacity-overlay previews while keeping PNG
exports unchanged. **99 native tests ran on each platform with one optional skip
and zero failures**; a fresh native Blender job and all comparison modes passed
live Mac QA. See native `docs/photo-render-comparison-validation.md`. Measured
real-image calibration remains open; legacy metadata is never inferred. Local
frame-quality analysis now adds cancellable detail/exposure/rotation/tracking
hints and optional picker sorting. **103 native tests ran per platform with one
optional skip and zero failures**, plus synthetic Mac UI validation. See native
`docs/frame-quality-ranking-validation.md`. Real-scan ranking validation and
integrated coverage review remain open. A developer visibility stage now samples
full-height geometry across captured cameras, reports occlusion and union coverage,
and records geometric view candidates. Nine real-Blender acceptance cases cover
visibility, concave geometry and bounds. See native `docs/scene-coverage-validation.md`;
native single-camera coverage summaries are now integrated with captured jobs
and receipt-verified preview review. **106 native tests ran per platform with
one optional skip and zero failures**; renderer tests and a fresh native/Blender
UI job passed. See native `docs/native-coverage-review-validation.md`. A native spatial
sample map now adds verified locations, state/surface filters, rotation controls
and a camera marker. **109 native tests ran per platform with one optional skip
and zero failures**, plus renderer and live Mac map checks. See native
`docs/coverage-sample-map-validation.md`. Native combined review now compares
2–16 verified captured frames of the same unchanged scan, with union/overlap counts,
unique contributions and a map with all selected camera markers. **112 native
tests ran per platform with one optional skip and zero failures**; live two-camera
results matched independent counts. See native `docs/combined-coverage-validation.md`.
Quality-aware suggestions now combine verified source-photo hints with coverage
gains and offer a reviewable smaller selection. **115 native tests ran per platform
with one optional skip and zero failures**, plus live ordering/cap/apply checks.
See native `docs/coverage-view-suggestions-validation.md`. Direct developer batch
analysis now prepares RoomPlan once without rendering and preserves every camera
state in a bounded report. All 72 renderer cases passed across host/Blender execution;
synthetic batch output matched both prior single-camera reports. See native
`docs/direct-coverage-batch-validation.md`. Monitored coverage-only queue jobs now
add immutable multi-frame inputs, worker limits, cancellation and verified receipt
recovery. The full 76-case renderer run and final five-case coverage-job suite passed.
See native `docs/coverage-only-queue-validation.md`. Native distinct receipts and
verified batch summary/map review now work in mixed queues. **120 native tests ran
per platform with one optional skip and zero failures**, plus live Mac checks.
See native `docs/native-coverage-batch-review-validation.md`. Native multi-frame
submission now freezes cameras from one scan and records verified photo identities.
**123 native tests ran per platform with one optional skip and zero failures**;
a native → Blender → native job passed with unchanged photos. See native
`docs/native-coverage-submission-validation.md`. Batch subset review now adds
coverage-loss counts, recalculated contributions, selected maps and per-camera
detail. **126 native tests ran per platform with one optional skip and zero failures**,
plus live select/clear/restore checks. See native `docs/coverage-batch-subsets-validation.md`.
Local-command coverage submission now uses the native verification path with
existing list/cancel/remove support. **128 native tests ran per platform with one
optional skip and zero failures; six CLI tests passed**, plus live command/worker/UI
validation. See native `docs/coverage-command-validation.md`. Quality-aware batch
suggestions now verify recorded photos, report coverage omissions and apply a
review-only subset. **131 native tests ran per platform with one optional skip
and zero failures**, plus live ordering/cap/apply checks. See native
`docs/coverage-batch-quality-validation.md`. Per-camera review now measures local
photo detail/exposure at visible wall and floor samples, with explicit edge/proxy
exclusions. **135 native tests ran per platform with one optional skip and zero
failures**, plus live synthetic patch review. See native
`docs/surface-photo-evaluation-validation.md`. Batch suggestions now weight each
measured local patch and keep geometric coverage counts independent; absent patch
scores never inherit global photo quality. **137 native tests ran per platform with
one optional skip and zero failures**, plus live ordering/limit/apply checks. See
native `docs/local-patch-suggestions-validation.md`. New batches now preserve validated
surface normals, and native photo review displays viewing angle and source pixel
density. **140 native tests passed per platform with one optional skip; the pinned
Blender renderer suite completed 78 host tests with 11 skips and no failures.** See
native `docs/surface-projection-geometry-validation.md`. Batch suggestions now combine
local photo quality, incidence cosine and relative
projected resolution, with explicit photo-only mode for older batches. **142 native
tests ran per platform with one optional skip and zero failures**; see native
`docs/geometric-camera-suggestions-validation.md`. A separate developer photo-projection command now bakes a calibrated sRGB PNG into
wall/floor UV islands with per-texel occlusion checks, neutral fallback, UV padding,
coverage mask, packed Blender scene and preview. **84 renderer host tests passed
with 13 delegated skips and no failures**, including actual Blender photo bakes and
renders. See native `docs/photo-projection-prototype-validation.md`. Native queue and
photo-conversion integration, masks, seam handling,
physical ranking validation, continuous heatmaps and measured calibration remain open.
The prototype now combines up to eight calibrated photos using per-texel local
quality, viewing angle and projected resolution, with source identities and a texel
provenance map. **88 renderer host tests passed with 15 delegated skips and no
failures**, including reversed-order atlas equivalence and actual Blender bakes.
See native `docs/multi-photo-projection-validation.md`. Explicit per-photo keep masks
now exclude marked regions with exact dimensions, a two-pixel guard band and recorded
mask identities. **91 renderer host tests passed with 16 delegated skips and no
failures**, plus a visual exclusion check. See native
`docs/photo-exclusion-masks-validation.md`. Automatic semantic detection, mask-authoring
UI, seam blending, native integration and physical validation remain open.
Optional overlap normalization now estimates bounded linear RGB gains from valid
unmasked overlap, with correction/rejection reports and unchanged coverage/source
labels. **94 renderer host tests passed with 16 delegated skips and no failures**,
including actual corrected previews and reversed-order atlas equivalence. See native
`docs/photo-normalization-validation.md`. Physical color validation, global alignment,
seam handling and native integration remain open. Optional UV-island overlap blending
now uses linear light and coverage feathering, preserves masks/neutral fallback and
records all contributing sources. **98 renderer host tests passed with 16 delegated
skips and no failures**, including normalization, mask preservation and reversed-order
atlas equivalence. See native `docs/overlap-blending-validation.md`. Seam handling
across islands, native integration and physical validation remain open.
Rendering stays local: Blender Cycles for finished renders and Three.js for web
previews with shared preparation. This batch changes no web runtime, Firebase
storage/quotas, project-package format or rendering engine.

## Current implementation baseline

Undo History now exposes a translated named region and current-step marker to
assistive technology, and uses semantic timestamps formatted for the selected
language. Zero-error/warning application checking, the production build and six
English/Portuguese browser cases pass across three engines (3.8 minutes). Tests
add a floor, navigate back through history, compare original floor exports and
verify panel close/expanded state. This is scoped verification after the previous
full checkpoint; action-description translation and physical accessibility review
remain open.

**Canvas accessible-name qualification is complete:** all **141 affected cases,
47 per engine**, have passing evidence with exact inventory agreement. The final
116-case continuation passed in 28.5 minutes; no browser process from this batch
remains active. These are staged results across the documented builds, not a
fresh run of the entire browser suite. The current source also passes a fresh
full unit run: **1,025 tests in 94 files**, 125.13 seconds. Application checking
has zero errors/warnings and the production build passed. See the consolidated
[canvas accessibility report](docs/reviews/2026-09-11-canvas-accessibility.md).
The pending-run paragraphs below retain historical checkpoints. Broader catalog
and interface review, physical accessibility/performance, native and release
requirements remain open.

**Firefox canvas qualification checkpoint:** all 47 affected Firefox cases now
have passing evidence, matching Chromium's completed 47. Exact inventory comparison
finds 97/141 passing identities (47 Chromium, 47 Firefox, three WebKit), leaving
44 WebKit cases at this checkpoint. The same continuation remains active in
`/tmp/web-canvas-label-browser-2.log`. Resume it before another build or browser
suite. Full affected-file qualification is still pending.

**Chromium canvas qualification checkpoint:** all 47 affected Chromium cases now
have passing evidence across the initial run, focused room-keyboard rerun and
continuation. Exact identity comparison finds 51/141 total cases passed (47
Chromium, two Firefox, two WebKit), leaving 90. The continuation is still active
in `/tmp/web-canvas-label-browser-2.log` and has moved to Firefox. Keep this
process running; do not rebuild or start another browser suite until it finishes
or fails. These are staged results, not a single fresh run or completed overall
qualification.

**Room-keyboard verification now passes:** all six desktop/phone cases across
Chromium, Firefox and WebKit passed (4.4 minutes) on the rebuilt panel-cleanup
source. Combined with the initial canvas run, 25 distinct cases have passing
evidence. An exact inventory comparison leaves 116 cases; their continuation is
now running in `/tmp/web-canvas-label-browser-2.log`, selected by
`/tmp/web-canvas-label-remaining.txt`. Resume this process before rebuilding or
starting another browser suite. This staged qualification is still incomplete.

**Canvas qualification continuation:** the original 141-case run stopped after
19 Chromium passes when the room-keyboard regression exceeded its 60-second
budget during repeated exports. A focused rerun reproduced the timeout. The test
now has Playwright's bounded slow-test allowance, retaining all assertions. The
first desktop Chromium case passes in 1.4 minutes; the six-case focused run is
still active in `/tmp/web-canvas-room-keyboard-bounded.log`. Resume it before
rebuilding or starting another suite. The remaining affected-file qualification
is not complete; the earlier paragraphs below are historical checkpoints.

UndoHistoryPanel and SettingsDialog now release four store subscriptions when
destroyed, preventing closed editor instances from continuing to receive updates.
Svelte reports zero errors/warnings and the production build passes. The focused
browser run above uses this rebuilt source. Direct memory profiling and completion
of the affected browser inventory remain open.

**Canvas accessible-name verification is in progress.** The drawing canvas now
uses the selected language for its accessible name; English remains unchanged.
Seventeen affected bilingual browser test files now accept either language, and
the desktop/phone canvas-hint cases explicitly require the Portuguese name.
Five dictionary tests, zero-diagnostic Svelte checking and the production build
pass. The 141-case affected-file browser run is still active, with its first ten
Chromium cases passing at this checkpoint. Do not treat this as completed browser
qualification. Resume the existing process and inspect
`/tmp/web-canvas-label-browser.log` before starting another suite or rebuilding.

Remaining version-history diagnostics now translate missing history, changed or
foreign snapshots, unreadable versions and the unchanged-current-plan outcome.
Forty-seven focused unit/dictionary checks, zero Svelte diagnostics and the
production build pass. Nine history browser cases pass across three engines
(1.2 minutes), verifying rejected foreign-project restoration, unchanged project
and history records, recovery download and before/after floor exports. The first
run exposed a test baseline that omitted the legitimate Session start snapshot;
the corrected test waits for it and verifies exact preservation thereafter.
This is scoped verification; other localization and physical/native/release gates
remain open.

The recovery-error gaps listed below now have display translations, and the
version-history panel applies the shared translator. Forty-six focused unit and
dictionary checks pass, Svelte reports zero diagnostics, and the production build
passes. Six history browser cases pass across three engines (1.4 minutes), checking
translated damaged-history guidance, exact backup text, canceled deletion and
successful version restoration. This is scoped verification after the full unit
checkpoint below. Missing-history and failed-restore outcome messages in
`src/lib/stores/versionHistory.ts` remain to be translated; broader gates stay open.

**Fresh full unit checkpoint:** all **1,021 tests in 94 files pass** on `5ca61a4`
with `npx vitest run --maxWorkers=1` (106.30 seconds). This verifies the accumulated
validation/localization batches together. The existing successful check/build and
15 transfer browser cases also apply to this source; the full browser audit remains
the earlier staged checkpoint, not a fresh full browser run.

The next recovery-message gaps are now identified in source: blocked database
upgrades, unreadable legacy libraries and recovery-ID allocation in
`src/lib/services/localDatabase.ts`; save-copy ID allocation and saved-project ID
mismatch in `src/lib/services/datastore.ts`; restored-ID allocation and recovery
archive preservation in `src/lib/services/libraryRestore.ts`; item-detail/retained
state errors in `src/lib/utils/itemDetails.ts`; and unreadable/oversized history
in `src/lib/utils/snapshotStorage.ts`. Their error strings are absent from the
current dictionaries and still need display translation and recovery verification.
These remaining gaps do not change the broader physical/native/release scope.

General project-validation explanations now translate while preserving exact
field paths and unknown details. Forty-three focused unit/dictionary checks,
zero Svelte diagnostics, the production build and 15 transfer browser cases pass
across three engines (2.5 minutes). Mixed-backup verification includes a Portuguese
field error and exact invalid-project bytes in the recovery archive. This scoped
post-audit batch does not close other service diagnostics or physical/native/release
requirements.

The native package bridge's geometry/reference, invalid identity-map and duplicate
identity diagnostics now translate into Portuguese. Thirty-six focused unit and
dictionary checks pass; Svelte reports zero diagnostics and the production build
passes. All 15 transfer browser cases pass across three engines (2.6 minutes),
including rejection of a negative wall height with unchanged saved records and
successful subsequent import. This is scoped post-audit verification; general
project-validator field messages and physical/native/release work remain open.

Package preview notices and service-level attachment/retained-data diagnostics now
translate at display time, preserving filenames and unknown details. Thirty-three
focused unit/dictionary checks, zero Svelte diagnostics, the production build and
15 transfer browser cases pass across three engines (2.6 minutes). Tests verify
missing-attachment rejection, both preview notices, exact original-package
download and retention of unpreviewable image bytes after import. This is scoped
post-audit verification; deeper native-plan validation and broader gates remain.

Package diagnostics now translate the invalid-package prefix, known ZIP/JSON
validation, size limits, unsupported manifests and damaged filenames. Unknown
details remain intact. Thirty focused unit/dictionary checks, zero Svelte
diagnostics, the production build and 15 transfer browser cases pass across three
engines (2.4 minutes). Rejected packages leave records unchanged and a subsequent
valid package imports successfully. This is scoped post-audit verification;
native-plan/attachment-specific validation and package preview notices remain open.

Backup preview warnings now translate known damaged-project/version counts,
missing attachments, recovery archives, unreadable history, mismatched IDs and
unsupported thumbnails. Twenty-three focused unit/dictionary checks, zero Svelte
diagnostics, the production build and 12 transfer browser cases pass across three
engines (1.9 minutes). A mixed-backup restore verifies original downloads and exact
damaged records in the stored recovery archive. This scoped post-audit batch leaves
general project-validator diagnostics and package-specific messages open.

Library-backup validation now translates malformed JSON, unsupported versions,
invalid saved-text sections, empty-backup errors and duplicate-key diagnostics.
Literal key contents remain unchanged. Fifteen service-message unit cases and five
dictionary checks pass, along with zero Svelte diagnostics, the production build
and nine transfer browser cases across three engines (1.7 minutes). Rejected
uploads retain their original downloads and leave project/history records intact.
This is scoped post-audit verification; package-specific validation and preview
warnings remain open. See the localization integration record for evidence.

Restore-library and project-package dialogs now translate known storage failures
together with their retry guidance at display time. Unknown diagnostic details
remain intact. Six focused unit cases, zero-error/warning Svelte checking, the
production build and 12 browser cases pass across all three engines (3.4 minutes).
Quota-injected transfer checks verify unchanged project/history bytes, retained
original downloads and successful retry. This is a scoped runtime change after
the browser audit checkpoint below; other service validation messages and warnings
remain to be translated.

**Browser audit checkpoint:** every case in the expanded inventory has passing
evidence: **1,059 distinct cases, 353 per engine**. The final inventory comparison
found no missing or extra cases. This aggregates staged runs and focused
follow-ups across the documented runtime versions; it is not one uninterrupted
full-suite result. See [the audit report](docs/reviews/2026-09-11-browser-audit.md)
for provenance and limits. That audit checkpoint also has 987 passing unit tests,
zero Svelte diagnostics and a successful production build. Physical-device,
native, performance, usability and release/cost gates remain open.
The paragraphs below retain earlier checkpoints and their then-pending counts.

The ninth audit passed 156 WebKit cases before a test-only IndexedDB observer
raced app hydration and created an empty database. The helper now aborts schema
creation, rejects failed reads and closes connections; transfer tests wait for the
library's ready state. Nine helper/transfer cases pass across all engines
(1.7 minutes), including a direct pre-initialization regression. No runtime code
changed. Combined evidence covers 1,033 of the expanded 1,059 browser cases,
leaving 26 audit cases; physical-device and release gates remain open.

The eighth browser audit added 12 WebKit passes before the phone Layers test
clicked a status control while its horizontal scrolling layer had stale hit-test
positions. A focused reproduction failed on a different toggle. The test now
scrolls each control into view, waits two frames and verifies its click point hits
the control before clicking. All six desktop/phone cases pass (2.6 minutes), plus
three repeated phone WebKit cases (1.0 minute). No runtime code changed. Combined
audit evidence covers 873 of 1,056 cases, with 183 remaining.

All **21 project-opening cases pass** across three engines on the translated
production build (6.6 minutes). The multi-stage same-ID import/reload/3D case now
uses Playwright's bounded slow-test budget after traces showed the default minute
expiring during renderer/screenshot work; all assertions and screenshots remain.
Combined audit evidence now covers 860 distinct cases in the expanded 1,056-case
inventory. The next continuation has 196 cases remaining; physical-device and
release gates remain open.

Project-service translation now has a successful production build and **nine
passing browser cases** across Chromium, Firefox and WebKit (3.0 minutes):
desktop/phone quota-blocked opening, reactive language changes, original-byte
preservation, backup/retry/import and existing save-status localization. The phone
test now opens Settings from More actions. Broader opening qualification remains
pending after one diagnostic-screenshot timeout in the first combined run.

The seventh audit stopped after 577 additional passes on WebKit's native form
Undo grouping. A plain HTML form reproduces its grouped note/numeric-draft Undo.
The keyboard regression now saves/verifies/reloads numeric edits before testing
native text history, explicitly checks historyUndo/historyRedo and exact Redo
text, and retains the final geometry/save/reload assertions. All six desktop/
phone cases pass across three engines (3.7 minutes). Accumulated original-audit
coverage is 846 of 1,050 cases; 204 remain. The seventh run is finished.

Known project-opening and storage diagnostics now translate at display time in
the import alert, save banner, library actions and editor load recovery. English
service diagnostics and unknown detail strings remain intact. Four focused unit
cases pass and Svelte checking reports zero errors/warnings. **Production build
and browser verification of this new localization batch are pending** until the
active seventh audit finishes; that audit still serves the `78d3ad0` runtime.
The separate `project-service-localization.spec.ts` now collects six desktop/
phone-width cases across the three engines for quota-blocked import/New Project,
reactive error language, original-byte preservation, JSON backup, retry and
successful later import. Collection is verified; execution is still pending.
The newly added cases are outside the active audit's original 1,050-case inventory.
Full unit verification of this source now passes **987 tests in 94 files** with
one worker and unchanged timeouts. The initial parallel run had two five-second
timeouts; both passed in the full serial retry. Production/browser verification
of the translation change remains pending behind the active WebKit audit.

The seventh browser audit has now completed Firefox as well: accumulated audit
and focused follow-up evidence verifies **350 Chromium and 350 Firefox cases**.
WebKit is running, with no failure yet in this continuation. The full 1,050-case
qualification and physical-device gates remain open.

Browser audit at `d6e33d1`: the seventh continuation completed the remaining
Chromium cases. The accumulated audit and focused follow-ups now verify all
**350 Chromium cases** in the current 1,050-case inventory. Firefox and WebKit
qualification remains in progress; the seventh run is still active. This is a
Chromium checkpoint, not completion of the full browser or physical-device gates.

Browser audit at `1dfd862`: another 48 Chromium cases passed before the Portuguese
print test expected the obsolete English room count. Its expectation now matches
the Portuguese UI. All three print cases pass (34.2 seconds), retaining paper
ratio, scale rejection, PDF content and translated print-caption checks. No runtime
code changed. Accumulated qualification covers 267 distinct cases; full browser
qualification remains unfinished.

Browser audit at `b9452d0`: the phone group-drag case targeted a stair covered by
the Properties sheet. It now uses Fit selection and asserts the drag starts on
the canvas. All six desktop/phone-width group cases pass across three engines
(16.3 seconds), preserving movement, locked-item and Undo assertions. No runtime
code changed. Accumulated qualification covers 216 distinct cases; the complete
browser suite remains unfinished.

Browser audit at `31f9ba4`: another 47 Chromium cases passed before a Portuguese
phone-layout modal test searched for an obsolete English panel label. Its selector
now follows the current locale. All 12 EN/PT desktop/phone-width modal cases pass
across the three engines (20.9 seconds), retaining cancellation, focus and saved
data checks. The accumulated audit covers 210 distinct cases; full qualification
remains unfinished. No editor code changed.

Browser audit continuation at `ef2feff`: 27 more Chromium cases passed before a
curve-handle drag coordinate failure. The geometry-drag test now lets panel
resize/fit redraws settle before converting world coordinates into pointer
positions. All 21 geometry-drag cases pass across the three engines (46.1 seconds),
including exact Undo/Redo for stairs, columns, text, wall endpoints, parallel walls,
curves and rooms. No editor code changed. The accumulated audit/follow-up evidence
now covers 154 distinct cases; the complete 1,050-case suite remains unfinished.

Browser audit continuation at `c47207e`: 47 more Chromium cases passed before a
save/reload timing failure in the sloped-wall test (102 distinct audit passes so
far). Slope/elevation tests now await completed saves, including the hidden status
text on phone layouts, and await an imported copy before selecting its floor.
All nine slope/elevation cases pass across the three engines (1.5 minutes).
This changes test synchronization only; the full browser audit remains unfinished.

Broader browser audit at `78d3ad0`: the 1,050-case run stopped after 55 Chromium
passes on a room-label coordinate check following a floor switch. The test now
waits for the queued initial fit/redraw before clicking a rendered label, retaining
its exact name and cross-floor checks. Three cases pass, followed by nine repeated
cases across all three engines (37.2 seconds). No runtime change was made.
The complete browser audit remains unfinished; catalog manifest validation passed.

Touch cancellation now releases the mouse pipeline without synthesizing clicks or
double-taps. Drags beyond 10 screen pixels also break the tap chain, including a
drag that returns to its start; ordinary double-taps remain supported. Nine browser
cases pass across all three engines (26.6 seconds), covering synthetic touch
classification, pinch/pan idle behavior and delayed tracing-image floor isolation.
Check/build pass with zero Svelte diagnostics. Actual device gestures remain open.

Follow-up curve hit-testing performance: a conservative bounds check now skips
distant curves before exact projection. Local 400-wall median lookup cost fell
from roughly 0.75ms to 0.002–0.006ms; see the reproducible
[measurement](docs/curved-wall-hit-performance.md) and its scope limits.
All 983 unit tests pass (3.68 seconds), check/build pass, and 21 browser cases
pass across all three engines (1.4 minutes), including curve click/drop, automatic
dimension fit and canvas idle/wakeup behavior. The duplicate visibility label now
distinguishes automatic dimensions from saved dimension annotations in EN/PT.

Latest full web unit checkpoint: **983 tests across 93 files passed** with continuous
curved-wall hit testing and opening positioning (3.82 seconds). Exact-path
projection replaces the 20/40-point sampling used for selection and placement.
Fifteen browser cases pass across all three engines (54.1 seconds), covering
curved opening click/drop, Undo/Redo and curved split persistence. Check/build
pass with zero Svelte diagnostics. Physical gesture/performance qualification remains.

Earlier full web unit checkpoint: **976 tests across 92 files passed** with curved
door/window drag placement (3.84 seconds). Drops now use the closest point on the
quadratic wall path instead of the endpoint chord, retaining the endpoint margin
and drop radius. Nine browser cases pass across all three engines (21.9 seconds),
covering both opening kinds, Undo/Redo and existing catalog interactions.
Check/build pass with zero Svelte diagnostics. Physical touch remains unqualified.

Earlier full web unit checkpoint: **967 tests across 91 files passed** with furnished
room layout corrections (3.82 seconds). Default 400×300cm templates now keep
catalog footprints inside the walls without furniture overlap and apply specified
rotations. Nine browser cases pass across all three engines (20.1 seconds), with
click/drag placement, bedroom rotations, Undo/Redo and save/reopen coverage.
Check/build pass with zero Svelte diagnostics. Circulation, physical-device use
and arbitrary room-size layout adaptation remain unqualified.

Earlier full web unit checkpoint: **960 tests across 90 files passed** with furniture
context-menu mirror and stacking fixes (3.92 seconds). Check/build pass with zero
Svelte diagnostics; six browser cases across Chromium, Firefox and WebKit pass
(21.8 seconds). Mirroring preserves signed scale, and front/back changes now use
Undo history without clearing Redo for unchanged order.

Rotated furniture placement now groups creation and its initial angle into one
Undo entry. Nine browser cases pass across all three engines for zero/30-degree
and wall-snapped placement, exact removal on Undo, restoration on Redo and
save/reopen (33.6 seconds). The wall case checks that snapping overrides the
preview angle and keeps the sofa flush with the wall surface. Check/build passed
for the implementation; physical gestures remain separate qualification cases.

Furnished room-template dragging now places the selected template at the drop
point. Previously the draggable cards emitted a type the canvas did not handle.
Nine browser cases pass across all three engines (19.2 seconds), covering desktop
drag placement/Undo/Redo/save-reopen and existing desktop/phone-width click
placement. Check/build pass with zero Svelte diagnostics. Physical touch dragging
remains unqualified.

Earlier full web unit checkpoint: **958 tests across 90 files passed** with curved
wall splitting (3.65 seconds). Check/build and 12 wall-action browser cases pass
across Chromium, Firefox and WebKit (54.4 seconds), including curved split controls,
opening/room/group preservation, Undo/Redo and save/reopen. Device/release gates remain.

Follow-up curved-split mesh qualification passes in all three browser engines
(three cases, 17.1 seconds). After a toolbar split, exported meshes retain clear
sampled door/window apertures, solid wall at the split and trim along the curve,
including stacked floors and active-floor changes. This checks exported geometry;
pixel-level rendering and physical-device qualification remain open.

Earlier full web unit checkpoint: **955 tests across 90 files passed** at `f54d739`
(3.63 seconds). Three sloped-wall browser cases pass across Chromium, Firefox and
WebKit (22.3 seconds), covering height edits, opening preservation, Undo/Redo,
elevation, save/reload and stacked-3D entry. No runtime changes in this checkpoint;
physical-device and broader release gates remain open.

Earlier full web unit checkpoint: **952 tests across 90 files passed** at `9620cb2`
(3.60 seconds). Six crossing/curved-room browser cases pass across Chromium,
Firefox and WebKit (25.0 seconds), checking exported 3D slab geometry through
stacking and active-floor changes. No runtime changes in this checkpoint;
physical-device, native area agreement and release gates remain open.

Earlier full web unit checkpoint: **949 tests across 89 files passed** with the
unchanged-room update guard (3.62 seconds). Check/build and six room-menu browser
cases at 1440px/390px across three engines pass (26.8 seconds), including Redo
preservation after accepting an unchanged room name. Full release gates remain.

Earlier full web unit checkpoint: **945 tests across 88 files passed** with the
room-deletion metadata fix (3.20 seconds). Check/build and six room keyboard-menu
cases across three browser engines at 1440px/390px pass (24.6 seconds), including
label reset, full deletion and exact Undo. Device/release gates remain open.

Earlier full web unit checkpoint: **943 tests across 87 files passed** at `6a59c00`
(5.66 seconds). Nine existing English browser cases pass across Chromium,
Firefox and WebKit (1.4 minutes): modal keyboard isolation at 1440px/390px,
stored/exported floor preservation, and room-label positioning, reset, drag and
Undo. This integrates the recent context-menu and rename focus changes; full
browser/device/release qualification remains open.

Earlier full web unit checkpoint: **943 tests across 87 files passed** with the
opening-safe wall split change (5.06 seconds). Check/build and nine contextual
wall-action browser cases across Chromium, Firefox and WebKit also pass (52.9
seconds). Splits crossing opening interiors are rejected without mutation; exact
opening-edge splits remain supported. Full browser/device/release gates remain.

Earlier full web unit checkpoint: **939 tests across 87 files passed** at `85f42dc`
(4.48 seconds). Six existing English wall-dimension cases pass across three
engines at desktop/narrow widths (2.3 minutes), retaining connected edits,
opening values, invalid-input recovery, imperial precision and persistence.
See the [localization integration record](docs/reviews/2026-09-10-localization.md).
Full-browser and physical-device qualification remain open.

Earlier full web unit checkpoint: **939 tests across 87 files passed** at `6026e66`
(21.12 seconds). Six existing camera resource cases pass across all engines at
1440px and 390px (2.6 minutes), covering repeated preview/capture/reposition and
2D/3D transitions. See the
[localization integration record](docs/reviews/2026-09-10-localization.md).
Full-browser and physical-device qualification remain open.

Earlier full web unit checkpoint: **939 tests across 87 files passed** at `97e7b2b`
(22.56 seconds). This includes the floor-transition calibration regression. Six
existing English sloped-wall and modal/elevation/3D/print browser cases pass across
all engines (1.8 minutes). See the
[localization integration record](docs/reviews/2026-09-10-localization.md).
Full-browser and physical-device qualification remain open.

Earlier full web unit checkpoint: **938 tests across 87 files passed** at `82aa35f`
(20.05 seconds). Six attachment failure/selection-change cases pass across all
engines (1.1 minutes), checking saved-data preservation, exportable drafts, retry
and cancellation of an obsolete photo decode. See the
[localization integration record](docs/reviews/2026-09-10-localization.md).
Full-browser and physical-device qualification remain open.

Earlier full web unit checkpoint: **938 tests across 87 files passed** at `4cc7a2c`
(24.53 seconds). Six existing English wall-dimension cases pass across all engines
(2.6 minutes), checking desktop/compact connected edits, invalid drafts, imperial
conversion, full-precision undo, persistence and 3D viewer opening. See the
[localization integration record](docs/reviews/2026-09-10-localization.md).
Full-browser and physical-device qualification remain open.

Earlier full web unit checkpoint: **938 tests across 87 files passed** at `31b7486`
(20.85 seconds). Eighteen existing English background-image browser cases pass
across all engines (1.1 minutes), covering initial framing, delayed-image priority
and failed-image fallback at desktop/narrow widths. See the
[localization integration record](docs/reviews/2026-09-10-localization.md).
Full-browser and physical-device qualification remain open.

Earlier full web unit checkpoint: **938 tests across 87 files passed** at `b671dfc`
(4.74 seconds). Fifteen existing English browser integration cases pass across all
engines (3.4 minutes), covering desktop/narrow furniture tint, finish, reload and
resource reuse, plus nested/disconnected floor slabs and active-floor switches.
See the [localization integration record](docs/reviews/2026-09-10-localization.md).
Full-browser and physical-device qualification remain open.

Earlier full web unit checkpoint: **938 tests across 87 files passed** at `dae6421`
(runtime source `950fc36`, 7.02 seconds). Twelve symbol-export browser cases pass
across all engines (1.2 minutes), covering PNG/SVG/PDF image readiness, framing,
embedding and failed-image export handling.
See the [localization integration record](docs/reviews/2026-09-10-localization.md).
Full-browser and physical-device qualification remain open.

Earlier full web unit checkpoint: **938 tests across 87 files passed** at `8b8e707`
after Build tools, opening catalogs and room-choice localization (5.03 seconds).
Twelve English browser cases pass across all engines (1.1 minutes), covering
catalog/recent favorites and RoomPlan/template modal cancellation and focus.
See the [localization integration record](docs/reviews/2026-09-10-localization.md).
Full-browser and physical-device qualification remain open.

Earlier full web unit checkpoint: **938 tests across 87 files passed** at `6efa2a7`
after Layers and canvas-control changes (3.41 seconds). Nine English browser cases
also pass across all engines (1.3 minutes): large-plan zoom at both widths and
sloped-wall edits, reversal, elevation, reload and stacked-view navigation.
See the [localization integration record](docs/reviews/2026-09-10-localization.md).
This does not qualify a full browser suite, physical device or deployment; the
previous intermittent WebKit grid-click observation remains unresolved.

Earlier full web unit checkpoint: **938 tests across 87 files passed** at `7809b06`
after export, view, floor and save-toolbar localization (11.89 seconds). Nine
English browser cases also pass across all engines (1.2 minutes), covering
failed-save/deployment recovery and floor-camera preservation at both widths.
See the [localization integration record](docs/reviews/2026-09-10-localization.md).
This does not qualify a full browser suite, physical device or deployment.

Earlier full web unit checkpoint: **938 tests across 87 files passed** at `e12cff4`
after printed-sheet and typed-notice localization. The English failed-save/reload
flow also passed across all three engines (three cases). See the
[localization integration record](docs/reviews/2026-09-10-localization.md).
This does not qualify a full browser suite, physical device or deployment.

Earlier full web unit checkpoint: **936 tests across 87 files passed** at `31e263d`
after the initial localization batches. The existing English palette/modal-field
flow also passed in all three engines at desktop/phone widths (six cases). See the
[localization integration record](docs/reviews/2026-09-10-localization.md).
This is not a full-browser, physical-device or deployment qualification.

Earlier full web unit checkpoint: **931 tests across 86 files passed** at `faaa9cd`
on September 10, 2026, after texture and furniture download recovery changes.
This is not a full-browser or deployed-release claim; see the
[integration record](docs/reviews/2026-09-10-model-recovery.md).

The user's new priority is a **universal iPhone/iPad/Mac app with local commands
and eventual photo-based RoomPlan rendering**. The native implementation plan is
tracked in [native issue #8](https://github.com/laanlabs/openplan3d-ios/issues/8)
and [the detailed roadmap](https://github.com/laanlabs/openplan3d-ios/blob/main/docs/universal-app-and-rendering-plan.md).
Start with Catalyst and local saved-plan commands, then a portable full scan
dataset with calibrated photographs, a separate local Blender worker, and
measured photo projection/texturing. Native source is in the currently private
companion repository; this is separate from web delivery or an App Store release.
Keep scan photos, intermediate assets and rendering off Firebase by default.
The existing 64 MiB project ZIP is not the full scan dataset format.

The furniture category batch for [#63](https://github.com/laanlabs/openPlan3D/issues/63)
is implemented in both repositories. Package/RoomPlan imports share category
rules, native display aliases recognize web IDs, unknown categories remain
identifiable, and imported stairs have a procedural preview. Source categories,
IDs, fractional dimensions and metadata survive actual native return packages.
See [the batch report](docs/reviews/2026-09-07-furniture-categories.md) and GitHub
PR checks for merge/release status and final browser CI results.

The browser compatibility batch for [#65](https://github.com/laanlabs/openPlan3D/issues/65)
adds the full CI suite to Chromium, Firefox and WebKit, fixes canvas shortcuts
intercepting field editing, and preserves furniture dimensions while replacing
empty/invalid drafts. See [the browser report](docs/reviews/2026-09-07-cross-browser-editing.md)
and PR checks for final engine results and merge/release status.

Local validation: **654 web unit tests**; native dataset work passes **82 XCTest
tests on Mac and 82 on the iPhone simulator**. Production web build and audit pass; type checks report zero
errors and zero Svelte warnings.
Desktop and phone-width browser checks cover labels, editing, persistence and
3D. Native source availability remains separate from TestFlight/App Store release.

Already delivered: storage safety and recovery; connected editing and numeric
dimensions; named-room exports and physical PDF scale; dependency remediation;
floor elevations and sloped walls; direct AI provider configuration; safe imports
and project switching; local tab conflict recovery; IndexedDB migration; full
library backup/restore; two-way local iPhone/web packages; editable item
notes/photos/costs and pooled attachment history; furniture appearance fixes;
category continuity; field keyboard editing and browser-engine CI; camera preview
and 3D resource cleanup; repeatable furnished-home benchmarks and preservation of
3D views during metadata edits; responsive top-down camera framing; onboarding
hints that stay within resized viewports; idle 3D animation cleanup measured in
native Safari; walkthrough timing, held-input recovery and stationary rendering cleanup;
2D drawing on demand with explicit display/image wakeups; modal keyboard protection;
keyboard-accessible library actions with explicit, recoverable rename/delete dialogs.
See [the library actions report](docs/reviews/2026-09-08-library-actions.md) and PR checks
for final browser CI and deployment verification. Earlier batches and pause hashes are recorded
in the dated review log and git history.

## 1. Next engineering batch: device measurements and measured editor work

The deployment check for [#81](https://github.com/laanlabs/openPlan3D/issues/81)
bypasses stale size/mtime validators when reading the version file. Native Safari
confirmed the stale cached response and the fixed editor's unconditional request.
The same polling limits, immutable asset caching and save-before-reload recovery
remain. Real HTTP-cache regressions cover equal-size version replacements and
recovery. See [the report](docs/reviews/2026-09-08-deployment-version-cache.md) and
[#83](https://github.com/laanlabs/openPlan3D/pull/83) for final CI, native Safari
and deployment verification.

The measured resource batch for [#67](https://github.com/laanlabs/openPlan3D/issues/67)
repairs blank reopened camera previews, releases renderer contexts and replaced
scene textures, and disposes/reapplies wall highlights through rebuilds. The
pre-fix browser measurements confirmed retained contexts and texture growth. See
[the resource report](docs/reviews/2026-09-07-viewer-resources.md) and PR checks for
final validation and merge/release status.

The furnished-home batch for [#69](https://github.com/laanlabs/openPlan3D/issues/69)
adds deterministic small/medium/large fixtures, desktop/DPR-2 phone-viewport CI
measurements, and a scene snapshot that avoids rebuilding on project names and
item notes/costs/photos. Geometry, finishes, history and area-unit changes still
refresh. See [the benchmark report](docs/reviews/2026-09-07-rendering-benchmarks.md)
for results and measurement limits; CI software rendering is not a device budget.

The [top-down framing batch (#71)](https://github.com/laanlabs/openPlan3D/issues/71)
fits both screen axes, reserves vertical overlay space, clears pending orbit
motion and includes distant/stacked geometry in the visible depth range. Corner
projection and browser pixel checks cover portrait, desktop and landscape layouts.
See [the framing report](docs/reviews/2026-09-07-top-down-framing.md) and PR checks
for validation and release status.

The [onboarding hint batch (#73)](https://github.com/laanlabs/openPlan3D/issues/73)
tracks viewport changes and measured hint bounds, keeps the dismissal button
visible on short screens, and cleans up animation/timer callbacks. Resizing does
not restart the eight-second timeout; manual and automatic dismissal still retain
seen-tip behavior. See [the hint report](docs/reviews/2026-09-07-onboarding-hints.md)
and PR checks for browser validation and release status.

The [idle-rendering batch (#75)](https://github.com/laanlabs/openPlan3D/issues/75)
replaces continuous orbit polling with requested frames that stop after damping.
Native Safari on M4 Max recorded 1,500 idle callbacks before the change and zero
after it in matched 25-second intervals; a post-orbit repeat also returned to zero.
See [the report and sanitized metrics](docs/reviews/2026-09-07-idle-rendering.md).
The regression checks controls, scene changes, placement previews and teardown in
all three engines. It also fixes the desktop Help button covering Lighting Controls.
These results establish idle behavior, not general FPS or
battery-life targets.

The [walkthrough timing batch (#77)](https://github.com/laanlabs/openPlan3D/issues/77)
uses elapsed animation time and consistent acceleration/coasting, bounds stall
catch-up, and clears input on blur, visibility changes and mode transitions.
Field arrows and both Shift keys have independent behavior. Controlled tests
compare equal-duration movement/look at 30/60/120 Hz and preserve floor-relative
eye height. See [the timing report](docs/reviews/2026-09-07-walkthrough-timing.md)
and PR checks for final browser, native Safari and deployment verification.

The [stationary walkthrough batch (#80)](https://github.com/laanlabs/openPlan3D/issues/80)
stops frame requests after input/coasting settles and wakes for keyboard, mouse,
eye-height and scene changes. Native Safari recorded zero callbacks and rendering
frames in medium/large 25-second stationary samples, down from 1,500 each. See
[the report and numerical measurements](docs/reviews/2026-09-08-walkthrough-idle.md)
for provenance, limits and final PR/CI verification.

The [2D drawing batch (#84)](https://github.com/laanlabs/openPlan3D/issues/84)
replaces idle dirty-flag polling with coalesced redraw requests. Local display,
camera/minimap controls and image completions wake the canvas; late underlays
cannot replace another floor's image. See [the report](docs/reviews/2026-09-08-2d-idle.md)
and [PR #85](https://github.com/laanlabs/openPlan3D/pull/85) for native measurements,
browser regressions and final deployment status.

Next, measure active orbit, stacking and editing on representative desktop/phone hardware and agree
frame-time and memory targets. Use those results to choose shared geometry,
object-level visual updates or mobile quality controls. Extend desktop Safari
checks to actual iPhone/iPad touch devices. The initial small-home native Safari
calibration and initial medium/large stationary walkthrough samples are complete;
repeated active-navigation measurements and physical phones remain. Keep category contract
fixtures in both repositories synchronized when extending the catalog.

The [legacy preview batch (#86)](https://github.com/laanlabs/openPlan3D/issues/86)
refreshes identifiable old chair fallbacks on opening saved projects, JSON and
history copies. Retained native categories determine presentation; edited geometry,
explicit replacements, photos and unknown fields stay intact. Reading leaves raw
library/history recovery bytes untouched, and normal saves retain the existing
category marker. Unsupported or ambiguous retained data remains recoverable;
RoomPlan chairs without a retained source are not guessed. See
[the report](docs/reviews/2026-09-08-legacy-furniture-previews.md) and PR checks for
final browser and deployment verification.

The [modal keyboard batch (#88)](https://github.com/laanlabs/openPlan3D/issues/88)
prevents editing shortcuts from changing a selected object behind an open dialog.
Native dialogs provide focus and background inertness; keyboard guards also cover
window/document listeners, elevation Escape and 3D input. Command actions execute
after their palette closes. Area Summary safely includes imported room categories
it does not recognize and releases its subscriptions when closed.
See [the report](docs/reviews/2026-09-08-modal-keyboard-safety.md)
and PR checks for final browser, Safari and deployment verification.

## 2. Release and Firebase cost gates

Keep [#30](https://github.com/laanlabs/openPlan3D/issues/30) open until all three
remaining gates are verified:

1. **Ship and test the updated iPhone client.** Prepare TestFlight/App Store
   distribution; exercise Files/AirDrop package exchange and real LiDAR/AR
   capture on physical devices; establish older-client compatibility requirements.
2. **Migrate clients, then cut over Storage rules.** Legacy public direct creates
   are still enabled. The staged admission endpoint has quotas, but this bypass
   means there is **no aggregate bucket cap yet**. After migration, deploy the
   reviewed candidate and verify anonymous creates/private ledger access are
   denied while admitted writes, valid links and local file exchange work.
   Candidate rule tests passed; active rules have not been cut over. Follow
   [the migration procedure](docs/handoff-quotas.md), including updating committed
   `storage.rules` so later deployments cannot reopen the bypass.
3. **Agree a monthly budget with a billing administrator.** Include Storage,
   both App Hosting backends and supporting services. Configure/verify alerts;
   the audit account lacks billing-account access and the Budget API was disabled
   at the audit. Alerts notify; they do not enforce a spending cap. Recheck current
   telemetry and retained bytes before changing quotas or retention.

Preserve the low-cost design: ordinary editing, history, backups, photos and full
project-package exchange stay local. Reuse bundled, cacheable catalog assets and
unchanged temporary shares; keep downloads lazy. The endpoint currently bounds
captures to 1 MiB, 100 reservations or 25 MiB per UTC day, and 10 reservations per
minute. Failed writes retain reservations. These limits do not cap downloads or
total spending. Keep the audited one-day inbox lifecycle and seven-day soft delete
unless new measurements justify a reviewed change. Avoid adding a database,
durable cloud copies, sync or media uploads without a cost model and enforceable
quotas. See the [cost audit](docs/reviews/2026-09-05-firebase-cost-audit.md) and
[cost/browser report](docs/reviews/2026-09-05-cost-controls-and-browser-ci.md).

## 3. Remaining quality and fidelity work

These are follow-up work areas, not claims that every item is a reproduced bug.

- **Browser and device coverage:** keep all three CI engines passing; broaden
  the bounded desktop Safari pass and test actual iPhone/iPad touch, gestures,
  downloads/share sheets and storage/quota recovery. Exercise native denied camera access,
  interruption/backgrounding, long scans, multi-floor work and attachment-heavy
  saves. Run a first-room usability session with unfamiliar desktop/iPhone users.
- **3D performance:** keep the measured preview-context and scene-allocation
  regressions passing. The confirmed cleanup defects are addressed in #67/#68.
  Use the new furnished-home benchmarks to agree desktop/phone frame-time and
  memory targets on real hardware. Metadata edits now preserve the scene; visual
  edits still rebuild it. Measure shared geometry, object-level updates and mobile
  quality settings before choosing the next optimization. Stationary walkthrough
  now stops drawing after coasting; preserve mouse, keyboard and scene wakeup
  coverage when changing scheduling. The medium/large stationary Safari samples
  do not establish active-navigation FPS, memory or battery targets. The 2D
  canvas now also sleeps between changes. Preserve tool, touch, image and display
  wakeups when extending the editor; measure active editing cost before selecting
  another rendering optimization.
- **Area/geometry agreement:** define whether area is measured at interior wall
  faces or another boundary, reconcile native raster-based areas with web polygons,
  and test room split/merge identity and schedules. Matching area totals are not
  yet an established cross-platform guarantee.

  Straight and curved wall splitting now updates saved room references while retaining room
  identity, names and finishes. Unit cases include two rooms using different
  portions of a long wall; browser cases verify export, Undo/Redo and save/reopen.
  Dividing/merging rooms themselves remains separate work.

  Splitting a grouped wall now keeps both child segments in the original
  group. Unit coverage checks group copying and exact Undo/Redo; three browser
  cases check membership, geometry and save/reopen (14.1 seconds). Group gesture
  behavior on physical devices remains to be qualified.

  Curved walls now split through exact quadratic subdivision. Opening clearance
  uses each child's curved path, and controls/heights/positions are remapped
  without changing the underlying curve. The existing fixed facet count per wall
  can yield a finer rendered approximation and slightly different estimated area
  after subdivision. Physical gestures and pixel-level visual qualification remain.
- **Building completeness:** implement slabs, stair voids and common roof forms.
  Floor elevations and variable endpoint wall heights already exist. Extend native
  editing/preview fidelity for curves, slopes, elevations, opening styles and
  annotations while retaining unsupported data through package returns.
- **Known package presentation limits:** native previews still use straight,
  uniform-height walls and simplified furniture; one embedded PNG/JPEG/GIF tracing image now maps to the native
  underlay including rotation and optional floor ownership (verified on Catalyst; physical-device qualification remains open). Other imagery
  settings remain retained. Unenclosed native room labels are preserved without
  web room fill. Room ceiling overrides travel as metadata; web wall heights
  continue to govern 3D geometry. Broaden these capabilities deliberately with
  preservation tests. Original unsupported attachment formats remain downloadable;
  web photo previews are bounded JPG/PNG. See the package contract for exact limits.
- **Catalog and rendering quality:** maintain a catalog manifest with source/license
  attribution, real dimensions, scale/origin and platform support. Curate complete
  room sets, improve native furniture visuals, and refine materials, lighting,
  cutaway/dollhouse views, framing, saved cameras and deterministic render/export
  quality. Current finishes are visual controls, not physical material simulation.
- **Localization and usability:** revive English/Portuguese localization from
  closed community [PR #15](https://github.com/laanlabs/openPlan3D/pull/15) as a
  focused string-system change. The typed store, Settings, library/recovery,
  editor controls and property panels, and major 3D controls now have translated
  interfaces with scoped browser checks. Remaining catalog text and service
  errors, full interface review and physical accessibility qualification remain
  open. See the
  [localization record](docs/reviews/2026-09-10-localization.md). Recheck first-use navigation, dense toolbars,
  readable labels, accessibility and touch property editing. Earlier interaction
  fixes are already merged; reproduce any remaining problem before changing them.

## 4. Longer-term Planner 5D parity

- Controlled local custom GLB/model import and bounded texture assets, then other
  formats as justified; retain provenance, size limits and safe failure behavior.
- Editable floor-plan recognition, scan repair and layout assistance with results
  users can review. AI images remain separate from authoritative measured geometry.
  Direct AI providers already exist; do not revive the unrestricted hosted proxy
  from the original community proposal.
- Read-only sharing, optional account-backed sync, comments/permissions and
  concurrent editing with explicit offline/conflict/recovery behavior. These are
  not implemented cloud features. Start only after the cost gates above; consider
  self-hosting/user-supplied storage for durable large libraries.
- Consistent room schedules, quantity budgets, shopping lists and moodboards.
  Existing item notes/photos and entered costs provide the starting data.

## 5. Repository and release maintenance

- `FEATURES.md` now provides implementation scope linked to regression coverage;
  `COMPARISON_REVIEW.md` is explicitly historical. README links the matrix and
  package import/export contract and uses the catalog source instead of a stale
  item count. CONTRIBUTING.md, fixture-oriented issue/PR templates and the release
  evidence checklist are now available. Continue maintaining these with behavior
  changes; historical findings are not current release status.
- The seven remaining Svelte warnings are resolved in the local keyboard/component
  cleanup batch: native favorite buttons, protected control activation/Tab, explicit
  inline-editor focus, reactive menu bounds and removal of the retired material
  picker. See [the validation report](docs/reviews/2026-09-09-editor-keyboard-cleanup.md).
  Keep zero-warning type checks passing. The local WebKit modal failures were
  traced to default Backspace navigation on buttons and are fixed; text deletion
  remains native in editable fields. The CI artifact actions use pinned Node 24
  releases; continue dependency auditing.
- The native root README documents setup, both targets and bundle identities;
  its computer handoff now separates current resume guidance from historical
  instructions. Repository publication/licensing and final release branding still
  require project decisions. Review the current iOS 26.2 minimum before distribution;
  lowering it requires an API-availability audit and device testing.

## Resume checklist

1. Fetch both repositories and confirm clean `main` against `origin/main`; reread
   open GitHub issues and #30 for release updates. Start a focused `codex/…` branch
   from current main after checking the browser batch merge status.
2. Broaden furnished-home hardware calibration and device coverage; measure active
   orbit, stacking and editing before selecting another rendering optimization. Preserve unknown fields,
   explicit clears, independent import copies, fractional transforms and pooled
   local attachments. Do not rely on temporary QA directories as source artifacts.
3. Web baseline: Node 24/npm; run `NODE_ENV=production npm run check`,
   `NODE_ENV=production npm test` and `NODE_ENV=production npm run build`.
   Finish check before starting build; both regenerate SvelteKit artifacts.
   Production browser workflows run in GitHub CI with cloud uploads/analytics
   disabled. Use the approved browser-control tools for local interactive QA.
4. Native baseline: `openPlan3d.xcodeproj`, scheme `FloorPlan`, Debug simulator
   tests with `CODE_SIGNING_ALLOWED=NO`. Select an available simulator; rerun
   actual native return-package fixtures when the contract changes. Complete
   physical-device release checks separately.
5. Keep documentation/issues aligned with results, merge only after relevant
   checks, verify deployment for application changes and remove merged branches.
   Browser QA projects are local browser data, not source-controlled project files.

Native photo preparation now verifies completed coverage-job source bindings and
converts JPEG/HEIC/PNG into sRGB projection inputs, preserving dimensions and raw
camera precision with separate original/derived hashes. **145 native tests per
platform passed with one optional skip and zero failures.** A native-generated
fixture also completed a pinned Blender bake; **99 renderer host tests passed with
16 delegated skips and zero failures**. See the native repository's
`docs/native-projection-photo-validation.md`. Native export UI, supervised photo
projection jobs and physical/held-out validation remain open.

Native coverage review can now export selected cameras as a bounded, streaming
projection ZIP. The Blender prototype accepts the extracted package, verifies all
file identities and records original/derived provenance. A two-camera package
saved through the isolated Mac QA app completed a real bake. **145 native tests per
platform and 103 renderer host tests passed with expected skips and zero failures.**
See the native
repository's `docs/native-projection-export-validation.md`. Supervised projection
jobs, native result review/masks, inter-island seams and physical validation remain.

The native photo prototype now samples diagonal triangle texels at their covered
area's centroid, removing 144 unresolved edge samples in the exported QA scan.
Neutral pixels in a fixed top-wall band fell from 539 to 3 while strict visibility
and exclusion checks remain. **104 renderer host tests passed with 17 delegated
skips and zero failures.** See the native repository's
`docs/triangle-boundary-sampling-validation.md`. Broader seams, coarse atlas
coverage boundaries and physical fidelity remain unverified.

An independent photo-result verifier now binds native-package bakes to expected
input identities/settings and validates artifact hashes, PNGs and map/count
consistency. It emits a compact receipt for future supervision without opening the
Blender scene. See the native repository's `docs/projection-result-verification.md`.
**109 renderer host tests passed with 17 delegated skips and zero failures.**
Native projection queue/result review and physical fidelity remain open.

Photo projection now runs through the shared serial queue with frozen packages,
resource limits, cancellation, orphan-worker exit and independently verified
publication/recovery. The native queue lists and cancels the distinct job kind.
**146 native tests per platform and 114 renderer host tests passed with expected
skips and zero failures.** See the native repository's
`docs/projection-queue-validation.md`. Native submission/result review, supervised
masks, seams and physical validation remain open.

Native coverage review now submits photo projection jobs directly, with selected
cameras, texture detail and optional exposure matching/blending. A live Mac UI
submission completed in the worker without ZIP export or CLI submission.
**146 native tests per platform and 115 renderer host tests passed with expected
skips and zero failures.** See the native repository's
`docs/native-projection-submission-validation.md`. Native result/map review, masks,
seams and physical validation remain open.


Native completed projections now have verified preview, atlas, coverage and colored
source/contributor map review with frame legends. The reader binds frozen inputs,
receipts and artifacts and recounts map pixels before displaying results.
**151 native tests per platform passed with one optional skip and zero failures.**
All five image choices and scrolling legends passed synthetic Mac UI review.
Renderer code is unchanged at 115 host tests with 17 delegated skips. See the native
repository's `docs/native-projection-review-validation.md`. Native masks/export,
preview-space coverage/confidence overlays, seams and physical validation remain.


Projection preview review now includes a frozen source-photo comparison and
opacity overlay. Native readers reverify the preview camera's photo before use;
151 tests per platform pass with one optional skip and zero failures. Synthetic
Mac UI checks cover source, projection and 0/50/100% opacity. This is a contributing
camera comparison; held-out measurements and coverage/confidence overlays remain.


New projection jobs now render a verified camera-space coverage pass, displayed
in native review with an opacity slider. White denotes observed atlas samples;
black denotes unobserved samples or proxies; background is transparent. The saved
appearance scene is preserved. **152 native tests per platform passed with one
optional skip; 116 renderer host tests passed with 17 delegated skips, all with
zero failures.** Live Mac overlay endpoints passed. See the native repository's
`docs/camera-coverage-overlay-validation.md`. Confidence estimates, native masks,
seams and physical/held-out accuracy remain open.


Supervised projection jobs now accept camera-bound CLI masks, freeze their bytes,
reserve their disk space and verify them before execution and recovery. Native
review verifies the mask bindings and labels masked source cameras. **153 native
tests per platform passed with one optional skip and zero failures.** Renderer
validation covered 118 host tests with 17 delegated skips; two environment timeouts
and a corrected recovery assertion passed isolated rechecks with unchanged limits.
Live Mac review confirmed the excluded camera contributed zero samples. See the
native repository's `docs/supervised-projection-masks-validation.md`. Native mask
authoring/submission, confidence, seams and physical accuracy remain open.


Native projection submission now supports per-camera PNG mask selection,
validation, thumbnails, replacement/removal and frozen job submission. Updated
workers advertise mask support; older connected workers are rejected for masked
jobs. **154 native tests per platform passed with one optional skip and zero
failures; 24 worker lifecycle/capability tests passed.** A native-created masked
job completed in Blender and reopened in review. See the native repository's
`docs/native-mask-submission-validation.md`. Brush/polygon mask authoring,
confidence, seams and physical accuracy remain open.


Native brush mask drawing now supports Exclude/Restore, adjustable diameter,
Undo/Reset and editing selected masks over verified source photos. **156 native
tests per platform executed with one optional skip and zero failures**; focused
checks passed again after canonicalizing generated PNG metadata. A native-drawn
mask passed the independent worker decoder, completed in Blender and reopened in
native review with 2,398 projected samples. See the native repository's
`docs/native-mask-drawing-validation.md`. Polygon tools, imported PNG metadata
consistency, confidence, seams and physical validation remain open.

Native imported and directly submitted masks now normalize to worker-compatible
binary RGBA PNGs, removing unsupported metadata while preserving pixel positions.
Rotated and animated masks are rejected. **158 native tests per platform passed,
with one optional skip and zero failures**, plus independent worker decoding of
the prepared fixture. See the native repository's
`docs/native-mask-compatibility-validation.md`. Polygon authoring, confidence,
seams and physical/release validation remain open.

Native polygon mask authoring now supports click/tap vertices, fill previews,
Exclude/Restore, point undo/clear and mixed brush/polygon edits. **161 tests per
native platform passed, with one optional skip and zero failures**. Independent
worker decoding confirmed source coordinates; a native job completed in Blender
with 2,336 projected samples and reopened in review. See the native repository's
`docs/native-polygon-mask-validation.md`. Zoom/pan, automatic semantic masks,
confidence, seams and physical/release validation remain open.

Native mask editing now supports 1×–8× zoom, Move mode and Fit while preserving
source-pixel alignment for brushes, saved masks and unfinished polygon outlines.
**164 tests per native platform passed, one optional skip and zero failures**;
independent worker decoding and live Mac checks covered coordinate alignment and
saving/reopening. See the native repository's `docs/native-mask-zoom-validation.md`.
Full-size image memory measurements, physical gestures/accessibility, automatic
semantic masks, confidence, seams and physical/release validation remain open.

Native mask editing now checks the entire work budget before decoding or
rasterizing. Oversized-polygon rejection dropped from 69.642s to 0.009s on Mac
and 56.061s to 0.003s on iOS in local debug runs. **165 tests per native platform
passed, one optional skip and zero failures**; representative output PNGs remain
byte-identical and pass worker decoding. See the native repository's
`docs/native-mask-work-preflight-validation.md`. Accepted-history performance,
maximum-image memory, physical input/accessibility, confidence, seams and release
validation remain open.

Verified projection diagnostics now measure color jumps at source-camera changes
within UV islands, separately from same-source image edges. Reports include
linear RGB metrics, frame identities and bounded atlas-coordinate examples;
missing boundaries produce unavailable metrics. **20 renderer tests ran with four
delegated skips and zero failures**. The native fixture lacks eligible source-change
edges, so an overlap fixture is still required for seam comparisons. See the native
repository's `docs/projection-source-boundary-validation.md`. Seam correction,
inter-island measurements, confidence and physical validation remain open.

A calibrated synthetic overlap fixture now creates camera-source boundaries using
the actual Blender bake. Four-texel blending reduced mean linear RGB difference
across 42 boundary pairs from 0.497558 to 0, preserving 812 observed texels and
source labels. PNG reports and captured-camera previews were checked. **13 tests
passed, including four in pinned Blender, with no skips/failures**. See the native
repository's `docs/overlap-seam-fixture-validation.md`. Textured overlap, partial
FOV/mask edges, inter-island seams, confidence and physical validation remain open.

The synthetic overlap study now includes known texture, exposure mismatch and
partial/shared masks. Normalization reduced blended reference intensity error
from 0.072231 to 0.002218 and boundary gradient residual from 0.018639 to 0.003201,
with 781 observed texels preserved. Raw boundary contrast rose with restored
texture, so it cannot serve as a standalone quality score. **13 tests passed,
seven inside pinned Blender, with no skips/failures**. See the native repository's
`docs/textured-overlap-validation.md`. Real photos, FOV/inter-island seams,
confidence and physical/release qualification remain open.

The overlap fixture now validates narrow camera fields of view against analytic
wall/frustum intersections. Normalization preserves 641 observed samples while
reducing reference error from 0.071994 to 0.001168; combined FOV/masks preserve
615 samples and reduce error from 0.071347 to 0.001244. **17 tests passed, ten
inside pinned Blender, with no skips/failures**. Independent PNG checks reproduced
all four study reports. See the native repository's
`docs/field-of-view-overlap-validation.md`. Real photos, inter-island seams,
non-planar/occlusion cases, confidence and physical/release validation remain open.

Topology-based island diagnostics now pair observed samples across actual shared
coplanar mesh edges in separate UV tiles. The study excludes creases, overlapping
or disconnected geometry and missing coverage, and exports reproducible topology.
Normalization reduces the fixture's shared-edge reference residual from 0.007316
to 0.001659 with unchanged coverage. **16 tests passed, eleven inside pinned
Blender, no skips/failures**. See the native repository's
`docs/shared-island-boundary-validation.md`. Seam correction, cross-mesh matching,
native topology/review integration, confidence and physical validation remain open.

## Local Three.js render test

An isolated `/render-lab` route now supports local GLB loading, interactive
preview and progressive GPU path tracing with spatial noise reduction. A private
Blender photo-study scene was exercised locally; its model and media remain out
of this repository. See [setup, verified results and limits](docs/render-lab.md).
The render-lab batch passed 653 unit tests and a production build. The subsequent
keyboard cleanup passes 654 unit tests with zero type errors or Svelte warnings.
Desktop camera presets, mode switching, pause and PNG export were exercised.
This remains a test branch: finish material baking, browser/device qualification
and shared scene integration before replacing
any viewer. Physical-device capture and measured reprojection remain pending.

## Native edited-floor render export — 2026-09-09

The native editor now exports its current floor as portable neutral scene JSON
for the existing Blender CLI worker. Wall openings and transforms reuse the
native preview; furniture is represented by boxes. Five targeted tests passed on
each of Mac Catalyst and the iOS simulator, with no failures or skips. A native
fixture rendered successfully in pinned Blender and its input/output hashes and
PNG were checked. See `openplan3d-ios/docs/edited-plan-render-export-validation.md`.

Source-to-edit camera alignment remains open. This does
not qualify physical export interaction or real-photo accuracy.

The follow-up slab correction now bounds native preview/export floors around full
transformed geometry, including rotated furniture and wall thickness. Labels no
longer enlarge furniture-only slabs. Both regressions failed before the fix;
seven edited-scene tests pass on each native platform after it, with zero failures
or skips. A verified Blender render confirms full furniture support. These remain
rectangular envelopes; room-outline and structural slab fidelity are still open.

The Mac editor now also provides **Render This Floor…** for direct native queue
submission of current edits, including unsaved changes. The normal worker,
budgets, receipt verification, native result preview and PNG save flow apply.
An isolated UI check rendered an unsaved table and saved the verified PNG while
saved plan/original room hashes stayed unchanged. Native-to-Python-to-native
verification also rejected deliberate frozen-input tampering. See
`openplan3d-ios/docs/native-edited-floor-queue-validation.md` for exact validation.

Queue/geometry runs covered 33 tests per native platform with zero failures and
one opt-in skip each. Final focused runs passed all five edited-floor queue tests
on both platforms without skips, including disk/job budgets and verified external
worker output with tamper rejection.

## Portable web render scene — 2026-09-09

The 3D viewer now offers **Export Blender Scene**, converting displayed active or
stacked floor meshes into the shared metre/Y-up scene contract. It reuses viewer
geometry, transforms and loaded furniture; neutral export omits window panes,
ceilings, labels and camera helpers. Mesh/vertex/triangle/file budgets reject
unsupported inputs with a visible message. See [validation and usage](docs/portable-render-scene.md).

**660 unit tests, five browser checks, Svelte checks and the production build
passed.** Desktop/phone exports in Chromium and WebKit were byte-identical. Both
actual active/stacked downloads rendered in pinned Blender, with verified scene
and PNG hashes and visually checked results. Editable backup dimensions stayed
unchanged. Browser testing caught and fixed an overlap with Undo History.

Next: direct browser-to-native queue handoff, material baking and further
inactive-floor fidelity, camera alignment and physical/release qualification.
This is a neutral snapshot adapter, not a completed replacement for either viewer.


### Curved web wall openings — 2026-09-09

Curved walls now cut door/window apertures in active and stacked floors. Active
trim and glazing follow the curve; baseboards clear doorways. Saved dimensions
remain unchanged. Exported-triangle testing also caught and fixed a rounding
sliver that blocked a window at a facet join.

**665 unit tests, six Chromium/WebKit browser checks, Svelte checks and production
build passed.** Actual active/stacked downloads rendered in pinned Blender with
independently verified scene/PNG hashes and visually checked results. See
[validation](docs/curved-wall-openings-validation.md). Facet joins, inactive slab
and trim fidelity, native curves, material baking and queue handoff remain open.


### Room-shaped web preview slabs — 2026-09-09

Active and inactive floors now use shared closed 5 cm slabs under resolved room
polygons. Stacked slabs preserve concave recesses and gaps between disconnected
rooms instead of filling the wall bounding rectangle. Unenclosed walls no longer
invent an upper-floor slab. Source dimensions and room finishes remain intact.

**667 unit tests, eight Chromium/WebKit browser checks, Svelte checks and the
production build passed.** Browser rays verify support and clear gaps through
active-floor switches. The actual stacked export rendered in Blender with
independently verified scene/PNG hashes and a visually checked result. See
[validation](docs/room-slab-validation.md). Curved room boundaries, stair/courtyard
voids, editable slab thickness, wall-face offsets and native slab fidelity remain
open; the export's separate rectangular ground support is unchanged.


### Curved room boundaries and derived areas — 2026-09-09

Room detection and polygons now follow the viewer's 16-facet quadratic wall path,
so fills, floor finishes and slabs reach the curved boundary. Derived area uses
that same centreline polygon. Source wall IDs retain room names and finishes;
T-junction room splits and a room enclosed by a curve plus a straight wall are
covered. Source dimensions remain unchanged.

**671 unit tests, six Chromium/WebKit browser checks, Svelte checks and production
build passed.** The actual stacked download rendered in Blender with independently
verified scene/PNG hashes and visual inspection. See [validation](docs/curved-room-boundaries-validation.md).
Exact analytic/interior-face areas, crossing-wall topology, courtyard/stair voids,
slab authoring and native curved-room fidelity remain open.


### Crossing-wall room topology — 2026-09-09

Room detection and polygon reconstruction now split nonparallel wall crossings
in the derived graph, including intersections between curved wall facets and
straight dividers. Source walls remain intact. Overhanging crossing dividers
resolve four separate rooms and matching slabs, with names/finishes retained by
source boundary IDs.

**674 unit tests, six Chromium/WebKit browser checks, Svelte checks and production
build passed.** Actual exported slab geometry passed both-floor switching checks;
the stacked download rendered in Blender with verified scene/PNG hashes and
visual inspection. See [validation](docs/crossing-room-boundaries-validation.md).
Collinear overlaps, duplicate walls, ambiguous boundary-ID sets, courtyard/stair
voids and native topology/area agreement remain open.


### Duplicate and overlapping room boundaries — 2026-09-09

Coincident split segments now form one derived graph edge retaining every source
wall ID. Partial collinear overlaps and duplicate dividers preserve room polygons
and source boundary identity across input order changes. Saved room metadata
matches expanded aliases, so adding a duplicate/partial overlap retains names
and finishes; ambiguous saved matches are left unmatched. Editable walls and
viewer wall meshes remain intact.

**677 unit tests, six Chromium/WebKit browser checks, Svelte checks and production
build passed.** Browser exports preserve four room slabs on both floors across
active-floor switches. See [validation](docs/overlapping-room-boundaries-validation.md).
Repairing overlapping wall solids, ambiguous face identity, courtyard/stair voids,
native topology/area agreement and device performance qualification remain open.


### Reuse derived room graphs during 3D builds — 2026-09-09

Active and stacked 3D builders now resolve room metadata and polygons together,
reusing one ephemeral graph per floor. The large furnished fixture previously
rebuilt the same floor graphs 51 times per stack; it now builds them three times.
No persistent cache is introduced, and in-place edits remain fresh.

Local Node measurements reduced median large-fixture room computation from
2.402 ms to 0.393 ms, about 84%, with matching output. **679 unit tests, six
Chromium/WebKit browser checks, Svelte checks and production build passed.** See
[method, limits and raw samples](docs/room-geometry-reuse-validation.md).
This does not establish browser FPS or device budgets; representative active
navigation, full scene construction, memory and phone measurements remain open.


### 2D room polygon reuse — 2026-09-09

The editor now shares detected room polygons across fills, labels, hit tests,
rename placement and furniture-room dimensions. Floor/geometry changes refresh
the polygons and room IDs together; unchanged redraws do not rebuild each room's
graph. **680 unit tests, ten Chromium/WebKit browser checks, Svelte checks and
production build passed.** See [validation](docs/canvas-room-polygon-reuse-validation.md).

A browser regression exposed a separate usability issue: selecting a room can
open the properties panel and move the canvas between the two clicks of a direct
double-click, causing the adjacent room to receive it in WebKit. Selection then
rename at the updated position works and is covered. The native mouse layout interaction is addressed in the subsequent double-click batch;
active-editing/device measurements and broader performance qualification remain open.


### Double-click target survives sidebar resizing — 2026-09-09

Native Select-mode double-clicks now keep the first press's floor coordinates
and skip second-press reselection after a sidebar moves the canvas. Room rename,
text editing and wall splitting use that original point. Other drawing modes,
ruler behavior and synthetic touch paths retain their existing handling.

The direct Room 1,1 double-click that previously opened Room 2,1 in WebKit now
passes without the preselection workaround. **680 unit tests, eight Chromium/WebKit
browser checks, Svelte checks and production build passed.** See
[validation](docs/room-double-click-validation.md). Physical double-tap/device
qualification and broader active-editing performance work remain open.


### Room label placement, reset and undo — 2026-09-09

The 2D renderer, hit testing and inline rename now share the saved label anchor.
Dragging visibly moves the text; room geometry and dimension annotations stay
fixed. An explicit Reset Label Position context-menu command replaces an invisible
reset hit region. Clicks no longer commit offsets from stale pointer coordinates;
actual drags use screen deltas and an independent undo group, preserving separate
reset/drag undo steps even when performed quickly.

**680 unit tests, ten Chromium/WebKit browser checks, Svelte checks and production
build passed.** Tests verify saved offsets, reset, dragging, rename placement,
undo, direct rename across floors, idle/wakeup and simulated touch. See
[validation](docs/room-label-placement-validation.md). Physical touch/long-press,
other export/viewer label conventions and active-editing budgets remain open.


### Room label offsets in plan exports — 2026-09-09

PNG, SVG, PDF and DXF now preserve saved room label positions. Framed exports
include name/area text bounds even outside the walls. PNG and the PDF plan raster
retain up to 2x scale with a 4096-pixel longest-side cap, preventing distant labels
from causing unbounded canvas allocations.

**682 unit tests, two Chromium/WebKit browser checks, Svelte checks and production
build passed.** Actual downloads verify SVG text bounds, PNG dimensions, DXF
coordinates and PDF serialization; the PNG was visually inspected. See
[validation and limits](docs/export-room-label-validation.md). PDF page-layout
qualification, curved geometry/export fidelity, native label conventions and
physical-device downloads remain open.


### Curved wall strokes and bounds in plan exports — 2026-09-09

PNG/PDF/SVG now draw quadratic wall curves; DXF uses the viewer's 16 facets.
Export bounds include exact quadratic extrema and wall thickness, preventing
curves or thick strokes from clipping. Dimensions use path length and sit outside
curved strokes. Source geometry remains unchanged.

**685 unit tests, four Chromium/WebKit browser checks, Svelte checks and production
build passed.** Pixel tests verify the curved stroke and empty former chord;
SVG/DXF checks cover geometry and PDF downloads serialize. The final PNG was
visually inspected, including the dimension placement. See
[validation](docs/curved-wall-export-validation.md). Curved opening symbols/gaps,
DXF facet joins, PDF layout and native/device export fidelity remain open.

### Curved door/window plan exports — 2026-09-09

PNG/PDF/SVG now clear the curved wall interval beneath doors and windows; symbols
span the actual quadratic jambs and clip at curved wall ends. DXF cuts opening
intervals from straight and faceted wall outlines. Saved dimensions are unchanged.

**688 unit tests, six Chromium/WebKit browser checks, Svelte checks and production
build passed.** The exported PNG was visually inspected. See
[validation](docs/curved-opening-export-validation.md). DXF joins, PDF page layout,
all-symbol overlap cases and native/physical-device export qualification remain open.

### Joined DXF curve facets — 2026-09-09

DXF now emits a continuous wall outline between openings instead of separate
rectangles for every curve facet. Offset-line intersections preserve thickness;
bounded miter/bevel joins avoid sharp-bend spikes. Door/window intervals still
split outlines, and saved geometry is unchanged.

**691 unit tests, four Chromium/WebKit export checks, Svelte checks and production
build passed.** See [validation](docs/dxf-wall-outline-validation.md).
Joining separate source walls, self-overlap unions, third-party CAD qualification,
PDF layout and native/device export parity remain open.

### PDF room schedule pagination — 2026-09-09

Room schedules now wrap text to column widths and add pages before reaching the
footer. New pages repeat headings; totals and summary stay together. This fixes
large schedules running off-page and names silently truncated at 30 characters.

**Two Chromium/WebKit export checks, eight export unit tests, Svelte checks and
production build passed.** The full unit run had one unrelated timeout, which
passed separately. All four schedule pages in the 32-room PDF were rendered and
visually reviewed; text/geometry inspection verified complete names and footer
clearance. See [validation](docs/pdf-schedule-validation.md). Long title-block
metadata, Unicode fonts, extreme-plan readability, optional 3D layout and physical
printing remain open.

### PDF main 3D canvas selection — 2026-09-09

PDF export now selects the explicitly marked main ThreeViewer canvas, skips lost
WebGL contexts, and no longer probes unrelated canvases or substitutes the last
2D canvas. This prevents misleading optional 3D pages.

**Four Chromium/WebKit checks, Svelte checks and production build passed.**
694 unit tests were covered across the full run and the corrected document-stub
rerun. The exported 3D page was rendered and visually checked. See
[validation](docs/pdf-3d-source-validation.md). Blank-frame detection, serialization
failure handling, extreme aspect ratios and broader PDF/native fidelity remain open.

### Optional PDF capture failure recovery — 2026-09-09

If optional 3D capture or image encoding fails, PDF export now removes unfinished
pages before saving the completed plan and schedule. Previously, failures after
page creation could leave a blank perspective page.

**13 export/real-jsPDF tests, two Chromium/WebKit download checks, Svelte checks
and production build passed.** Tests cover tainted capture and invalid PNG data,
including failure after the optional page was added. See
[validation](docs/pdf-capture-recovery-validation.md). Required plan-image failures,
blank-frame detection, error messaging and native parity remain open.

### PDF export outcome notices — 2026-09-09

Toolbar and command-palette PDF exports now share dismissible feedback for
required preparation failures, empty floors and omitted optional 3D captures.
Complete exports clear stale notices. Failed preparation no longer escapes the
entry point as an unhandled error; the message offers retry/JSON-copy guidance.

**15 targeted tests, two Chromium/WebKit browser checks, Svelte checks and
production build passed.** Both export entry points were tested with a forced
plan-image failure and no download. See
[validation](docs/pdf-export-notice-validation.md). Blank-frame detection, remaining
PDF typography/layout, native feedback and non-PDF error handling remain open.

### Main-view 3D PNG capture — 2026-09-09

Toolbar 3D PNG export now waits for the main viewer's first rendered frame,
encodes only that canvas, and reports failure. Readiness and encoding use separate
bounded waits; duplicate requests are disabled. Automatic 2D switches restore 2D
after success or failure, and stale project/floor downloads are prevented.

**Eight capture tests, two Chromium/WebKit checks, Svelte checks and production
build passed.** The actual PNG was visually reviewed. See
[validation](docs/png-3d-capture-validation.md). Full asynchronous asset readiness,
blank-frame checks and broader device/camera qualification remain open.

### 2D PNG source and failure feedback — 2026-09-09

Project PNG export now uses the full-floor renderer without querying an on-screen
canvas. Empty floors never substitute another viewport. Null blobs, thrown errors
and encoding timeouts are reported through the shared notice from both toolbar
and command palette; complete exports clear prior notices.

**21 targeted tests, six Chromium/WebKit browser checks, Svelte checks and
production build passed.** Browser coverage includes 2D export while 3D is open,
failed encoding through both entry points, and curved wall/opening regressions.
See [validation](docs/png-2d-feedback-validation.md). All-object bounds/typography,
asset readiness, physical downloads and native parity remain open.

### Furniture footprint export bounds — 2026-09-09

PNG, SVG and PDF now frame furniture using rotated symbol dimensions and stroke
width, replacing fixed extents or missing furniture bounds. Oversized items
outside the walls remain visible; saved furniture and raster caps are unchanged.

**14 final geometry/export tests, three real-jsPDF tests, six Chromium/WebKit
checks, Svelte checks and production build passed.** The actual PNG was visually
reviewed. See [validation](docs/furniture-export-bounds-validation.md). Long symbol
labels, other object categories, title text and native parity remain open.

### Saved text annotations in plan exports — 2026-09-09

PNG/PDF now render saved text annotations; SVG preserves multiline spacing;
DXF includes rotated lines on true-color layers for hex colors. Framed formats
include rotated measured text bounds, preserving notes outside the wall envelope.

**18 targeted tests, six Chromium/WebKit checks, Svelte checks and production
build passed.** The exported PNG was visually reviewed. See
[validation](docs/text-annotation-export-validation.md). Universal font coverage,
title-block text, dimension annotations, other objects and native parity remain open.

### Saved dimension annotation exports — 2026-09-09

PNG/PDF now draw dimension callouts; PNG/SVG/PDF bounds include offset geometry
and labels. SVG default labels use selected units; DXF includes callout primitives.
Zero offsets now survive rendering and hit testing. Canvas zoom scaling and
long-label gaps are corrected without changing saved annotations.

**21 targeted tests, six text/curve browser regressions, two final dimension
browser checks, Svelte checks and build passed.** The exported PNG was visually
reviewed. See [validation](docs/dimension-annotation-export-validation.md).
Standalone measurements, all-object bounds, universal fonts, title layout,
physical checks and native parity remain open.

### Standalone measurement exports — 2026-09-09

PNG/PDF and DXF now include saved measurement lines, endpoints and labels. SVG
includes endpoint dots and uses selected units. Framed bounds include measurement
geometry and labels outside the wall envelope.

**19 targeted tests, four Chromium/WebKit checks, Svelte checks and production
build passed.** Metric and imperial labels are covered; the PNG was visually
reviewed. See [validation](docs/measurement-export-validation.md). All-object
framing, fonts, physical/device qualification and native parity remain open.

### Imperial length rounding — 2026-09-09

Shared length formatters now round total inches before splitting feet/remainders,
preventing labels such as `1'12"`. Precise tenths carry correctly as well; negative
values use a single leading sign without negative zero. Metric formatting and
saved geometry are unchanged.

**738 unit tests across 59 files, Svelte checks and production build passed.**
Export checks include carried imperial measurement labels in PNG/PDF/SVG/DXF.
See [validation](docs/imperial-length-rounding-validation.md). Input parsing,
physical scale/device checks and native unit parity remain open.

### Explicit wall-length input — 2026-09-09

Wall length now accepts explicit metric and feet/inches units, with bare values
using the displayed cm/in units. The parser correctly reads `12"` as inches and
rejects trailing junk/nonfinite values. Invalid drafts preserve saved geometry
and undo history; unchanged rounded displays retain full stored precision.

**757 unit tests across 60 files, four Chromium/WebKit desktop/phone-width
checks, Svelte checks and production build passed.** See
[validation](docs/length-input-validation.md). Fractional notation, other numeric
property fields, native unit parity and physical device checks remain open.

### Stair and column dimension drafts — 2026-09-09

Clearing a stair dimension previously saved zero. Stair and column fields now
preserve saved geometry for invalid drafts, honor existing riser/column ranges,
accept fractional dimensions and retain precision on unchanged blur. Column
limits convert to the selected units.

**Four final structural and four wall/opening regression checks passed in
Chromium/WebKit at desktop/phone widths; Svelte checks and build passed.** See
[validation](docs/structural-dimension-input-validation.md). Other property
editors, native parity and physical device qualification remain open.

### Presentation property drafts — 2026-09-09

Entourage width/rotation, furniture/column rotation, text font size/position/
rotation and background-image rotation now preserve saved values for invalid
numeric drafts. Fractional values remain visible and editable; entourage minimum
width converts to inches correctly.

**Four Chromium/WebKit desktop/phone-width checks, Svelte checks and build
passed.** See [validation](docs/property-draft-validation.md). The phone check
also exposed a remaining usability issue: fit-to-view can place content behind
the open properties sheet; panning reveals it. Fit framing, physical touch
qualification and native parity remain open.

### Mobile fit above properties sheet — 2026-09-09

Fit-to-view now measures the visible canvas above an overlapping properties
sheet and centers the plan there. The prior phone panning workaround is removed
from the regression: the painted note is above the sheet and directly selectable.
Desktop sidebars continue using their existing layout space.

**Eight Chromium/WebKit desktop/phone-width checks, Svelte checks and build
passed; the phone screenshot was visually reviewed.** See
[validation](docs/mobile-fit-viewport-validation.md). All-object fit bounds,
automatic reframing on selection and physical touch qualification remain open.

### Fit object-only floor content — 2026-09-09

Fit now uses shared geometry bounds for walls, furniture (including unknown
catalog fallbacks), rotated stairs/columns, entourage, measurement/dimension
geometry, text and loaded tracing images. Floors without walls can be fitted;
current-floor content takes precedence over the floor-below fallback.

**763 unit tests, four final note-only browser checks and four property-editor
regressions passed, along with Svelte checks and build.** See
[validation](docs/content-fit-validation.md). Caption/room-label bounds, minimap
parity, initial automatic fitting and extreme zoom limits remain open.

### Initial framing without walls — 2026-09-09

Initial framing now uses shared content bounds instead of requiring walls. It
waits for tracing-image dimensions on image-only floors and coalesces pending
attempts. After the initial fit, subsequent edits retain the camera.

**12 Chromium/WebKit desktop/phone-width checks, Svelte checks and build passed.**
See [validation](docs/initial-content-fit-validation.md). Per-floor/selection
reframing, caption/room-label bounds, minimap parity and extreme zoom limits
remain open.

### Room deletion metadata and keyboard verification — 2026-09-11

A browser regression found that Delete Room removed the walls/openings while
leaving a saved room record referencing deleted walls. The store now removes the
room boundary, attached openings and saved room metadata in one undo operation.
Two unit cases cover saved/detected rooms, unrelated data preservation and exact
Undo/Redo. All 945 unit tests and six desktop/narrow browser cases pass. Keyboard
label reset also preserves other room fields and restores its offset with Undo.
Full browser, shared-boundary deletion semantics and physical/release gates remain.

### Preserve neighboring rooms during deletion — 2026-09-11

Room deletion now retains boundary walls used by another saved or detected room,
including attached openings. Two failing unit cases reproduced shared-wall loss;
all four room-deletion unit cases now pass, with exact Undo/Redo and unrelated data
preservation. Check/build and six browser cases at 1440px/390px across three engines
pass (17.0 seconds). In a four-room grid, deleting a corner removes only its two
exclusive walls, preserving three neighbors, shared openings and all furniture.
Imported duplicate/coincident wall topology and physical/release gates remain open.

### Preserve room Undo/Redo for unchanged fields — 2026-09-11

Unchanged saved-room updates, empty patches and nonexistent room IDs now return
before a snapshot or save notification. Label offsets compare their coordinates,
not object identity. First-time metadata persistence for detected rooms remains.
The regression verifies that unchanged fields add no Undo step and preserve Redo.
All 949 unit tests, check/build and six desktop/narrow browser cases pass. Other
item types and remaining NEXT scope are not qualified by this room-specific fix.

### Preserve furniture Undo/Redo for unchanged fields — 2026-09-11

Furniture updates now skip missing targets, empty patches, unchanged scalar values
and equal position/scale coordinates before snapshotting. Fifty furniture unit
cases pass, including the reproduced Undo/Redo regression and existing geometry
interactions. Check/build and three Portuguese browser cases pass (13.1 seconds),
verifying redo after reapplying a color, dimensions, rotation/mirroring, appearance
reset and retained item details. Other item types and physical qualification remain.

### Wall coordinate history and uniform height — 2026-09-11

Equivalent start/end/curve coordinates now skip wall snapshots. Explicit uniform
height updates still flatten a slope when the requested height equals the stored
maximum; that is a geometry change, not an unchanged edit. Two regressions
reproduced endpoint-history loss and skipped flattening. All 43 focused wall unit
cases, check/build and three Portuguese wall-control browser cases pass (16.3
seconds). Physical interaction and the broader NEXT scope remain open.

### Minimap for object-only content — 2026-09-09

The desktop minimap now uses shared content bounds for drawing and navigation,
includes omitted objects/annotations as navigation markers and lines, and handles
unknown furniture footprints. Object-only floors no longer show the empty-plan
hint. Phone minimap visibility is unchanged.

**764 unit tests, eight content browser checks and six canvas-idle regressions
passed, along with Svelte checks and build.** See
[validation](docs/minimap-content-validation.md). Caption/room-label bounds,
extreme zoom limits, floor-switch framing and physical device checks remain open.

### Per-floor camera views — 2026-09-09

First visits now frame each floor; returning restores its camera center and zoom
for the current editor session. Views are keyed by project/floor and remain
transient UI state. Same-floor edits retain the camera and stale tracing-image
loads remain rejected.

**Fourteen Chromium/WebKit desktop/phone-width checks, Svelte checks and build
passed.** See [validation](docs/floor-view-validation.md). Caption/room-label
bounds, extreme zoom limits, selection framing and physical device checks remain open.

### Large-plan zoom and phone controls — 2026-09-09

Fit can now go below 10%, with a per-floor lower limit at one-quarter of its
fitted scale. Canvas and mobile overflow controls share that limit. Rulers extend
their spacing at small scales, percentages remain nonzero, and a screen margin
keeps short labels clear of rulers. Phone zoom controls now sit beside Tools.

**764 unit tests, four final large-plan browser checks and eight floor/property
regressions passed; Svelte checks and final build passed.** The phone screenshot
was reviewed. See [validation](docs/large-plan-zoom-validation.md). Caption/
room-label bounds, selection framing and physical device checks remain open.

### Delayed image fit priority — 2026-09-09

An image-only floor now waits for its image before completing initial framing,
instead of prematurely fitting the visible floor below. Failed loading releases
the wait and permits that fallback; stale image callbacks remain rejected.

**Eighteen Chromium/WebKit desktop/phone-width checks, Svelte checks and build
passed.** See [validation](docs/delayed-image-fit-validation.md). Caption/
room-label bounds, selection framing and physical device checks remain open.

### Fit moved room-label ink — 2026-09-09

Fit includes the combined room-name/area text at its saved offset, using actual
screen font measurements and a bounded scale search. Hidden labels are excluded;
geometry and offsets remain unchanged. Shared minimap world bounds include labels.

**The 765-test suite, eight final bounds tests, four final label browser checks
and eight large-plan/property regressions passed.** Final Svelte checks/build
passed, and the phone screenshot was reviewed. See
[validation](docs/room-label-fit-validation.md). Overwide single-line labels,
other annotation captions, selection framing and physical checks remain open.

### Text-note fit at low zoom — 2026-09-09

Fit now measures text annotations at their rendered screen font size, including
the eight-pixel minimum, multiline spacing and rotation, before converting bounds
to world coordinates. The default export bounds behavior is preserved.

**766 unit tests, ten Chromium/WebKit checks, Svelte checks and build passed.**
Longer note ink and export regressions are covered; the phone screenshot was
reviewed. See [validation](docs/text-note-fit-validation.md). Overwide text,
measurement/dimension captions, selection framing and physical checks remain open.

### Fit measurement and dimension captions — 2026-09-09

Fit measures saved measurement and dimension captions at their rendered screen
font sizes and includes endpoint dots, arrows and leader extensions. Hidden
measurement/annotation layers are excluded from these bounds and minimap lines.
Saved geometry and labels remain unchanged.

**767 unit tests, twelve Chromium/WebKit checks, Svelte checks and build passed.**
Desktop/phone caption framing, hidden measurements, object-only minimap behavior
and export regressions are covered; the phone screenshot was reviewed. See
[validation](docs/caption-fit-validation.md). Overwide text, automatic wall/internal
room dimension labels, selection framing and physical checks remain open.

### Fit automatic wall and room dimensions — 2026-09-09

Fit includes automatic wall caption ink, offset lines/ticks and internal room
width/depth captions at their rendered screen sizes. Curves and clear-span wall
insets use the renderer's geometry helpers. Both possible wall dimension sides
are bounded; hidden dimensions are excluded. Internal room text now explicitly
sets its alignment when room-name labels are hidden.

**The 767-test suite, 11 final bounds tests, eight framing checks and four final
wall-editing checks passed.** Svelte checks/build passed; phone QA was reviewed.
The wall regression's lazy 3D readiness assertion now allows 30 seconds after
initial Chromium timeouts. See [validation](docs/automatic-dimension-fit-validation.md).
Overwide text, selection framing, selected-opening distance annotations and
physical device qualification remain open, alongside the broader backlog.

### Object-only plan exports — 2026-09-09

PNG, PDF, SVG and DXF now accept furniture, notes, measurements and dimension
annotations without requiring walls. Their existing rendering/bounds logic frames
that content, including distant and rotated objects. Empty/blank/degenerate-only
floors remain excluded, with updated PNG/PDF messages. DWG's DXF fallback shares
the eligibility rule.

**769 existing unit tests plus the new eligibility test, ten Chromium/WebKit
checks, Svelte checks and build passed.** All four object-only PDF pages were
rendered and visually reviewed. See [validation](docs/object-only-export-validation.md).
Tracing images, stairs, columns and entourage still need consistent export
coverage; broader layout, physical-scale and native parity work remains open.

### Column plan exports — 2026-09-09

Round and rotated square columns now appear in PNG/PDF/SVG/DXF exports, with
diagonal markers and bounds that include stroke width. Column-only floors qualify
for export. Raster outputs reuse the editor renderer; SVG retains fill color;
DXF uses circle/closed-outline primitives on a COLUMNS layer.

**The 770-test suite, two new geometry tests, twelve Chromium/WebKit checks,
Svelte checks and build passed.** Both column PDF pages were rendered and visually
reviewed. See [validation](docs/column-export-validation.md). Tracing images,
stairs, entourage, CAD fill styling, physical-scale and native parity work remain open.

### Shape-aware stair framing and hit testing — 2026-09-09

Fit and single-stair selection outlines now include L-shaped outer runs and
U-shaped landings. Hit testing uses the filled footprint, excludes empty corners
and the U void, and uses a circle for spiral stairs. Fit includes stair caption
ink; straight UP/DN arrows now remain inside their footprint.

**772 existing unit tests, four new geometry tests, eight final footprint browser
checks, four structural regressions and two phone QA checks passed.** Svelte
checks/build passed, and unobstructed phone screenshots were reviewed. See
[validation](docs/stair-footprint-validation.md). Stair exports, multi-selection
framing, below-floor ghosts, L/U direction indicators, physical checks and native
parity remain open.

### Stair direction arrows — 2026-09-09

L-shaped and U-shaped arrows now reverse with Direction. Spiral arrows reverse
their arc and endpoint, and their heads now point along the travel direction.
Existing saved geometry and undo/redo semantics are preserved.

**780 unit tests, eight Chromium/WebKit behavior checks, four final phone QA
checks, Svelte checks and build passed.** L/U/spiral phone screenshots were
reviewed. See [validation](docs/stair-direction-validation.md). Stair exports,
below-floor ghosts, multi-selection framing, physical checks and native parity
remain open.

### Below-floor stair reference fidelity — 2026-09-09

The reference floor now uses the shared stair renderer at reduced opacity,
preserving shapes, treads, labels and direction arrows. Empty-floor fallback Fit
includes only the walls/stairs actually displayed; invisible lower-floor objects
no longer distort its bounds. Reference stairs remain non-interactive.

**780 unit tests, twelve delayed-image regressions, four final Chromium/WebKit
reference checks, Svelte checks and build passed.** Desktop/phone screenshots were
reviewed. See [validation](docs/stair-ghost-validation.md). Stair exports,
multi-selection framing, physical checks and broader native/geometry parity remain open.

### Multi-selection geometry bounds and drag Undo — 2026-09-09

Group boxes now enclose curved walls, rotated furniture/columns and actual stair
footprints. Their drag region uses the same bounds. Removing a duplicate history
snapshot at pointer-up makes a single Undo restore a group drag.

**782 unit tests, eight stair regressions, four final Chromium/WebKit group-drag
checks, final Svelte checks and build passed.** The fitted phone screenshot was
reviewed. See [validation](docs/multi-selection-bounds-validation.md). Dedicated
Fit Selection, opening symbol extents, entourage/annotation group operations,
stair exports and physical/native qualification remain open.

### One-step geometry drag Undo — 2026-09-09

Wall endpoint/parallel/curve, room, stair, column, text and group drags now own
one undo group, starting after actual pointer movement and ending on release.
This removes duplicate final snapshots, preserves the pre-drag state for rooms,
and groups curve mutations. Selection clicks do not start a geometry undo group.

**782 unit tests, checks for seven individual drag types in both browser engines,
desktop/phone group regressions, Svelte checks and build passed.** The final stair
rerun waits for painted Fit to avoid a framing race. See
[validation](docs/geometry-drag-undo-validation.md). Opening/guide/entourage history
is addressed below; physical gestures and broader export/native work remain open.

### Opening, guide and entourage drag Undo — 2026-09-10

Doors, windows, guides, entourage movement and entourage resizing now use one
undo group per drag, starting after three screen pixels of movement. Selection
clicks no longer take entourage snapshots, and opening/guide movement no longer
adds a snapshot for every update.

**782 unit tests, all five drag paths in Chromium and WebKit, Svelte checks and
production build passed.** The final door rerun compares against the imported
plan and waits for canvas layout to settle. See
[validation](docs/accessory-drag-undo-validation.md). Physical gestures, opening
symbol bounds, entourage group operations and export/native parity remain open.

### Entourage group selection and locked movement — 2026-09-10

Group bounds now include rotated built-in and custom entourage, marquee selection
includes entourage, and group dragging moves unlocked entourage with the other
objects. Locked furniture and entourage stay stationary. Selection and Fit share
the entourage bounds calculation.

**783 unit tests, four final Chromium/WebKit desktop/phone cases, Svelte checks
and build passed.** The browser checks cover marquee selection, equal movement,
locks and one-step Undo; phone screenshot review passed. See
[validation](docs/entourage-group-validation.md). Other entourage group operations,
annotation selection, opening bounds, physical gestures and export/native parity
remain open.

### Complete selection duplication and group cleanup — 2026-09-10

Canvas Duplicate now copies all selected supported objects, including stairs,
columns and entourage, in one history action. Copied curved walls carry translated
control points and correctly remapped openings; complete saved groups are copied.
The contextual toolbar now supports stairs, columns and entourage. Deleting
objects cleans saved group references, including openings removed with a wall.

**The 785-test suite and three final focused unit cases passed; all four final
Chromium/WebKit mixed/entourage Duplicate–Undo–Redo–Delete–Undo checks, Svelte
checks and build passed.** See [validation](docs/selection-copy-validation.md).
Clipboard copy/paste remains on older ID-based paths. Alignment/distribution,
annotation selection, opening bounds, physical gestures and export/native parity
remain open.

### Snapshot-based plan clipboard — 2026-09-10

Copy/Paste now uses captured geometry instead of looking up live source IDs.
Walls, openings, furniture, stairs, columns, entourage and saved groups remain
pasteable after source edits/deletion. Successive pastes use fresh IDs and offsets,
with one Undo per paste. Openings require a valid destination wall. The clipboard
persists between floors and clears on project changes to keep custom assets valid.

**788 unit tests, four Duplicate regressions, four final Chromium/WebKit clipboard
workflows, Svelte checks and build passed.** The final browser rerun verifies the
plain-store snapshot fix. See [validation](docs/selection-clipboard-validation.md).
Cross-project custom assets, annotation clipboard support, alignment/distribution,
opening bounds, physical gestures and export/native parity remain open.

### Geometry-aware object alignment and distribution — 2026-09-10

Alignment now supports furniture, stairs, columns and entourage using rotated
plan bounds, including asymmetric stairs and custom symbols. Shared furniture
bounds account for scale. Locked objects remain stationary; distribution spaces
visual centers between fixed endpoints and locked anchors. No-op operations add
no Undo entry, and unavailable toolbar actions are disabled.

**798 unit tests, ten final alignment unit cases, eight Chromium/WebKit desktop/
phone toolbar workflows, Svelte checks and build passed.** See
[validation](docs/alignment-validation.md). Wall/opening and annotation alignment,
cross-project clipboard assets, opening bounds, physical gestures and export/native
parity remain open.

### Atomic selection locking and locked rotation — 2026-09-10

Ctrl/Cmd+L now locks selected furniture and entourage together when any is
unlocked, or unlocks them together when all are locked, with one Undo step.
Unselected/unsupported objects are unaffected. The R shortcut ignores locked
furniture without adding a history entry.

**799 unit tests, the final focused fixture check, four Chromium/WebKit desktop/
phone shortcut workflows, Svelte checks and build passed.** See
[validation](docs/selection-lock-validation.md). Broader rotation/group transforms,
annotation selection, opening bounds, physical gestures and export/native parity
remain open.

### Group object rotation shortcut — 2026-09-10

R now rotates selected furniture, stairs, columns and entourage by 15 degrees
around their movable bounds center, updating positions and orientations together.
Locked objects stay fixed and do not affect the pivot. A single movable object
rotates in place; the operation has one Undo step and skips no-op history.

**805 unit tests, eight Chromium/WebKit rotation/lock workflows, Svelte checks
and build passed.** See [validation](docs/selection-rotation-validation.md).
Wall/opening and annotation transforms, cross-project assets, opening bounds,
physical gestures and export/native parity remain open.

### Door/window symbol bounds — 2026-09-10

Fit and multi-selection bounds now include opening symbols at their wall tangent,
covering door swings, pocket tracks, folding/garage details, bay/casement windows
and sliding arrows. Screen-sized details participate in zoom refinement. Bounds
are conservative, allowing some spare space on unused swing sides.

**818 unit tests, eight Chromium/WebKit desktop/phone framing checks, Svelte
checks and build passed.** Phone screenshot review passed. See
[validation](docs/opening-bounds-validation.md). Fit Selection remains next;
selected-opening dimension labels, annotation group operations, physical gestures
and export/native parity remain open.

### Fit Selection and accessible phone zoom controls — 2026-09-10

The zoom toolbar now offers Fit Selection (Shift+F), using selected geometry and
zoom-aware bounds while F fits the full plan. Opening hosts do not enlarge an
opening-only selection; selected rooms include their walls even with hidden labels.
Zoom controls sit above an overlapping phone properties sheet. Choosing a Layers
item clears the old multi-selection so unrelated geometry is not included.

**821 unit tests, three final focused cases, twelve final Chromium/WebKit framing
checks, Svelte checks and build passed.** Phone screenshot review passed. See
[validation](docs/fit-selection-validation.md). Selected-opening dimension labels,
annotation group editing, physical gestures and export/native parity remain open.

### Guide/annotation selection cleanup — 2026-09-10

Guide, measurement, dimension and text clicks clear stale group/room and auxiliary
selection. Layers selection activates the corresponding canvas target, enabling
correct deletion. Escape clears auxiliary and room selection so a later Delete
cannot act on an invisible old target. Deletion also clears primary selection.

**Sixteen Chromium/WebKit selection and drag/Undo checks, Svelte checks and build
passed.** See [validation](docs/auxiliary-selection-validation.md). Annotation
group transforms and clipboard support, selected-opening labels, physical gestures
and export/native parity remain open.

### Annotation clipboard support — 2026-09-10

Copy/Paste now supports notes, measurements and dimension annotations, including
canvas-local selection. Copies retain styling, rotation, labels and offsets while
translating coordinates and preserving measured lengths. Annotation removal uses
shared group-reference cleanup, and each paste remains one Undo step.

**822 unit tests, six Chromium/WebKit annotation clipboard workflows, Svelte
checks and build passed.** See [validation](docs/annotation-clipboard-validation.md).
Annotation multi-selection/group bounds and transforms, cross-project assets,
selected-opening labels, physical gestures and export/native parity remain open.

### Text notes in Layers — 2026-09-10

Layers now lists text notes with normalized multiline labels and an empty-note
fallback, making distant notes selectable for framing and editing. Shared
selection clears old group/room targets. Notes retain existing always-visible
rendering; the category can be collapsed.

**Eight Chromium/WebKit selection workflows, Svelte checks and build passed.**
The distant-note case verifies Fit Selection, Escape, isolated Delete and exact
Undo restoration. See [validation](docs/text-note-layers-validation.md).
Annotation group editing, note visibility, physical qualification and
export/native parity remain open.

### Annotation group selection and movement — 2026-09-10

Notes, measurements and dimensions now participate in marquee and Select All,
with zoom-aware caption bounds. Dragging a selected annotation moves the whole
group by one snapped delta, preserving lengths and styling in one Undo step.
Group Delete handles an annotation primary target, and Deselect All clears stale
auxiliary selection. Keyboard and context-menu Select All share one path.

**18 final Chromium/WebKit annotation workflows, four existing mixed-object
checks, Svelte checks and build passed.** The unit suite passed 822 of 823 cases;
the one image-storage timeout passed with its 19-case file on an isolated retry.
Phone screenshot review passed. See [validation](docs/annotation-group-validation.md).
Saved-group re-selection, Shift-click annotations, rotation/alignment, note
visibility, physical qualification and export/native parity remain open.

### Saved annotation groups and Shift-click — 2026-09-10

Canvas clicks on notes, measurements and dimensions now reopen saved groups and
can immediately drag the group. Ctrl/Cmd-click isolates an annotation; Shift-click
adds or removes one member and keeps primary selection consistent. Deleting the
last remaining selected member clears selection fully.

**All 16 Chromium/WebKit workflows, Svelte checks and build passed.** Desktop
and phone cases reopen groups through every annotation type, check group drag
and Undo, toggle members, and verify isolated deletion against exported data.
See [validation](docs/annotation-reselection-validation.md). Annotation rotation/
alignment, note visibility, wider object modifier consistency, physical checks
and export/native parity remain open.

### Annotation rotation — 2026-09-10

R now rotates notes, measurements and dimensions, including canvas-local
selection. Single notes rotate in place; single dimensions rotate around their
endpoint midpoint. Mixed selections share a zoom-independent geometric pivot,
preserving annotation metadata and lengths while respecting object locks.
The entire rotation remains one Undo step.

**All 827 unit tests, 12 Chromium/WebKit rotation workflows, Svelte checks and
build passed.** Phone screenshot review passed. The multi-megabyte quota test
now has a targeted 15-second timeout after repeated five-second timeouts; its
assertions and application storage limits are unchanged. See
[validation](docs/annotation-rotation-validation.md). Annotation alignment,
visibility, wall/opening rotation, physical qualification and export/native parity
remain open.

### Object Shift-click selection — 2026-09-10

Shift-click now toggles furniture, columns, stairs, entourage, doors, windows and
walls before the Shift-pan handler intercepts the press. Objects share the
annotation toggle path, keeping the remaining primary selection consistent.
Shift-drag on empty canvas retains panning.

**18 Chromium/WebKit workflows, Svelte checks and build passed.** The furniture
fixture was corrected to use a rendered catalog chair and passed a focused rerun;
the other sixteen checks passed in the main run. Exact floor exports verify no
geometry changes during selection/panning, isolated deletion, and Undo restoration.
See [validation](docs/object-shift-selection-validation.md). Ctrl/Cmd group isolation,
unknown-catalog rendering/hit-testing, annotation alignment/visibility, physical
qualification and export/native parity remain open.

### Ctrl/Cmd-click object group isolation — 2026-09-10

Ctrl/Cmd-click now isolates every supported object type from saved groups.
Group drag bounds and selection handles yield to the modifier, and all object
selection paths pass it consistently. Selection alone preserves saved groups.

**All 18 Chromium/WebKit workflows, Svelte checks and build passed.** Each object
type is isolated with its group selected and deselected; exact exports verify
unchanged selection state data, isolated deletion and full Undo restoration.
See [validation](docs/object-group-isolation-validation.md). Saved-object group
drag initiation, unknown-catalog rendering/hit-testing, annotation alignment and
visibility, physical qualification and export/native parity remain open.

### Saved-group first-press dragging — 2026-09-10

The first press on a deselected saved-group member now starts the shared group
drag instead of moving just the clicked object. Furniture, columns, stairs,
entourage, straight walls, and openings grouped with their host walls are covered.
Locked members remain fixed and the complete drag stays one Undo step.

**All 18 Chromium/WebKit workflows, Svelte checks and build passed.** Exact exports
verify common movement of objects, grouped notes/dimensions, unchanged locked
members and opening positions, full Undo/Redo, and retained Ctrl/Cmd isolation.
See [validation](docs/saved-group-drag-validation.md). Opening-only group movement,
curved-wall group translation, unknown-catalog rendering/hit-testing, annotation
alignment/visibility, physical qualification and export/native parity remain open.

### Curved-wall group translation — 2026-09-10

Group dragging now translates curved-wall control points with both endpoints,
preserving curve shape. A dedicated geometry update applies the move together
without normalizing unrelated height fields, and validates points before mutation.
The existing shared drag retains one Undo/Redo step.

**All 829 unit tests, eight Chromium/WebKit workflows, Svelte checks and build
passed.** Opposite curves, attached openings, grouped annotations, locked members
and an unselected curved wall are covered with exact exported-floor comparisons;
straight-wall dragging and Ctrl/Cmd isolation also pass. See
[validation](docs/curved-group-translation-validation.md). Opening-only group
movement, unknown-catalog handling, annotation alignment/visibility, physical
qualification and export/native parity remain open.

### Unknown-catalog furniture in the 2D editor — 2026-09-10

Furniture with an unavailable catalog entry now renders a generic labeled symbol
and supports selection, movement, rotation, resizing and deletion. Drawing, hit
testing, bounds, minimap and property defaults agree on saved dimensions or the
shared 50 cm fallback. Mirrored furniture captions remain readable.

**All 834 unit tests, six Chromium/WebKit workflows, Svelte checks and build
passed.** Exact exports verify preserved catalog identity and metadata plus
Undo/Redo; phone screenshots cover saved mirrored dimensions and omitted defaults.
See [validation](docs/unknown-furniture-validation.md). Unknown-catalog 3D/export
parity, opening-only group movement, annotation alignment/visibility, physical
qualification and broader native parity remain open.

### Furniture export dimensions and CAD rotation — 2026-09-10

PNG/PDF/SVG/DXF furniture footprints now preserve nonuniform scale and share the
editor's 50 cm missing-catalog fallback. Missing entries receive a readable label.
DXF applies its vertical-axis inversion after rotating each corner, correcting
previously reversed rectangle orientation. Saved project data is unchanged.

**All 836 unit tests, four Chromium/WebKit workflows, Svelte checks and build
passed.** Tests check all four formats, exact DXF corners, saved/default sizes,
export bounds and real downloads; scaled PNG visual review passed. See
[validation](docs/furniture-export-size-validation.md). Unknown-catalog 3D
rendering, detailed furniture export symbols, opening-only group movement,
annotation alignment/visibility, physical qualification and native parity remain open.

### Missing-catalog furniture in 3D — 2026-09-10

Saved furniture with unavailable catalog entries now reaches the existing box
fallback in the main viewer. Saved dimensions/color or shared 50 cm/gray defaults
are preserved, with rotation, signed plan scale and height-scale magnitude applied.
Known 2D-only symbols remain excluded and saved data remains unchanged.

**All 839 unit tests, Svelte checks and build passed.** Four new Chromium/WebKit
desktop/phone rendering workflows and six existing resource workflows have passing
results; screenshots confirm both saved-size and default-size objects are visible.
The Chromium textured-resource test needed longer startup/total allowances for
software rendering; the final full loop passed unchanged resource assertions. See
[validation](docs/unknown-furniture-3d-validation.md) for those reruns. Detailed
furniture export symbols, opening-only group movement, annotation alignment/
visibility, physical qualification and broader native parity remain open.

### Annotation alignment and distribution — 2026-09-10

Notes, measurements and offset dimensions now participate in all eight alignment/
distribution operations using measured bounds at a fixed world scale. Endpoint
vectors and annotation metadata remain intact, locked object anchors retain their
existing behavior, and each operation is one Undo/Redo step with repeated no-ops
excluded from history.

**All 16 final Chromium/WebKit workflows, Svelte checks and build passed.** Unit
coverage adds all eight annotation operations; the full run passed 845/847 tests
and both unrelated timeout files passed in isolation. Phone visual review passed.
See [validation](docs/annotation-alignment-validation.md). Walls/openings alignment,
annotation visibility and multiline property editing, opening-only group movement,
detailed furniture exports, physical qualification and native parity remain open.

### Multiline text-note properties — 2026-09-10

The note text field now uses a resizable textarea, preserving imported line breaks
and blank lines and supporting Enter during editing. Exact exported data verifies
text-only changes, unchanged note metadata and Undo/Redo; typing shortcut letters
in the field does not trigger plan actions. All 15 focused unit tests, six
Chromium/WebKit workflows, Svelte checks and build passed. Phone visual review
passed. See [validation](docs/multiline-note-properties-validation.md). Annotation
visibility, walls/openings alignment, opening-only group movement, detailed
exports, physical qualification and native parity remain open.

### Annotation layer visibility — 2026-09-10

Text notes now have visibility controls, and all three annotation types respect
hidden state in drawing, hit testing, marquee and Select All. Hiding clears their
active selection; explicit selection in Layers reveals the category. Hidden notes
are omitted from Fit/minimap while saved data and exports remain intact.

**All 848 unit tests, 14 Chromium/WebKit workflows, Svelte checks and build passed.**
Exact exports verify hidden-item protection from Delete/Select All, Undo and
reveal; existing auxiliary selection checks also pass. See
[validation](docs/annotation-visibility-validation.md). Walls/openings alignment,
opening-only group movement, detailed furniture exports, physical qualification
and broader native parity remain open.

### Straight and curved wall alignment — 2026-09-10

Walls now participate in all eight alignment/distribution operations, using bounds
that include thickness and quadratic curve extrema. Each move translates both
endpoints and the curve control point together, preserving height profiles and
metadata. Attached openings follow their host without changing normalized data.
Only selected walls move; unselected neighboring walls remain unchanged.

**All 856 unit tests, 16 Chromium/WebKit workflows, Svelte checks and build passed.**
Tests verify all operations, curve shape, hosted openings, no-op history and exact
Undo/Redo; phone visual review passed. See [validation](docs/wall-alignment-validation.md).
Independent opening alignment, opening-only group movement, detailed furniture
exports, physical qualification and broader native parity remain open.

### Opening-only group movement — 2026-09-10

Saved door/window groups now move on the first drag even when their host walls
are outside the selection. Each original center is translated then projected onto
its own host using existing wall constraints. Openings on selected hosts are not
moved twice. Host geometry and opening metadata remain intact with one Undo/Redo
step. Curved or differently oriented hosts constrain movement independently.

**All 858 unit tests, 12 Chromium/WebKit workflows, Svelte checks and build passed.**
Two additional phone screenshot workflows passed; fitted visual review passed.
See [validation](docs/opening-group-movement-validation.md). Independent opening
alignment, detailed furniture exports, physical qualification and native parity
remain open.

### Furniture detail in PNG/PDF exports — 2026-09-10

PNG/PDF exports now use the editor's catalog-specific furniture renderer, preserving
symbol details, color, rotation and signed scale with readable mirrored captions.
Unknown entries keep their fallback symbol, with no selection handles or project
mutation. All 859 unit tests, six Chromium/WebKit workflows, Svelte checks and build
passed. Gallery visual review and oversized furniture-bound regressions passed.
See [validation](docs/furniture-raster-detail-validation.md). Detailed SVG/DXF
furniture symbols, independent opening alignment, physical qualification and
broader native parity remain open.

### Detailed furniture symbols in SVG — 2026-09-10

SVG exports now reuse the furniture icon registry through a vector drawing adapter,
preserving paths, curves, ellipses and symbol text without embedded raster images.
Geometry retains rotation and signed scale; captions remain readable outside the
mirror transform. All 861 unit tests, six Chromium/WebKit workflows, Svelte checks
and build passed. Every catalog entry is covered by adapter tests; decoded SVG
gallery visual review and export-bound regressions passed. See
[validation](docs/furniture-svg-detail-validation.md). Detailed DXF furniture
symbols, independent opening alignment, physical qualification and broader native
parity remain open.

### Detailed furniture linework in DXF — 2026-09-10

DXF exports now reuse catalog furniture geometry as editable lines, quadratic
splines and exact rational elliptical arcs, preserving scale, mirroring and
rotation. Duplicate fill/stroke outlines are removed; unknown entries retain
their rectangular footprint. Output uses the existing monochrome furniture layer.
All 864 unit tests, six Chromium/WebKit workflows, Svelte checks and build passed;
downloaded DXF geometry visual review and export-bound regressions passed. See
[validation](docs/furniture-dxf-detail-validation.md). Independent opening alignment,
physical qualification and broader native parity remain open.

### Independent door/window alignment — 2026-09-10

Openings now support all eight alignment/distribution operations along their host
walls, using complete symbol bounds and curved-wall tangents. The closest reachable
position is used when a target cannot be met; hosts are preserved, and selecting
a host carries its openings once. Mixed object selections and one-step Undo/Redo
are covered. The full 874-test unit suite and expanded 37-test alignment suite
passed, along with 16 Chromium/WebKit workflows, Svelte checks and build. Phone
controls were visually reviewed. See [validation](docs/opening-alignment-validation.md)
for constraints and evidence. Physical qualification and broader native parity
remain open.

### Stair geometry in PNG/PDF exports — 2026-09-10

PNG/PDF plans now draw all four stair shapes with the shared editor renderer,
including treads, rotation, direction arrows and captions. Stair-only plans are
accepted, and shared footprint/caption bounds prevent clipping. All 879 unit tests,
four Chromium/WebKit workflows, Svelte checks and build passed. Downloaded PNG and
PDF plan-image visual reviews passed. See
[validation](docs/stair-raster-export-validation.md). SVG/DXF stair symbols,
physical qualification and broader native parity remain open.

### Editable stair symbols in SVG — 2026-09-10

SVG now shares the editor's stair renderer through the vector symbol adapter,
retaining all four shapes, treads, directional arrows, labels and rotation as
editable geometry. Stair-only SVG plans and complete caption/footprint framing
are supported. All 884 unit tests, four Chromium/WebKit workflows, Svelte checks
and build passed; downloaded SVG visual review and furniture regressions passed.
See [validation](docs/stair-svg-export-validation.md). DXF stairs, physical
qualification and broader native parity remain open.

### Editable stair geometry in DXF — 2026-09-10

DXF now shares the stair renderer through a CAD symbol adapter, retaining all four
shapes, treads, arrows, labels and rotation as native lines, exact curve splines
and text on a STAIRS layer. Stair-only plans now work across all four plan formats.
All 889 unit tests, four Chromium/WebKit workflows, Svelte checks and build passed;
downloaded CAD geometry visual review and furniture regressions passed. See
[validation](docs/stair-dxf-export-validation.md). Physical qualification, stair
voids and broader native parity remain open.

### Entourage symbols in SVG — 2026-09-10

SVG exports now include built-in entourage as editable paths and custom symbols
as embedded images, preserving aspect ratio, rotation and opacity. Entourage-only
plans are accepted and rotated symbols are fully framed. All 890 unit tests, six
Chromium/WebKit workflows, Svelte checks and build passed; decoded SVG image/pixel
checks, visual review and stair/furniture regressions passed. See
[validation](docs/entourage-svg-export-validation.md). PNG/PDF entourage framing
and image readiness, DXF entourage, physical qualification and native parity remain open.

### Complete entourage PNG exports — 2026-09-10

PNG now frames entourage-only plans and waits for custom images before drawing.
Failures/timeouts report through export feedback; same-ID image replacements
refresh the cache. Export snapshots retain their own prepared images during
loading. All 894 unit tests, six Chromium/WebKit workflows, Svelte checks and build
passed, plus the final focused suite. Delayed-image and downloaded PNG visual
checks passed. See [validation](docs/entourage-png-export-validation.md). PDF
entourage framing/readiness, DXF entourage, physical qualification and native
parity remain open.

### Complete entourage PDF exports — 2026-09-10

PDF now frames entourage-only plans and waits for custom images. The export keeps
a plan/image snapshot and captures its optional main 3D view before waiting,
preventing later viewport substitution. Async failures report through both export
entry points without placeholder downloads. The full 894-test unit suite and
expanded 32-test PDF/export suite passed, along with eight Chromium/WebKit
workflows, final Svelte checks and build. PDF plan-image visual review passed.
See [validation](docs/entourage-pdf-export-validation.md). DXF entourage, physical
qualification and broader native parity remain open.

### Built-in entourage in DXF — 2026-09-10

DXF now exports built-in entourage as native lines and exact curve splines on an
ENTOURAGE layer, preserving position, width/aspect and rotation. Built-in
entourage-only plans are accepted; invisible symbols are omitted. All 910 unit
tests, six Chromium/WebKit workflows, Svelte checks and build passed. Downloaded
CAD visual review and furniture/stair regressions passed. See
[validation](docs/entourage-dxf-export-validation.md). Custom raster DXF entourage,
partial CAD transparency, physical qualification and native parity remain open.

### Entourage opacity in DXF — 2026-09-10

Built-in entourage now writes saved partial opacity as native DXF transparency
attributes on its own entities. Other geometry is unaffected, and repeated
serialization does not duplicate tags. All 911 unit tests, six Chromium/WebKit
workflows, Svelte checks and build passed; downloaded opacity preview and
furniture/stair regressions passed. See
[validation](docs/entourage-cad-opacity-validation.md). Custom raster DXF entourage,
physical CAD/plot qualification and broader native parity remain open.


### Editable room slab thickness — 2026-09-10

Floor settings now support a positive slab thickness per floor, with a 5 cm legacy
default, reset, input validation and undo/redo. Active and stacked 3D use the saved
depth below the existing surface. JSON save/reimport and actual exported mesh
bounds passed in Chromium and WebKit; visual review passed. All 913 unit tests,
Svelte checks and production build passed. See
[validation](docs/slab-thickness-validation.md), including the initial Chromium
screenshot timeout and passing rerun. Stair/courtyard openings, wall-face offsets,
native slab authoring/rendering and physical qualification remain open.


### Native slab thickness package/render support — 2026-09-10

Per-floor slab depth now crosses project packages in centimetres/metres, preserving
legacy web/native defaults. Native decoding and package merging retain/validate
the value; selected-floor render exports and single-storey previews use the saved
depth below zero. Native Catalyst build and 16 tests passed, as did Svelte checks,
web build and two Chromium/WebKit workflows. The 915-test web run had one stress
test timeout during native compilation; its six-test file passed in isolation.
See [validation](docs/native-slab-thickness-validation.md). Native controls,
room-shaped slabs, stair/courtyard openings, stacked native preview/elevations and
physical qualification remain open.


### Native slab editing controls — 2026-09-10

The native Statistics & Defaults sheet now edits each floor's slab depth, with
fractional unit-aware input, validation, default reset and snapshot undo. Final
Catalyst build and 17 tests passed. Native UI/visual checks verified imperial
editing, invalid recovery, reset and undo. See
`openplan3d-ios/docs/native-slab-controls-validation.md`. Native room-shaped slabs,
openings, stacked preview/elevations and physical-device qualification remain open.


### Native stacked floor preview — 2026-09-10

Native edited-plan previews now separate populated floors by saved elevation,
using legacy 3 m level spacing and per-floor slab depths. Elevations cross the
package bridge with unit conversion and reset/validation support. Single-floor
portable exports remain at local zero. All 916 web tests, Svelte checks/build,
two Chromium/WebKit package workflows and 21 native Catalyst tests passed. Native
three-storey import/visual review passed. See
[validation](docs/native-floor-stack-validation.md). Native elevation controls,
room-shaped slabs, openings, curved/sloped walls and device qualification remain open.


### Native floor elevation controls — 2026-09-10

The native defaults sheet now edits per-floor elevations with fractional/negative
input, validation, default reset and undo. Catalyst build and 22 tests passed;
native UI/visual checks verified edits, invalid recovery, resets and undo. See
`openplan3d-ios/docs/native-elevation-controls-validation.md`. Native room-shaped
slabs, openings, curved/sloped walls and physical-device qualification remain open.


### Room-shaped native slabs — 2026-09-10

Native previews/render exports now use closed straight-wall room faces, preserving
concave recesses and disconnected-room gaps with saved slab depth/elevation.
Crossings, T-junctions and duplicate edges are handled; open walls/furniture alone
create no slab. Catalyst build and 25 tests plus native visual QA passed. See
`openplan3d-ios/docs/native-room-slabs-validation.md`. Courtyard/stair voids,
interior-face area agreement, curves, large-graph performance and device gates
remain open.


### Native room graph performance — 2026-09-10

Native slab boundary detection now filters wall pairs and uses spatial vertex
lookup. A local 2,000-wall/500-room fixture improved from 2.25 s to 0.069 s while
retaining all rooms. Catalyst build and 28 tests passed, including dense rotated
grids and snapping-boundary coverage. See
`openplan3d-ios/docs/native-room-graph-performance.md`. Worst-case memory and
physical-device profiling remain open alongside voids and area parity.

### Native graph budgets and partition preprocessing — 2026-09-10

Native preview/export now enforce graph and slab triangle budgets, with a
localized preview error for excessive geometry. Dangling wall trees are removed
from boundary tracing while preserving the original walls in the scene.
Catalyst build and 32 selected tests passed, including pathological limits,
branching partitions, and a 1,500-segment detached tree. See native
`docs/native-room-graph-limits-validation.md` and
`docs/native-partition-preprocessing-validation.md`. This does not complete
nested boundaries, courtyard/stair holes, area parity, or device profiling.

### Nested web room slabs and finishes — 2026-09-10

Nested room rings now partition active/stacked slab geometry and active finishes
without overlapping the child room. Strict containment excludes touching and
crossing rings; portable scene exports retain the hole geometry. All 919 unit
tests, four Chromium/WebKit slab workflows, Svelte diagnostics, and build passed.
See [validation](docs/nested-room-slabs-validation.md). Explicit courtyard/stair
voids, nested 2D fills/area accounting, native nesting, and wall-face areas remain
open.

### Nested room net areas — 2026-09-10

Room detection now subtracts immediate nested footprints before rounding; area
labels and summaries no longer double-count contained rooms. Area Summary uses
current resolved geometry instead of stale saved areas, preserving room metadata.
All 921 unit tests, 18 Chromium/WebKit slab/modal workflows, Svelte checks, and
build passed. See [validation](docs/nested-room-area-validation.md). Nested 2D
fills, explicit courtyard/stair openings, native nesting, interior-face areas,
and physical measurement qualification remain open.

### Nested 2D room fills and exports — 2026-09-10

Parent room colors and floor patterns now clip around immediate nested rooms in
the 2D editor. PNG/PDF plan images and SVG use compound paths, avoiding blended
overlap colors. All 921 unit tests, four Chromium/WebKit slab workflows with
downloaded-image color checks, Svelte checks, and build passed. See
[validation](docs/nested-room-fills-validation.md). Explicit openings, nested
label placement/selection, native nesting, and physical qualification remain open.

### Nested room selection — 2026-09-10

Room and furniture-guide hit testing now selects the smallest enclosing footprint
instead of the first room. Closest labels win, with innermost-room tie-breaking
for coincident anchors; moved labels retain their saved positions. All 922 unit
tests, six Chromium/WebKit label/slab workflows, Svelte checks, and build passed.
See [validation](docs/nested-room-selection-validation.md). Automatic label
placement, explicit openings, native nesting, and physical gestures remain open.

### Interior default room labels — 2026-09-10

Default label anchors now lie inside concave/nested visible floors, shared across
2D/3D, hit testing, Fit, and image/vector/CAD export labels. Saved offsets retain
their coordinate convention; dragging starts at the displayed anchor and undo
restores automatic placement. All 923 unit tests, Svelte checks/build, eight
browser regressions and two corrected Chromium/WebKit nested workflows passed.
See [validation](docs/interior-room-label-validation.md) for the coordinate-test
failure and rerun. Full text collision handling, stale Room Properties areas,
explicit openings, native nesting, and physical qualification remain open.

### Current areas in Room Properties — 2026-09-10

Room Properties now resolves selected geometry instead of displaying stale saved
areas, retaining boundary-matched names and finishes. The nested fixture verifies
20/12/4 m² despite saved 999 m² values. All 923 unit tests, Svelte checks/build,
five initial browser workflows, and one isolated Chromium timeout rerun passed.
See [validation](docs/room-properties-area-validation.md). Explicit openings,
native nesting, full text collisions, and physical qualification remain open.

### Enclosed floor opening authoring — 2026-09-10

Room Properties now provides Open to floor below. The saved room flag removes
its active/stacked slab and finish, leaves the surrounding nested hole intact,
and excludes its area. Editor and image/vector fills leave the opening empty.
Undo/redo, JSON reimport, and web metadata preservation through native package
returns are covered. All 926 unit tests, checks/build, and four final Chromium/
WebKit workflows passed. See [validation](docs/floor-opening-validation.md),
including the onboarding-test race correction. Arbitrary/stair-derived holes,
inter-floor ceiling coordination, native opening authoring/rendering, and
physical qualification remain open.

### Native room boundary and opening metadata — 2026-09-10

Native documents and package merges now retain optional boundary wall IDs and
floor-opening intent, including explicit resets. Web package imports use those
boundaries to distinguish nested rooms with coincident label centers; exports
reuse existing wall identities. All 927 web unit tests, Svelte checks/build, and
33 selected Catalyst tests passed. Four Chromium/WebKit package and nested-slab
workflows also passed. See
[validation](docs/native-floor-opening-metadata-validation.md). Native opening
geometry/authoring, arbitrary holes, and ceiling coordination remain open.

### Native nested slabs and opening geometry — 2026-09-10

Native edited-plan previews and portable render exports now exclude nested room
rings and honor floor-opening metadata. Catalyst build and all 36 selected tests
passed, including watertight net volumes, floor coverage, multiple holes, input
reversal, stacked floor isolation, and exported openings. See
`openplan3d-ios/docs/native-nested-slabs-validation.md`. Native opening controls
and 2D/area display, arbitrary cuts, ceiling coordination, and device QA remain open.

### Native floor-opening controls and presentation — 2026-09-10

Native Room Properties now edits floor-opening intent. Native room labels and
statistics exclude opening area; canvas/SVG omit the marked room's color fill.
Catalyst build and all 39 selected tests passed. See
`openplan3d-ios/docs/native-opening-controls-validation.md`. Native boundary-aware
raster association, duplicate-label totals, measurement parity, arbitrary cuts,
ceiling coordination, and device/UI QA remain open.

### Native boundary-associated raster regions — 2026-09-10

Native rooms with explicit boundary IDs retain area/fill association when labels
move or share centers. Auto-Label recognizes those regions, and raster bounds
now depend only on walls. Catalyst build and all 42 selected tests passed. See
`openplan3d-ios/docs/native-room-regions-validation.md`. Automatic native boundary
assignment, duplicate-label totals, batch performance, measurement parity,
arbitrary cuts, ceiling coordination, and device/UI QA remain open.

### Native room association batching — 2026-09-10

Native canvas, statistics, Auto-Label, and SVG reuse floor association work across
labels. Catalyst build and all 43 selected tests passed; a local 16-room fixture
returned identical seeds in 0.315 s batched versus 5.915 s individually. See
`openplan3d-ios/docs/native-room-batch-validation.md`. Per-region raster costs,
automatic boundary assignment, duplicate-label totals, larger/device profiling,
and measurement parity remain open.

### Native duplicate-label area totals — 2026-09-10

Native statistics now count each labelled raster region once per floor and
exclude regions marked open even when duplicate labels disagree. Catalyst build
and all 45 selected tests passed. See
`openplan3d-ios/docs/native-duplicate-area-validation.md`. Automatic boundary
assignment, duplicate-label presentation, batch raster work, measurement parity,
arbitrary cuts, ceiling coordination, and device QA remain open.

### Native automatic boundary assignment — 2026-09-10

New native room labels now receive boundary IDs when their walls reconstruct an
unambiguous room; moving associated labels preserves those IDs. Catalyst build
and all 47 selected tests passed, including nested/shared-wall rooms and JSON
retention. See `openplan3d-ios/docs/native-boundary-assignment-validation.md`.
Deliberate reassociation, ambiguous graphs, duplicate-label presentation, batch
raster work, measurement parity, arbitrary cuts, and device QA remain open.

### Native deliberate room reassignment — 2026-09-10

Native Room Properties can deliberately reassign a label to the room beneath
its position, preserving metadata and retaining the old association on failure.
Catalyst build and all 49 selected tests passed. See
`openplan3d-ios/docs/native-room-reassignment-validation.md`. Ambiguous graphs,
duplicate-label presentation, batch raster work, measurement parity, arbitrary
cuts, ceiling coordination, and device/UI QA remain open.

### Native room controls UI check — 2026-09-10

Interactive Catalyst QA verified opening/reassignment controls, Undo/Redo, and
save/reopen. Stale selection-bar area and duplicate preview/PDF summary totals
were corrected; final UI showed 0 ft² for the selected opening and 319 ft² for
the saved QA plan. All 49 selected tests passed. See
`openplan3d-ios/docs/native-room-ui-validation.md`. Duplicate-label overlap/fills,
PDF visual checks, ambiguous graphs, raster batching, and device QA remain open.

### Native duplicate-room fills — 2026-09-10

Native canvas/SVG paint each labelled region once and omit it when any duplicate
marks it open. All 51 selected tests passed; interactive QA confirmed the inner
opening lost its stale green fill while retaining the outer fill and area total.
See `openplan3d-ios/docs/native-duplicate-fills-validation.md`. Duplicate text
overlap, raster batching, measurement parity, ambiguous graphs, and device QA
remain open.

### Native overlapping room label layout — 2026-09-10

Native canvas/SVG separate colliding room labels without changing saved anchors.
Editor selection follows displayed bounds, and drags retain their anchor offset.
All 53 selected Catalyst tests passed; native visual QA confirmed three formerly
overlapping labels are readable. See
`openplan3d-ios/docs/native-label-layout-validation.md`. Viewport edges, dense
layouts, other-object collisions, and pointer/touch/device qualification remain open.

### Native label viewport edges — 2026-09-10

Native canvas/SVG label placement moves fitting labels inward at viewport edges
and tries upward stacking near the bottom. Selection shares those bounds. All 54
selected Catalyst tests passed. See
`openplan3d-ios/docs/native-label-edges-validation.md`. Dense/oversized labels,
toolbar/other-object collisions, and physical gesture qualification remain open.

### Native dense-label column fallback — 2026-09-10

Native labels use nearby columns when vertical stacking cannot fit. The bounded
search preserves text sizes and saved anchors. All 55 selected Catalyst tests
passed, including a nine-label multi-column case. See
`openplan3d-ios/docs/native-dense-label-validation.md`. Over-capacity layouts,
oversized text, toolbar/other-object occlusion, and physical gestures remain open.

### Native statistics floor isolation — 2026-09-10

Statistics no longer uses a whole-document area fallback for unresolved rooms.
An unenclosed upper room cannot borrow ground-floor area at the same position;
ordinary unresolved rooms remain unknown and openings contribute zero. All 56
selected Catalyst tests passed. See `openplan3d-ios/docs/native-statistics-floor-isolation-validation.md`.
Raster batching, measurement parity, ambiguous graphs, PDF visual checks, and
physical-device qualification remain open.

### Native Statistics raster batching — 2026-09-10

Statistics now rasterizes once per floor and visits each requested component
once, reusing results for duplicate labels and unresolved exterior regions.
All 57 selected Catalyst tests passed, retaining duplicate/opening and floor
isolation behavior. See `openplan3d-ios/docs/native-statistics-batch-validation.md`.
Renderer fill batching, device performance qualification, measurement parity,
PDF visual checks, and other NEXT work remain open.

### Native fill-owner raster batching — 2026-09-10

Canvas/SVG fill ownership now shares Statistics’ per-floor batch measurement
helper, preserving first-colored-label ownership and opening suppression. All
58 selected Catalyst tests passed, including distinct rooms with duplicate
labels and an opening. See `openplan3d-ios/docs/native-fill-owner-batch-validation.md`.
Fill-rectangle batching, renderer area queries, device performance qualification,
measurement parity, PDF visual checks, and other NEXT work remain open.

### Native renderer room-area batching — 2026-09-10

Room label, property, and selection area queries now share a bounded batch
cache keyed by walls and room associations. All 59 selected Catalyst tests
passed, including cache refresh after label, level, boundary, and wall edits
and opening toggles. See `openplan3d-ios/docs/native-renderer-area-batch-validation.md`.
Fill-rectangle batching, device performance qualification, measurement parity,
PDF visual checks, and remaining NEXT work are still open.

### Native raster seed validation — 2026-09-10

Single-seed area and fill queries now reject nonfinite and overflowing grid
coordinates before integer conversion. All 60 selected Catalyst tests passed,
including invalid inputs across single and batch queries and valid interiors.
See `openplan3d-ios/docs/native-raster-seed-validation.md`. Fill-rectangle batching, device
performance qualification, measurement parity, PDF visual checks, and remaining
NEXT work are still open.

### Native full-target integration check — 2026-09-10

The complete Catalyst FloorPlanTests target passed after the room/model/renderer
changes: 220 tests executed, two optional worker-integration skips, zero failures.
The available private-scan byte-preservation test also passed. See `openplan3d-ios/docs/native-room-full-integration-validation.md`.
Fresh simulator, interactive and physical-device checks, worker integration,
signed release validation, and the broader NEXT requirements remain open.

### Native iOS full-target integration check — 2026-09-10

The complete FloorPlanTests target passed on iPhone 17 Pro / iOS 26.5 simulator:
220 tests executed, two optional worker-integration skips, zero failures. This
complements the Catalyst run after the room/model/renderer changes. See `openplan3d-ios/docs/native-room-ios-integration-validation.md`.
Physical gestures/capture, measured calibration, device performance, signed
release validation, and the broader NEXT requirements remain open.

### Native color-fill grid batching — 2026-09-10

Renderer room fills now share a 10 cm wall grid per floor and a bounded cache
of rectangles. Batch output matches individual fills and opening toggles refresh
correctly. The full Catalyst target passed: 221 tests, two optional skips, zero
failures. See `openplan3d-ios/docs/native-fill-grid-batch-validation.md`. SVG batching, shared
component/run indexing, device performance, area parity, PDF visual checks, and
remaining NEXT work stay open.

### Native SVG room batching — 2026-09-10

SVG label areas and fill ownership share batch region measurements, and room
color paths share one fill grid per floor. Existing geometry and presentation
conventions remain. Catalyst build and all 25 selected tests passed. See
`openplan3d-ios/docs/native-svg-batch-validation.md`. Shared fill-component indexing,
device performance, area parity, PDF visual checks, and other NEXT work remain.

### Native room batch measurements — 2026-09-10

The 16-room fixture now verifies exact batch/individual area and fill output.
A local Catalyst run measured areas at 0.075 s batch / 0.867 s individual and
fills at 0.175 s / 0.525 s. All ten room-region tests passed. See `openplan3d-ios/docs/native-room-batch-measurement.md`.
These are single-run debug measurements, not device budgets. Shared fill indexing,
active-editing/device measurements, area parity, PDF QA, and other NEXT work remain.

### Native fill component indexing — 2026-09-10

Batch color fills now share component traversal and one row scan, preserving
ordered rectangles and rejecting exterior regions. The full Catalyst target
passed: 221 tests, two optional skips, zero failures. A local 16-room run measured
0.024 s batch / 0.300 s individual with exact output equality. See `openplan3d-ios/docs/native-fill-component-validation.md`.
Device latency/memory targets, area parity, PDF visual checks, and remaining
NEXT requirements stay open.

### Native PDF per-floor summaries — 2026-09-10

Each floor PDF page now reports its own room count and area. Twelve opening
presentation tests passed, including PDF text and rendered-wall assertions.
Both pages of a metric Letter fixture were visually reviewed: ground fill/area
and upper opening with zero label area are correct. See `openplan3d-ios/docs/native-pdf-floor-summary-validation.md`.
Long titles, paper-size/large-plan coverage, device memory/share sheets, print
scale, and broader NEXT requirements remain open.

### Native PDF long-title layout — 2026-09-10

PDF notes, up-to-two-line titles, and statistics now occupy separate footer rows.
Thirteen targeted tests passed; Letter, A4, and A3 long-title fixtures were
rendered and visually checked without footer overlap. See `openplan3d-ios/docs/native-pdf-title-layout-validation.md`.
Large-plan/device memory, physical sharing, actual print scale, and broader NEXT
requirements remain open.

### Native export canvas bounds — 2026-09-10

PNG/PDF plan bitmaps now cap both axes at 2080 pixels, preventing extreme
portrait aspect ratios from allocating unbounded-height images. PDF scale uses
the actual fitted transform. All 14 targeted tests passed, including an actual
4-by-3000 m PNG export at 920 by 2080 pixels. See `openplan3d-ios/docs/native-export-canvas-bounds-validation.md`.
Total device memory, physical printing/sharing, and other NEXT work remain open.

### Native export filenames — 2026-09-10

PNG/PDF/SVG share UTF-8-bounded filename sanitization with a hash suffix for
truncated titles, preserving full document/export content. Fifteen targeted
tests passed, including actual long CJK/emoji PNG and SVG exports. See
`openplan3d-ios/docs/native-export-filenames-validation.md`. Physical sharing/storage recovery,
device memory, and broader NEXT requirements remain open.

### Native PDF failure and atomic publication — 2026-09-10

PDF page-render failure now fails the export rather than skipping a page.
Staging plus atomic publication preserves previous same-name exports on failure;
PNG writes are atomic too. All 16 targeted tests passed, including failed-render
byte preservation and successful retry. See `openplan3d-ios/docs/native-export-atomic-validation.md`.
Disk/quota faults, device sharing, full/iOS revalidation, and other NEXT work remain.

### Native iOS export integration — 2026-09-10

The complete iPhone 17 Pro / iOS 26.5 simulator target passed: 226 tests, two
optional worker-integration skips, zero failures. One title assertion was fixed
to tolerate an observed line break; visual review confirmed the title was intact.
See `openplan3d-ios/docs/native-ios-export-integration-validation.md`. Physical sharing, quota faults,
device memory, printing/release qualification, and remaining NEXT work stay open.

### Native export write-failure recovery — 2026-09-10

Actual PDF/PNG/SVG destination-directory collisions now have regression coverage:
export fails, preserves existing contents, cleans PDF staging, and succeeds on
retry after the obstruction is removed. All 17 targeted Catalyst tests passed.
See `openplan3d-ios/docs/native-export-write-failure-validation.md`. Full-disk/quota/permission faults,
process crashes, physical share sheets, and other NEXT work remain open.

### Native wall defaults in rendering and measurements — 2026-09-10

Statistics, raster regions, canvas/SVG strokes, and native 3D walls now honor
document height/thickness defaults while preserving per-wall overrides. Renderer
caches refresh when defaults change. The full Catalyst target passed: 228 tests,
two optional skips, zero failures. See `openplan3d-ios/docs/native-wall-defaults-validation.md`.
Exterior-wall inference, UI/iOS checks, area parity, device measurement, and other
NEXT requirements remain open.

### Native wall-default editor/export consumers — 2026-09-10

Properties and Elevation now display effective wall defaults. Edited-render
export validates those same dimensions and retains explicit override precedence.
Catalyst build and all 30 selected tests passed. See `openplan3d-ios/docs/native-wall-default-consumers-validation.md`.
Interactive UI/iOS qualification, exterior inference, area parity, and remaining
NEXT requirements stay open.

### Native raster thickness/work bounds — 2026-09-10

Rasterization validates effective thickness and caps candidate-cell stamping
work before integer conversion, returning unknown regions on invalid/over-budget
input. Full Catalyst validation passed: 230 tests, two optional skips, zero
failures. See `openplan3d-ios/docs/native-raster-thickness-budget-validation.md`. Device latency, resource-limit
UI feedback, area parity, and remaining NEXT requirements stay open.

### Native partial-area feedback — 2026-09-10

Statistics marks incomplete totals as partial and no longer assumes all missing
areas mean outside labels. PDF footers identify measured subtotals and unmeasured
counts. Twenty targeted tests and a focused rerun passed; the partial PDF footer
was visually checked. See `openplan3d-ios/docs/native-partial-area-feedback-validation.md`. Exact failure
diagnostics, interactive/device checks, area parity, and other NEXT work remain.

### Native iOS wall/area integration — 2026-09-10

The full iPhone 17 Pro / iOS 26.5 simulator target passed after wall defaults,
raster guards, export write-failure checks, and partial-area feedback: 231 tests,
two optional skips, zero failures. See `openplan3d-ios/docs/native-ios-wall-area-integration-validation.md`.
Interactive/device qualification, quota faults, performance, printing, releases,
and remaining NEXT requirements stay open.

### Native preview partial-area notice — 2026-09-10

The preview marks partial or unavailable area and reports unmeasured-room
counts. Saved-plan reload coverage verifies partial, all-unresolved, and
resolved-plus-opening states. Catalyst build and all 31 selected tests passed.
See `openplan3d-ios/docs/native-preview-partial-area-validation.md`. Interactive/device qualification,
failure diagnostics, area parity, and remaining NEXT requirements stay open.

### Native partial-area interactive check — 2026-09-10

A separate stored-ZIP QA fixture imported successfully. Catalyst preview showed
355 ft² with one unmeasured room; Statistics displayed partial living/gross totals
and the full warning without clipping. See `openplan3d-ios/docs/native-partial-area-ui-validation.md`.
Device/touch checks, all-unresolved interactive layout, diagnostics, area parity,
and remaining NEXT requirements stay open.

### Native area help accuracy — 2026-09-10

Room Properties explains unresolved measurements without assuming an outside
label. Statistics describes distinct measured regions, opening exclusions, and
the approximate half-wall-footprint formula. Catalyst build passed; see `openplan3d-ios/docs/native-area-help-validation.md`.
Interactive/device qualification, exact diagnostics, area parity, and remaining
NEXT requirements stay open.

### Native iOS preview integration — 2026-09-10

The full iPhone 17 Pro / iOS 26.5 simulator target passed after preview notices
and area-help corrections: 232 tests, two optional skips, zero failures. The
partial/unavailable/complete saved-plan regression passed. See `openplan3d-ios/docs/native-ios-preview-integration-validation.md`.
Interactive/device checks, area parity, performance, release gates, and remaining
NEXT requirements stay open.

### Cross-platform area baseline — 2026-09-10

Paired 4 × 3 m rectangle fixtures measured three wall thicknesses. At 20 cm,
web reports 12.00 m², native 10.31 m², and exact interior faces give 10.64 m².
This isolates centerline/interior convention differences and native raster error.
Eleven native region tests and the web characterization test passed. See `openplan3d-ios/docs/area-convention-baseline.md`.
Convention adoption, general geometry fixtures, numerical correction, and the
remaining NEXT requirements stay open.

### Native raster footprint correction — 2026-09-10

Wall cells now use footprint containment instead of filled square stamps. All
three rectangle references match exact interior areas; rotated/translated rooms
pass a bounded-error regression. Full Catalyst: 233 tests, two skips, zero failures;
then all 12 region tests passed. See `openplan3d-ios/docs/native-raster-footprint-validation.md`.
Fresh iOS/UI checks, runtime budgets, general geometry and web area parity remain
open alongside the other NEXT requirements.

### Native iOS raster footprint integration — 2026-09-10

Full iPhone 17 Pro / iOS 26.5 validation passed after the wall-footprint fix:
234 tests, two optional skips, zero failures, including rotated/translated
room references. See `openplan3d-ios/docs/native-ios-raster-footprint-validation.md`. Interactive/device checks, general
error bounds, performance budgets, area parity and remaining NEXT work stay open.

### Native interior-area shape references — 2026-09-10

Concave L, shared-partition and nested-room measurements match independent
interior-face references; an inner floor opening correctly removes only its area.
All 14 Catalyst region tests passed. See `openplan3d-ios/docs/native-interior-shapes-validation.md`. General geometry,
area parity, device/performance checks and remaining NEXT work stay open.

### Native raster reuse experiment — 2026-09-10

A candidate-loop shortcut passed 14 region tests but showed no reliable timing
improvement in the debug sample; it was removed. See `openplan3d-ios/docs/native-raster-reuse-experiment.md`.
Repeated release measurements/profiling are needed before another optimization;
production geometry and the remaining NEXT requirements are unchanged.

### Native Release room measurements — 2026-09-10

Three optimized M1 Max runs passed the 16-room batch/individual agreement check.
Median batch times: association 12.94 ms, area 6.54 ms, fills 1.85 ms. See `openplan3d-ios/docs/native-release-room-measurement.md`.
Local test signing required hardened runtime disabled by command-line override;
release packaging, active-editor/device budgets and other NEXT work remain open.

### Native split/merge identity regression — 2026-09-10

Split/merge coverage verifies stale-boundary detection, deliberate reassociation,
ID/note preservation, JSON reload, snapshot restoration and deduplicated merged
area. All 15 Catalyst region tests passed. See `openplan3d-ios/docs/native-split-merge-identity-validation.md`. Interactive
undo/usability, schedule behavior, area parity and other NEXT work remain open.

### Native unresolved-area drawing labels — 2026-09-10

SVG and full-detail plan labels explicitly show unavailable area; low-zoom
labels stay compact and floor openings show zero. All 21 Catalyst presentation
tests passed, including clearing the notice after resolution. See `openplan3d-ios/docs/native-unresolved-labels-validation.md`.
Dense-plan visual/device checks, exact diagnostics and remaining NEXT work stay open.

### Native editor toolbar framing — 2026-09-10

Initial editor fit now reserves vertical space for floating tools. A previously
hidden unmeasured-room label is visible above the toolbar in fresh Catalyst QA;
22 presentation tests passed. See `openplan3d-ios/docs/native-editor-toolbar-fit-validation.md`. Read-only preview framing,
adaptive toolbar sizes, device checks and remaining NEXT work stay open.

### Native preview safe-area framing — 2026-09-10

Read-only Plan now fits between measured top/bottom safe-area content. Fresh
Catalyst QA showed the complete fixture and unavailable-area label above the
card; switching to 3D remained normal. Build passed; see `openplan3d-ios/docs/native-preview-safearea-validation.md`.
Device, Dynamic Type, full-screen and remaining NEXT checks stay open.

### Native iOS label/framing integration — 2026-09-10

The full iPhone 17 Pro / iOS 26.5 target passed after geometry references,
split/merge, unavailable labels and preview/editor framing: 239 tests, two
optional skips, zero failures. See `openplan3d-ios/docs/native-ios-label-framing-validation.md`. Physical-device/layout
qualification, area parity, release gates and remaining NEXT work stay open.

### Native furniture footprint framing — 2026-09-10

Document bounds include rotated furniture footprints, correcting center-only
fitting of furniture-only plans and outlying objects. Full Catalyst validation:
240 tests, two skips, zero failures. See `openplan3d-ios/docs/native-furniture-fit-validation.md`. Visual/iOS/device
checks, decorative/text extents and remaining NEXT requirements stay open.

### Native furniture-only export check — 2026-09-10

The rotated-table fixture now exercises actual PNG export. The focused test
passed and visual inspection showed the entire table/chair details with margins.
See `openplan3d-ios/docs/native-furniture-export-validation.md`. Broader categories/formats, device checks and remaining
NEXT requirements stay open.

### Native iOS furniture framing integration — 2026-09-10

Full iPhone 17 Pro / iOS 26.5 validation passed after rotated furniture bounds
and actual PNG export coverage: 240 tests, two optional skips, zero failures.
See `openplan3d-ios/docs/native-ios-furniture-fit-validation.md`. Broader visuals, physical-device checks, release gates
and remaining NEXT work stay open.

### Native measured toolbar framing — 2026-09-10

Editor fit uses measured top/bottom control stacks, including context actions,
with a stable viewport during a drag. Catalyst build passed; see `openplan3d-ios/docs/native-adaptive-toolbar-framing.md`.
Expanded-control/cancelled-gesture/Dynamic Type/iOS interactive checks and the
remaining NEXT requirements stay open.

### Native pending drag cancellation — 2026-09-10

Gesture-state reset now restores a cancelled pending edit/pan and releases its
frozen fitting viewport. Normal completion keeps its undo behavior. Catalyst
build passed; see `openplan3d-ios/docs/native-drag-cancellation.md`. Runtime gesture ordering, interruption,
pinch/device checks and remaining NEXT requirements stay open.

### Native isolated UI QA setup — 2026-09-10

Multiple running builds shared one bundle identifier, making the adaptive UI
check inconclusive. A uniquely identified QA copy now launches; its synthetic
fixture import was still pending at last observation. See `openplan3d-ios/docs/native-isolated-ui-qa.md`.
Inspect that same import before retrying. Gesture/layout qualification and all
remaining NEXT requirements stay open.

### Sandboxed QA adaptive-layout/drag check — 2026-09-10

Preserving original sandbox entitlements fixed the isolated QA setup; its
synthetic import completed. Fresh UI checks confirmed adaptive context-toolbar
fitting, a completed label drag and undo restoration. See `openplan3d-ios/docs/native-sandbox-qa-validation.md`.
Use OpenPlan3D-Sandbox-QA.app for new checks. Actual cancellation, pinch/device
interaction and remaining NEXT requirements stay open.

### Native iOS adaptive editor integration — 2026-09-10

The full iPhone 17 Pro / iOS 26.5 target passed after measured toolbars and
pending-drag cancellation: 240 tests, two optional skips, zero failures. See
`openplan3d-ios/docs/native-ios-adaptive-editor-validation.md`. This does not simulate interrupted gestures; cancellation,
pinch/device checks and remaining NEXT requirements stay open.

### Reproducible sandboxed QA helper — 2026-09-10

A checked-in helper creates a distinct QA app while preserving sandbox
entitlements and refusing existing destinations. Syntax, signing, entitlement
equality and overwrite-refusal checks passed. See `openplan3d-ios/docs/sandbox-qa-helper.md`.
Runtime/device qualification, signed releases and remaining NEXT work stay open.

### Native Fit Current Floor action — 2026-09-10

A new accessible editor action recomputes current-floor bounds and resets pan/
zoom. Build and sandboxed Catalyst UI checks passed: a cropped, panned sample
returned fully into view without an undo entry. See `openplan3d-ios/docs/native-fit-current-floor-validation.md`.
Multi-floor/changed-geometry/zoom/device checks and remaining NEXT work stay open.

### Native refit after geometry changes — 2026-09-10

A sandboxed UI check moved furniture beyond the original walls; Fit included
the new extent. One Undo restored the edit, and refitting restored the original
view without extra history. See `openplan3d-ios/docs/native-fit-current-floor-validation.md`. Multi-floor, zoom/iOS/device
checks and remaining NEXT requirements stay open.

### Native iOS Fit integration — 2026-09-10

The full iPhone 17 Pro / iOS 26.5 test target passed with Fit Current Floor:
240 tests, two optional skips, zero failures. See `openplan3d-ios/docs/native-fit-current-floor-validation.md`.
This covers compilation and regressions; multi-floor, zoom recovery, iOS UI
and physical-device checks remain open alongside the remaining NEXT work.

### Native automatic floor-switch fit — 2026-09-10

Switching floors now resets bounds/pan/zoom to the active floor; initial loading
uses that floor too. Catalyst build and an isolated empty-to-populated floor UI
check passed, with no extra undo entry. See `openplan3d-ios/docs/native-floor-switch-fit-validation.md`.
Distant populated floors, zoom, iOS/device checks and remaining NEXT work stay open.

### Native removed-floor recovery — 2026-09-10

Undoing creation of the active floor no longer leaves a nonexistent floor
selected. The editor selects an existing floor and refits without adding history.
Catalyst build and before/after UI checks passed; see `openplan3d-ios/docs/native-floor-undo-recovery.md`.
Broader history, multi-floor and iOS/device qualification remain open.

### Native iOS floor-history integration — 2026-09-10

The full iPhone 17 Pro / iOS 26.5 target passed after automatic floor fitting
and removed-floor recovery: 240 tests, two optional skips, zero failures.
See `openplan3d-ios/docs/native-floor-undo-recovery.md`. iOS UI, broader history/navigation sequences
and physical-device qualification remain open with the wider NEXT backlog.

### Native elevation floor consistency — 2026-09-10

Reproduced an old-floor elevation remaining visible after selecting an empty
upper floor. Floor changes now clear mismatched elevation targets and return
to Plan; the canvas also requires matching floor ownership. Catalyst build
passed. See `openplan3d-ios/docs/native-elevation-floor-switch.md`; post-fix UI/iOS checks remain pending.

### Native elevation floor validation — 2026-09-10

Fresh Catalyst UI confirmed floor switching clears the old elevation and restores
Plan tools. The full iOS 26.5 target passed: 240 tests, two optional skips, zero
failures. See `openplan3d-ios/docs/native-elevation-floor-switch.md`. Same-floor wall history, iOS interaction
and broader device/NEXT qualification remain open.

### Native elevation history recovery — 2026-09-10

Undo/Redo now leave elevation when its wall disappears; direct deletion chooses
a replacement only on the active floor. Catalyst build and a drawn-wall Undo UI
check passed. See `openplan3d-ios/docs/native-elevation-history.md`. Redo/deletion, iOS/device and wider
NEXT qualification remain open.

### Native elevation Redo/iOS validation — 2026-09-10

Live Catalyst Redo removal restored Plan controls from the removed wall's
elevation. Full iOS integration passed: 240 tests, two optional skips, zero
failures. See `openplan3d-ios/docs/native-elevation-history.md`. Cross-floor direct deletion and broader
iOS/device/NEXT qualification remain open.

### Native cross-floor elevation deletion check — 2026-09-10

Deleting the upper floor's sole wall from elevation returned to Plan without
selecting a ground-floor wall. Temporary floor/geometry changes were undone.
See `openplan3d-ios/docs/native-elevation-history.md`. Elevation counter numbering still spans all floors
while cycling is floor-specific; align that counter in a follow-up. Broader
iOS/device qualification and remaining NEXT requirements stay open.

### Native floor-relative elevation counter — 2026-09-10

The elevation title and previous/next controls now share the active floor's wall
collection, so their index/total agree. Catalyst build passed. See `openplan3d-ios/docs/native-elevation-counter.md`.
Fresh multi-floor UI verification and broader iOS/device work remain open.

### Native elevation counter UI verification — 2026-09-10

Live Catalyst checks showed upper-floor counts of 1/1 and 2/2, with forward/back
wrap between 1/2 and 2/2 and matching lengths, excluding ground-floor walls.
Temporary edits were undone. See `openplan3d-ios/docs/native-elevation-counter.md`. Broader iOS/device
and remaining NEXT qualification stay open.

### Native trace-image history preservation — 2026-09-10

New tracing imports use unique filenames, preserving prior image bytes for
Undo. The displayed cache now follows the restored filename. Catalyst build
and nine package regressions passed. See `openplan3d-ios/docs/native-trace-history.md`. Live two-image
history and iOS integration remain pending with the broader NEXT backlog.

### Native trace-history iOS integration — 2026-09-10

The full iOS 26.5 target passed after trace-history preservation and elevation
counter changes: 240 tests, two optional skips, zero failures. See `openplan3d-ios/docs/native-trace-history.md`.
Direct two-image Undo/Redo UI and broader device/NEXT qualification remain open.

### Native desktop trace file import — 2026-09-10

Mac Trace Image now opens a local image file picker. File and Photos imports
share the same history-preserving save path; Catalyst build passed. See `openplan3d-ios/docs/native-trace-file-import.md`.
Live picker/two-image history checks and iOS integration remain pending.

### Native two-image trace history UI — 2026-09-10

The desktop file picker imported synthetic red/blue traces. Undo restored red
after removing it and importing blue; Redo restored blue. Temporary changes
were undone. See `openplan3d-ios/docs/native-trace-file-import.md`. Cancel/error, reopen/export and iOS
checks remain open with broader NEXT requirements.

### Native trace picker cancellation/iOS — 2026-09-10

Native Cancel returned without error or history changes. The full iOS 26.5
target passed: 240 tests, two optional skips, zero failures. See `openplan3d-ios/docs/native-trace-file-import.md`.
Invalid-file/write-failure, reopen/export and broader device checks remain open.

### Native corrupt trace rejection — 2026-09-10

The desktop picker rejected a synthetic corrupt PNG with an import error.
Dismissing it preserved disabled Undo and available Redo. See `openplan3d-ios/docs/native-trace-file-import.md`.
Write-failure, reopen/export and broader device/NEXT checks remain open.

### Native trace save/relaunch verification — 2026-09-10

A saved synthetic trace reappeared after quitting/relaunching the isolated QA
app and reopening its editor. The persisted plan references its unique image
file. See `openplan3d-ios/docs/native-trace-file-import.md`. Initial Draw a Plan's Done saved without
navigating away; investigate that behavior. Export/write-failure and broader
NEXT qualification remain open.

### Native editor dismissal fix — 2026-09-10

Editor Close/Done now explicitly clear the presenting view's cover state.
Catalyst build and fresh Draw a Plan → Done → library UI check passed.
See `openplan3d-ios/docs/native-editor-dismissal.md`. Review/error/iOS paths and broader NEXT work remain open.

### Native review-editor dismissal verification — 2026-09-10

Both Close and Done returned a reopened editor to its saved-plan preview in
the isolated Catalyst build, with unchanged element counts. See `openplan3d-ios/docs/native-editor-dismissal.md`.
Error paths, iOS integration and broader NEXT qualification remain open.

### Native editor dismissal iOS integration — 2026-09-10

The full iOS 26.5 target passed after explicit editor dismissal: 240 tests,
two optional skips, zero failures. See `openplan3d-ios/docs/native-editor-dismissal.md`. Load/save-error UI
and broader device/NEXT qualification remain open.

### Native save-error dismissal/retry verification — 2026-09-10

A controlled invalid destination in the isolated QA session kept the editor
open with an error. Restoring the original file preserved its hash; retry
succeeded and returned to preview. See `openplan3d-ios/docs/native-editor-dismissal.md`. Load-error UI,
full-disk/unsaved-edit cases and broader NEXT qualification remain open.

### Native load-error Close verification — 2026-09-10

A truncated QA plan showed recovery controls instead of an editable fallback.
Error-screen Close returned to preview; restoring the original preserved its
hash and allowed a normal reopen. See `openplan3d-ios/docs/native-editor-dismissal.md`. Broader recovery
and device/NEXT qualification remain open.

### Native unique trace package round trip — 2026-09-10

A new storage regression verifies unique trace reference/placement/scale and
exact JPEG bytes through export, independent import, reload and re-export.
All ten package tests passed on Catalyst. See `openplan3d-ios/docs/native-trace-file-import.md`. Export-dialog,
write-failure and broader device/NEXT checks remain open.

### Native iOS trace-package validation — 2026-09-10

All ten package tests passed on iOS 26.5, including unique trace reference and
JPEG preservation through export/import/re-export. See `openplan3d-ios/docs/native-trace-file-import.md`.
This focused run does not replace full-suite or device/UI qualification.

### Native unsaved edit save-retry evidence — 2026-09-10

A newly drawn wall survived a controlled save failure and was written on retry.
The editor remained open after this changed-document save, unlike the prior
unchanged-document check. See `openplan3d-ios/docs/native-editor-dismissal.md`. Investigate preview-refresh/
dismissal ordering; changed-document dismissal remains unresolved.

### Native deferred-refresh experiment — 2026-09-10

Moving preview refresh after dismissal did not fix the changed-document editor
remaining open. The experiment was fully reverted. A fresh QA run reproduced
the issue without save-failure injection; five walls were saved. See `openplan3d-ios/docs/native-editor-dismissal.md`.
Changed-document dismissal remains unresolved.

### Native dismissal delay clarification — 2026-09-10

Both previously open QA editors eventually returned to preview without more
clicks. Treat the issue as delayed dismissal; latency is unmeasured. A two-second
process sample during a new occurrence showed an idle main event loop, and
clearing selection did not immediately resolve it. See `openplan3d-ios/docs/native-editor-dismissal.md`.
Presentation timing remains under investigation.

### Native nonanimated-dismissal experiment — 2026-09-10

Disabling close-transition animations did not establish prompt dismissal after
a wall edit. The experiment was reverted. See `openplan3d-ios/docs/native-editor-dismissal.md`. Instrument
callback/state timing before choosing another fix; dismissal delay remains open.

### Native dismissal callback timing — 2026-09-10

Temporary instrumentation measured save/write/close callbacks completing in
9.3 ms, including Home setting its cover item to nil. No cover onDismiss event
appeared within the next 52.4 seconds. See `openplan3d-ios/docs/native-editor-dismissal.md`. Instrumentation
was removed; investigate state application/cover lifecycle next.

### Native dismissal timing controls — 2026-09-10

Measured dismissal at 95.0 s after wall dragging versus 0.54 s with no edit
and 0.53 s after tool selection only. A pan-only drag also delayed completion
(>18.8 s), so geometry changes are not required. See `openplan3d-ios/docs/native-editor-dismissal.md`.
Investigate canvas gesture lifecycle and distinguish app from input effects.

### Native drag completion instrumentation — 2026-09-10

Pan onEnded cleared its operation, gesture activity reset, and Save observed
no active drag/frozen viewport with gesture zoom 1.0. See `openplan3d-ios/docs/native-editor-dismissal.md`.
Temporary logging was removed; investigate lower-level presentation/input
behavior rather than resetting already-cleared app flags.

### Native stationary canvas click control — 2026-09-10

A canvas click without movement also delays dismissal despite cleared gesture
state and completed Save/Home close callbacks. Direct pointer Done activation
during the pending dismissal did not immediately resolve it. Movement is not
required; isolate canvas recognizers next. Details are in native
`docs/native-editor-dismissal.md`. No production source changes.

### Native canvas recognizer isolation — 2026-09-10

The dismissal delay reproduces in a diagnostic build with both canvas drag and
pinch recognizers removed (over 32 seconds after Home close). Removing pinch
alone also did not resolve it. Production source was restored; investigate
presentation and pointer-input behavior, not speculative drag-state resets.
See native `docs/native-editor-dismissal.md` for measured controls.

### Native dismissal scheduling controls — 2026-09-10

Transition logging plus a delayed diagnostic inspection produced prompt
dismissal in three controls, including a saved fifth wall. A fresh uninstrumented
build still showed the editor after saving; dispatching close asynchronously
also did not demonstrate a fix and was reverted. This remains timing-sensitive
and unresolved; see native `docs/native-editor-dismissal.md`. No production
gesture or scheduling workaround has been retained.

### Native trace write-failure qualification — 2026-09-10

A real permission-denied image write through the desktop picker reports an
error without changing session files or adding history. Undo still restores
the original red trace. QA directory permissions were restored and all four
file hashes verified unchanged. See native `docs/native-trace-file-import.md`.
Desktop export-dialog and live-device checks remain open.

### Native trace Save-dialog verification — 2026-09-10

Exported the saved trace project through the native Save dialog. ZIP integrity,
complete plan value and exact original JPEG bytes passed independent checks.
The options sheet required Escape before the queued export proceeded, so
unassisted dismissal remains open. See native `docs/native-trace-file-import.md`.

### Native trace bitmap pixel budget — 2026-09-10

Fixed the cached trace preview's 2,000-pixel limit: UIKit points and default
Retina renderer scale previously allowed oversized bitmaps. Import/reload now
check source pixel dimensions and render at scale 1, preserving original saved
image bytes. Four new preview regressions reproduced the defect; all 14 preview
and package tests pass on Catalyst and iOS Simulator. See native
`docs/native-trace-preview-pixels.md`. Peak import memory/device budgets remain open.

### Native trace thumbnail decoding — 2026-09-10

Reopen/history reload now requests a transformed ImageIO thumbnail directly
from the saved file at the 2,000-pixel limit, avoiding the previous full-image
UIImage drawing path. Source bytes stay intact; missing/corrupt files return
no preview. All 17 preview/package tests pass on Catalyst and iOS Simulator,
including file dimensions and EXIF rotation. See native
`docs/native-trace-preview-pixels.md`; peak import/device measurements remain open.

### Capability documentation refresh — 2026-09-10

Replaced the obsolete FEATURES mockup checklist with a web capability matrix
linked to regression tests, source and validation reports. Marked the old
comparison as historical, refreshed README package import/export coverage and
removed its fixed catalog count. Inspected the linked test scopes and verified
all 44 matrix file targets; `git diff --check` passed. No runtime tests were rerun
for documentation-only edits. Contributor/release templates and device gates remain open.

### Contributor and release workflow documentation — 2026-09-10

Added contributor setup/testing guidance, a minimal-fixture bug template, a PR
template and a release evidence checklist. Commands and browser isolation match
package scripts/Playwright/CI; the release checklist links the existing native,
Storage migration and billing gates rather than asserting they are complete.
README links both guides. Local links/frontmatter and diff checks passed; no
application tests were repeated for documentation-only changes.

### Native onboarding/handoff correction — 2026-09-10

Verified the existing native root README against shared schemes, bundle IDs and
platform minimums. Updated the linked native handoff with current resume guidance,
marked stale pause instructions historical, and qualified old test counts as dated
checkpoints. Setup documentation is present; native licensing/publication, final
release branding and device gates remain open.

### Reproducible furniture inventory — 2026-09-10

Added a generated manifest for 189 catalog entries and 93 mapped GLBs, including
default centimetre dimensions, web representation, asset hashes and embedded
metadata. CI checks drift through `npm run catalog:check`. Provenance is explicitly
unverified; source/license curation, product measurements, native support and
unmapped/texture assets remain open. See [inventory scope](docs/furniture-inventory.md).

### Mapped furniture source verification — 2026-09-10

All 93 mapped GLBs exactly match official Kenney archive members (29 Furniture
Kit, 64 Nature Kit). Added durable archive/member/model hashes and local CC0
notices; inventory generation validates source evidence and license-notice hashes.
See [provenance scope](docs/furniture-inventory.md). Unmapped assets, textures,
product dimensions and native representation remain separate curation work.

### Complete bundled GLB inventory — 2026-09-10

Expanded source-byte verification and CI inventory checks from 93 mapped models
to all 204 bundled GLBs (140 Furniture Kit, 64 Nature Kit). All match official
archive members. The 111 unmapped assets are identified by empty catalogIds;
an altered unmapped-asset provenance hash is rejected. Textures, product
measurements and native representation remain separate work.

### Full native trace integration baseline — 2026-09-10

The complete FloorPlanTests target passed at native b6ee323 on Catalyst and
iPhone 17 Pro / iOS 26.5 Simulator: 248 executed, two optional external-worker
checks skipped, zero failures on each platform. Suite durations were 65.894 s
and 55.705 s respectively. See native `docs/native-trace-integration-baseline.md`.
UI dismissal, physical-device and release gates remain open.

### Texture credit and mapping inventory — 2026-09-10

Catalog inventory now covers all 20 bundled material textures with hashes,
material IDs and source asset IDs from existing credits. Each has one current
material mapping. CI rejects missing/duplicate credit records and missing mapped
files. Attribution remains documented locally, not independently source-byte
verified; conversion/source comparison and physical scale remain open.

### Shared runtime texture mapping — 2026-09-10

Runtime texture loading and the inventory now share a typed filename module,
replacing formatting-dependent source scraping. Existing 20 material/file
associations and the generated manifest are unchanged. Catalog check, asset
regression, Svelte check (zero errors/warnings) and production build passed.

### Wall/floor texture request recovery — 2026-09-10

Fixed permanently pending texture IDs after image-load errors. Wall and floor
loaders now permit a later draw to retry after a 30-second cooldown, avoiding
per-frame requests; success wakes rendering and reuses the cached image.
Both regression cases failed before the fix; all three focused recovery/asset
tests, zero-warning Svelte check, catalog check and production build passed.
See [validation](docs/reviews/2026-09-10-texture-recovery.md).

### Texture recovery browser validation — 2026-09-10

Six production-browser cases pass across Chromium, Firefox and WebKit. Wall
and floor texture requests recover after an injected abort; cooldown redraws
do not add requests, and fulfilled retries update canvas pixels without further
input. The test advances Date.now past the cooldown; physical-device/outage
qualification remains separate. See [report](docs/reviews/2026-09-10-texture-recovery.md).

### 2D/3D texture recovery across engines — 2026-09-10

All 12 wall/floor × 2D/3D recovery cases pass across Chromium, Firefox and WebKit.
3D checks settle WebGL drawing before releasing the retry and view floors from
above so their changed surface is visible. Shared texture callbacks rebuild the
3D scene without further input; no additional production change was needed.
See [report](docs/reviews/2026-09-10-texture-recovery.md).

### Furniture download recovery — 2026-09-10

Failed GLB downloads no longer stay cached until page reload. Later requests can
retry after a 30-second cooldown while concurrent callers still share one load
and cloned resources remain independent. Existing fallback instances stay intact
until rebuilt. The new regression failed before the change; all 14 focused
model/texture tests, zero-warning Svelte checks, catalog checks and production
build pass. See [report](docs/reviews/2026-09-10-model-recovery.md).

### Full web asset-recovery integration — 2026-09-10

`npm test` passed all 931 tests in 86 files against faaa9cd, zero failures,
21.14 seconds. The source already passed zero-warning Svelte checks and production
build. Focused texture browser checks remain separately reported; no new full
browser-suite or physical-device result is claimed.

### Native initial tracing-image import — 2026-09-10

Native `8e2605d` now prepares ImageIO thumbnails directly from encoded Files/Photos
input and preserves PNG/JPEG attachment bytes instead of full-resolution UIKit
JPEG re-encoding. Other formats retain conversion. All 22 targeted preview/import
and package tests passed on Catalyst and iPhone 17 Pro / iOS 26.5 Simulator,
including PNG/JPEG package round trips. Original metadata/transparency and source
resolution are preserved; larger package sizes, other-format conversion and
physical-device peak memory remain open. See native
`docs/native-trace-preview-pixels.md`. No new picker UI qualification is claimed.

### English/Portuguese string system — 2026-09-10

Added typed reactive translations and a persisted Settings language selector,
adapting the relevant community PR #15 strings. Language changes preserve dialog
identity/focus and initialize after hydration. Four unit tests, zero-warning
Svelte check, production build and all three browser-engine cases passed.
The remaining interface, nested settings panels, Portuguese review and device
coverage are still open; see `docs/reviews/2026-09-10-localization.md`.

### Nested Settings localization — 2026-09-10

Translated floor elevations/slab thickness, wall snapping, OpenAI provider settings
and the shared model picker, plus both Settings entry points. Floor names, model
IDs and numeric measurement inputs stay unchanged. Five unit tests, zero-warning
Svelte check and production build pass. Language switching and Portuguese
floor/provider interactions are verified across all three engines, with native
model suggestions committed before the next button action. Broader localization
and diagnostic-message translation remain open. See the localization record.

### Welcome and onboarding localization — 2026-09-10

Translated the welcome flow, quick tour, template display labels, import-error
controls and contextual tips. Template factories and generated data retain their
original identifiers/names. Five localization unit tests, zero-warning Svelte
check and production build pass. Six Portuguese browser cases pass across all
three engines at 390 × 900, including bad-import recovery, template export and
tour dismissal persistence. Library/package dialogs, wider editor translation
and fluent-speaker/device review remain open. See the localization record.

### Project library localization — 2026-09-10

Translated the library shell, counts/dates, template picker, action menus and
rename/delete dialogs. Menu typeahead uses visible Portuguese labels; project
content and action identifiers remain unchanged. Header controls wrap on narrow
screens. Five localization unit tests, zero-warning Svelte check and production
build pass. Three 390-pixel browser cases pass across all engines, covering menu
keyboard behavior, geometry-preserving rename, deletion cancellation and template
labels. Restore/package dialogs and broader editor translation remain open.

### Restore/package dialog localization — 2026-09-10

Translated library-restore and package-import controls, previews, confirmation,
completion and dialog-owned recovery messages. Five unit tests, zero-warning
Svelte check and production build pass. Six browser cases pass across all engines
at 390 × 900, verifying unchanged library data before confirmation, byte-identical
original downloads and one imported/restored copy. Service diagnostics/warnings
and broader editor translation remain open; see the localization record.

### Alignment and selection localization — 2026-09-10

Translated alignment/distribution, selection-toolbar actions, contextual menus
and Undo History controls. Saved history descriptions and wider editor UI remain
open. Five localization unit tests, zero-warning Svelte check and production build
pass. Twelve Portuguese alignment cases pass at desktop/phone widths across all
three engines, verifying scaled/rotated geometry, locked items, Undo and Redo.
See the localization record for the exact coverage limits.

### Command palette localization — 2026-09-10

Translated command/action names, categories, search labels and keyboard hints;
search accepts queries without Portuguese accents. Five localization unit tests,
zero-warning Svelte check and production build pass. Three browser cases pass
across all engines, verifying searches, Settings/tool/grid execution after modal
closure and focus restoration. Catalog names/categories and wider editor controls
remain open. See the localization record.

### Localization integration checkpoint — 2026-09-10

All 936 web unit tests across 87 files pass at `31e263d` (21.68 seconds, exit 0).
The existing English palette/modal-field flow passes in all three engines at
1440 and 390 pixels (six cases, 46.4 seconds). This supplements the focused
Portuguese checks; it does not close the remaining localization or release gates.

### Saved version-history localization — 2026-09-10

Translated the version panel, entry points, time labels, confirmations and
panel-owned errors. Snapshot descriptions/data remain unchanged. Five localization
unit tests, zero-warning Svelte check and production build pass. Three phone-width
browser cases pass across all engines, verifying cancellation preserves history
and confirmed restore recovers the selected project name and wall height.
Service diagnostics and wider editor translation remain open.

### Area summary localization — 2026-09-10

Translated summary labels, categories and controls, preserving room names and
measurement logic. Five localization unit tests, zero-warning Svelte check and
production build pass. Three phone-width browser cases pass across all engines,
comparing measurements across languages and retaining unknown room categories.
The older 931-test checkpoint above is explicitly historical; the latest full
unit baseline remains 936 tests at `31e263d`. Wider localization remains open.

### Print-layout control localization — 2026-09-10

Translated print entry/controls, warnings and fallback errors. Paper IDs, scale
values and project content are unchanged. Five localization unit tests,
zero-warning Svelte check and production build pass. Three phone-width browser
cases pass across all engines, verifying overflow/fit behavior, A4 portrait
proportions and PDF download. Printed sheet/schedule text and physical print
qualification remain open.

### Printed sheet and schedule localization — 2026-09-10

Translated sheet captions/instructions and the PDF schedule heading with explicit
locale input. Layout math, calibration and project content remain unchanged.
Fifteen print-scale/localization unit tests, zero-warning Svelte check and production
build pass. Three browser cases pass across all engines, inspecting canvas labels
and the downloaded PDF heading alongside scale/fit checks. Physical print, broader
canvas text and general export localization remain open.

### Export outcome localization — 2026-09-10

PDF/PNG notices now retain typed message keys and translate at display time.
Nine unit tests, zero-warning Svelte check and production build pass. Three
Portuguese browser cases pass across all engines, checking real 2D PNG export
from 3D mode and failure feedback from menu/palette with no extra download.
Export-menu labels, deployment notices and wider localization remain open.

### Update/reload notice localization — 2026-09-10

Translated update, loading-failure and save-before-leaving notices with reactive
keys. Twenty-one targeted unit tests, zero-warning Svelte check and production
build pass. Three Portuguese browser cases pass across all engines using an
isolated server, verifying blocked navigation on save failure, JSON recovery and
successful retry to the intended destination. No live deployment changed; wider
localization remains open.

### Print/notice integration checkpoint — 2026-09-10

All 938 unit tests across 87 files pass at `e12cff4` (11.98 seconds, exit 0).
Three English reload-safety browser cases also pass across all engines (26.6
seconds), covering failed-save protection, JSON recovery and retry navigation.
Remaining localization, device and release gates stay open.

### Model-result singular wording — 2026-09-10

Corrected one-result model-discovery wording in English and Portuguese. Five
localization unit tests, zero-warning Svelte check, production build and all three
provider browser cases pass. Broader localization and fluent-speaker review remain
open.

### Export-menu localization — 2026-09-10

Translated export/import actions and project-package help. Five localization unit
tests, zero-warning Svelte check, production build and six browser cases pass
across all three engines, including original-name JSON preservation and PNG
export/failure feedback. Remaining editor localization and device/release gates
stay open.

### Toolbar view controls — 2026-09-10

Desktop and compact view controls now translate labels, tooltips and state text.
Five localization unit tests, zero-warning check, production build and nine
browser cases pass across all engines, including 390px/1440px controls and
language-switching area-summary preservation. Other editor localization, fluent
review and physical-device/release requirements remain open.

### Floor-control localization — 2026-09-10

Translated floor controls without changing stored names or seed behavior. Fifteen
focused unit tests, zero-warning check, production build and six Portuguese
browser cases pass, covering both toolbar widths, floor framing/camera restoration
and exported data preservation. Broader localization and device/release gates
remain open.

### Save-control localization — 2026-09-10

Translated save-state/recovery controls and made elapsed-time tooltips react to
language changes immediately. Five localization unit tests, zero-warning check,
production build and six browser cases pass, including storage-failure backup,
retry, persisted edits and deployment recovery. Raw storage diagnostics, remaining
editor localization and device/release gates stay open.

### Layers localization and reproduced phone control overlap — 2026-09-10

Layers item-list labels are translated. Five unit tests, zero-warning check,
production build and six browser cases pass, using the L shortcut at both widths
to verify visibility/selection and exported-data preservation. Catalog names remain untranslated; the canvas visibility popover was translated
in the follow-up below.

**Reproduced issue, subsequently fixed in browser checks (see below):** at 390px, clicking the canvas “Layers” control is blocked
by the floating zoom toolbar (Fit selection intercepts the click in Chromium).
The item-list toggle is desktop-only; its keyboard shortcut works on the narrow
layout but does not establish touch access. Fix control overlap and make item-list
access clear on touch devices; verify real clicks without force or DOM dispatch.
See the localization record for failed/successful run evidence.

### Narrow-layout Layers access correction — 2026-09-10

The canvas status/actions strip scrolls horizontally above the zoom controls on
phones; its visibility popover opens above both strips. Added a Layers entry to
the compact toolbar menu to open/close the item list without a keyboard. Six
browser cases pass across Chromium, Firefox and WebKit at 1440px/390px (60.0s).
The narrow cases use normal pointer clicks to open/close the visibility popover,
toggle walls and open the item list, then verify selection and exported floor
data. Production build and zero-warning Svelte check pass. Physical touch devices,
other narrow viewport combinations and general toolbar localization remain open.

### Canvas visibility-popover localization — 2026-09-10

Translated visibility checkbox labels, lower-floor text and the canvas trigger.
Five unit tests, zero-warning check, production build and six browser cases pass
(57.5 seconds), including narrow-layout pointer access, room-label toggles and the
disabled no-lower-floor option. Remaining canvas/editor strings and physical-device
qualification stay open.

### Canvas zoom localization — 2026-09-10

Translated canvas zoom/reset/fit labels and shortcut hints without changing camera
math or limits. Five unit tests, zero-warning check, production build and six
Portuguese large-fit browser cases pass (36.3 seconds) across all engines and both
widths, covering small zoom values, extents and zoom/fit restoration. Remaining
canvas/editor localization and physical-device gates stay open.

### Canvas display localization and toggle states — 2026-09-10

Translated canvas display toggles and exposed their on/off state with aria-pressed.
Five unit tests, zero-warning check, production build and the final nine-case
focused browser run pass, including pointer toggles and unchanged exported settings.
An initial WebKit phone-width grid click did not toggle; isolated and full reruns
passed unchanged. Keep this intermittent observation in view during broader
WebKit/touch qualification; its cause is not established. Remaining translation
and physical-device gates stay open.

### Project-toolbar navigation localization — 2026-09-10

Translated project navigation/rename, undo/redo labels and import/export error
headings. Five unit tests, zero-warning check, production build and six browser
cases pass (36.4 seconds), verifying preserved names, backup/retry and guarded
back-navigation. Raw diagnostics, remaining editor panels and device/release
requirements stay open.

### Canvas guidance localization — 2026-09-10

Translated empty-plan/elevation-picking guidance and inline editor labels. Five
unit tests, zero-warning check, production build and six browser cases pass
(30.5 seconds), including drawing a real wall and canceling elevation picking at
both widths. Remaining editor strings and physical-device gates remain open.

### Bilingual inline annotation persistence — 2026-09-10

Expanded the existing annotation keyboard test to English/Portuguese and verified
save/reopen/download equality for literal-brace text. All six desktop browser
cases pass across three engines (24.4 seconds), including field focus and context
menu bounds. Room/dimension inline editing and phone qualification remain separate
work. Runtime source is unchanged from `102537f`.

### Build-panel primary tool localization — 2026-09-10

Translated panel tabs, primary tool/help text and import entry captions. Five unit
tests, zero-warning check, production build and six browser cases pass (26.1
seconds), selecting the translated wall tool through desktop/phone UI and verifying
its exported wall. Catalogs, remaining room/object content, import dialogs and
physical-device qualification stay open.

### Opening-catalog localization — 2026-09-10

Translated all door/window choice labels and descriptions reactively, retaining
semantic types, dimensions and drag payloads. Five unit tests, zero-warning check,
production build and three desktop browser cases pass (10.3 seconds), checking
all labels plus representative door/window placement and exported types/widths.
Remaining room/object catalogs, dialogs and device qualification stay open.

### Room-choice localization — 2026-09-10

Translated room shapes/templates through display-only maps and localized item
counts. Five unit tests, zero-warning check, production build and six browser
cases pass (36.5 seconds), covering desktop/phone placement, original geometry and
furniture IDs, and grouped undo. Object catalogs, dialogs, remaining editor text
and device/release requirements remain open.

### Object search/favorites localization — 2026-09-10

Translated search/results/favorites controls and accessible names while preserving
search and stored IDs. Five unit tests, zero-warning check, production build and
12 bilingual browser cases pass (1.2 minutes), including keyboard focus, literal
search text and independent favorite/placement actions. Item/category names,
remaining dialogs/editor panels and physical-device requirements remain open.

### Catalog-category localization and search — 2026-09-10

Translated category filters/preview labels while preserving identifiers. Search
accepts original/translated categories without requiring accents. Five unit tests,
zero-warning check, production build and three browser cases pass (36.3 seconds),
including category isolation and original recent-item IDs. Individual object names,
remaining editor panels/dialogs and device/release gates remain open.

### RoomPlan import-dialog localization — 2026-09-10

Translated import-option labels/help and confirmation/cancel actions. Five unit
tests, zero-warning check, production build and six Portuguese browser cases pass
(39.4 seconds), verifying edited-option cancellation leaves stored projects intact
and restores dialog focus at both widths. Remaining diagnostics/editor strings
and physical-device/release gates stay open.

### Bilingual RoomPlan confirmation geometry — 2026-09-10

Six browser cases pass across all engines at both widths (43.6 seconds), confirming
prepared RoomPlan imports in English/Portuguese and comparing exported walls,
openings and linkage while retaining original names and prepared-option defaults.
Runtime source remains `9fd5922`. Raw-scan/device qualification and remaining
localization/release requirements remain open.

### Presentation-symbol localization — 2026-09-10

Translated built-in symbols, category/place hints and upload captions, sharing
display labels with Layers. Five unit tests, zero-warning check, production build
and three browser cases pass (41.9 seconds), retaining person ID/size and undo.
Custom names stay unchanged; individual furniture names, remaining editor panels
and physical-device/release requirements remain open.

### Symbol-upload feedback and recovery — 2026-09-10

Added translated inline read/decode/size errors and corrected the supported-format
caption. Five unit tests, zero-warning check, production build and three browser
cases pass (41.8 seconds), verifying failed uploads preserve prior data and valid
PNG retry preserves original bytes/names. Remaining editor localization and
physical-device/release gates stay open.

### Symbol FileReader recovery verification — 2026-09-10

Added asynchronous read-error fault injection to upload recovery coverage. Three
browser cases pass (33.4 seconds), retaining prior data and verifying successful
retry after restoring the native reader. Runtime source remains `950fc36`; real
hardware/device failure qualification and remaining NEXT requirements stay open.

### Opening Properties localization — 2026-09-10

Translated door/window Properties controls while retaining numeric handlers and
stored type IDs. Production check/build and five localization unit tests pass;
three desktop browser cases pass (12.2 seconds), verifying width, sill height,
type, hinge and opening direction edits through JSON export with host walls
unchanged. Other Properties sections and physical-device/release gates remain open.

### Furniture Properties localization — 2026-09-10

Translated furniture editing controls and finish display names, retaining stored
IDs and catalog names. Production check/build, five localization unit tests and
three desktop browser cases pass (25.8 seconds). Export comparisons verify
appearance/transform edits, reset behavior and unchanged neighboring furniture.
Other Properties sections, 3D/device qualification and remaining NEXT gates stay open.

### Room Properties localization — 2026-09-10

Translated room controls and type/color/material choices while retaining original
preset names and material IDs. Production check/build and five localization unit
tests pass. Three desktop browser cases pass (35.6 seconds), checking literal names,
category/material/color edits, reversible floor openings and unchanged geometry.
Remaining Properties sections and broader usability/device/release gates stay open.

### Symbol Properties localization — 2026-09-10

Translated symbol Properties controls and reused built-in display names. Check,
build and five localization unit tests pass; three browser cases pass (50.1 seconds)
for numeric/opacity/lock edits and delete/undo data preservation. An initial WebKit
placement undo assertion failed before new edits, then passed unchanged in isolated
and full reruns; its intermittent cause remains unresolved. See the localization
record. Remaining Properties and device/release gates stay open.

### Prevent save-status changes moving toolbar controls — 2026-09-10

Reproduced the symbol Undo failure on WebKit run four. Trace evidence shows autosave
changing the status label during the click and shifting toolbar targets. Reserved
space for the widest translated status; undo/history logic is unchanged. A new
position-stability assertion passes across all engines with save/symbol workflows
(six cases), followed by five consecutive WebKit passes. Production check/build
pass. This addresses the observed save-label shift; other intermittent canvas
observations and remaining NEXT requirements remain open.

### Stair Properties localization — 2026-09-10

Translated stair editing controls while retaining layout IDs and handlers. Check,
build and five localization unit tests pass; three desktop browser cases pass
(18.5 seconds), verifying dimensions, riser count, layout, rotation, direction and
undo through exported data. Remaining Properties and device/release gates stay open.

### Column Properties localization and accessible shape controls — 2026-09-10

Translated column labels/color presets and corrected a reproduced accessible-name
issue caused by a label wrapping both shape buttons. Shape controls now use a
named group and pressed states. Check/build, five localization unit tests and
three browser cases pass (29.4 seconds), retaining dimensions/rotation/color across
shape changes. Other Properties/accessibility/device/release work remains open.

### Door and stair button-group accessibility — 2026-09-10

Reproduced missing accessible names for the first hinge/direction buttons. Replaced
wrapping form labels with named groups for door hinge/opening and stair direction;
added selected-state semantics. Production check/build and six browser cases pass
(51.2 seconds), including edited-data export and stair undo. Remaining accessibility,
localization and device/release requirements stay open.

### Text annotation Properties localization — 2026-09-10

Translated annotation Properties labels. Production check/build and five
localization unit tests pass. Six bilingual browser cases pass (53.2 seconds),
checking focus, reopen, literal multiline text and font/rotation/position edits
through exported data. Remaining Properties/device/release gates stay open.

### Background-image Properties localization — 2026-09-11

Translated image adjustment, lock, calibration-entry and removal labels. Check,
build and five localization unit tests pass; three browser cases pass (31.1 seconds),
verifying image byte/position preservation, adjustment values and removal/undo.
Calibration execution and remaining Properties/device/release gates stay open.

### Wall length and endpoint localization — 2026-09-11

Translated wall length/thickness, fixed-endpoint choices, related help and minimum
length validation. Check/build, five localization unit tests and three browser
cases pass (33.0 seconds), retaining connected geometry/opening values and invalid
input undo behavior. Other wall controls/diagnostics and broader device/release
requirements remain open.

### Wall height and direction localization — 2026-09-11

Translated endpoint-height controls, clipping warning, equalize and reverse actions.
Check/build, five localization unit tests and three browser cases pass (40.0 seconds),
verifying saved opening dimensions, swapped endpoints/heights and equalized heights.
Remaining wall controls/diagnostics and broader device/release scope stay open.

### Wall curve control localization and accessibility — 2026-09-11

Translated curve states and elevation entry; added a named curve toggle with
pressed state. Check/build, five localization unit tests and three browser cases
pass (47.5 seconds), verifying saved curve geometry, unchanged openings and straight
wall restoration. Wall materials/diagnostics and broader device/release gates stay open.

### Wall material label localization — 2026-09-11

Translated wall color/texture choices and side controls while retaining material
IDs. Check/build, five localization unit tests and three browser cases pass
(53.2 seconds), verifying independent interior/exterior finish values and texture
removal without losing other wall/opening data. Diagnostics, child detail panels
and broader device/release requirements stay open.

### Item metadata field localization — 2026-09-11

Translated notes/cost, construction-material and room-use/ceiling metadata labels,
retaining identifiers and values. Check/build, five localization unit tests and
six browser cases pass (56.1 seconds), verifying literal notes, cost precision,
room-use ID and ceiling override. Photos/diagnostics and broader native/device/release
requirements stay open.

### Bilingual native metadata package verification — 2026-09-11

Six English/Portuguese Swift-return fixture cases pass (54.6 seconds), checking
translated construction material, native room-use/height and cost export. Fixed a
test-loading dependency by validating exported photos with the browser decoder;
six desktop/compact photo integration cases pass (1.6 minutes). Runtime unchanged;
new physical/native runs and remaining photo/localization/release gates stay open.

### Item-photo control localization — 2026-09-11

Translated item-photo add/download/remove controls and guidance. Check/build,
five localization unit tests and three browser cases pass (33.8 seconds), preserving
small-PNG bytes and retained assets while verifying remove/undo references. Retained
file management, diagnostics and broader device/release requirements stay open.

### Retained-attachment control localization — 2026-09-11

Translated retained-file controls and confirmation text, preserving source filenames.
Check/build, five localization unit tests and three browser cases pass (41.9 seconds),
verifying reuse, cancellation retaining bytes and confirmed deletion. Diagnostics
and broader device/release requirements remain open.

### Item-detail status and validation localization — 2026-09-11

Translated known detail-panel notices at render time, preserving unknown service
errors. Check/build, five localization unit tests and six browser cases pass
(1.0 minute), verifying invalid-cost recovery, attachment notices and rejection of
used-file deletion. Broader diagnostics/device/release requirements remain open.

### Calibration finite-scale protection and translation — 2026-09-11

Reproduced Infinity calibration producing null scale in JSON export. Added finite,
positive distance/result checks and translated the prompt. Check/build, five
localization unit tests and three browser cases pass (46.8 seconds), checking
invalid/cancelled input preservation and valid scale doubling. Physical calibration
and remaining device/release requirements stay open.

### Escape cancels unfinished image calibration — 2026-09-11

Reproduced a stale calibration prompt after Escape. The canvas Escape handler now
clears calibration mode and points. Check/build and three browser cases pass
(51.8 seconds), preserving image data and allowing fresh calibration afterward.
Other cancellation/device/release requirements remain open.

### Floor changes cancel image calibration — 2026-09-11

Reproduced calibration surviving floor addition. The shared floor-context reset
now discards calibration mode and points. All 11 floor unit tests pass, including
switch/add/remove and floor-changing undo/redo. Production check/build and three
browser cases pass (59.2 seconds), preserving both floors' background images and
allowing fresh calibration. Physical-device and remaining release work stay open.

### Elevation navigation localization — 2026-09-11

Translated wall cycling, wall counter and interaction guidance, and named the
elevation canvas for accessibility. Check/build, five localization unit tests
and three browser cases pass (51.3 seconds), covering navigation, wraparound and
Escape with unchanged exported floor data. Opening drag/device qualification and
the remaining localization/release work remain open.

### Preserve undo when leaving elevation mid-drag — 2026-09-11

Reproduced a moved window remaining changed after Undo when Escape interrupted
its elevation drag. View teardown now closes the pending drag's undo group.
Production check/build and three browser cases pass (41.3 seconds), checking
position/sill changes, retained dimensions and exact whole-floor Undo/Redo.
Other gesture exits, physical-device and remaining release work stay open.

### Keyboard shortcut reference localization — 2026-09-11

Translated shortcut help and copied reference together, plus the 3D loading
message. Production check/build, five localization unit tests and three browser
cases pass (22.6 seconds), verifying help entry/dismissal and the translated
clipboard payload. OS clipboard permissions, remaining UI/device/release work
stay open.

### Editor loading and recovery localization — 2026-09-11

Translated retry/backup, return-to-projects, loading/importing and capture-error
shell controls. Check/build, five localization unit tests and three browser cases
pass (22.3 seconds). Injected migration failure preserves exact backup bytes;
retry opens the original project without duplication or saved-data changes.
Service diagnostics, physical-device recovery and other release work remain open.

### Capture import diagnostics localization — 2026-09-11

Translated known capture-import errors with code/status parameters while retaining
unexpected diagnostics. Check/build, five localization unit tests and three
browser cases pass (35.8 seconds), each covering six routed failure paths and
dismissal back to an available editor. Live handoff, physical-device and remaining
release requirements stay open.

### Capture download survives initial save failure — 2026-09-11

Three browser cases pass at `1700d1e` (29.6 seconds), confirming a routed
multi-floor capture remains exportable after a project-write quota failure. Retry
saves one project with exact backup floor data, and reload avoids re-downloading
the capture. No runtime changes were needed. Live cloud/device and remaining
release qualification stay open.

### Editor panel toggle localization and state — 2026-09-11

Translated tools/layers/history controls and exposed expanded state. Check/build
and five localization unit tests pass. All 30 affected browser cases pass across
three engines in split runs, including desktop/narrow panel use, catalog placement
and bilingual RoomPlan preservation. See the localization record for run details.
Physical touch and remaining UI/release requirements stay open.

### Main 3D navigation localization — 2026-09-11

Translated primary viewer controls and camera/walkthrough guidance. Check/build,
five localization unit tests and three browser cases pass (47.0 seconds),
covering view toggles, camera placement cancellation, PNG download and unchanged
project floors/settings. Remaining viewer panels, physical-device and release
requirements stay open.

### 3D lighting panel localization — 2026-09-11

Translated lighting labels and presets, exposing panel/preset states. Check/build,
five localization unit tests and three browser cases pass (57.5 seconds), covering
all preset values, keyboard ambient adjustment, selection reset and unchanged
exported project data. Render-quality, remaining viewer UI and device/release
requirements stay open.

### Portuguese walkthrough interaction verification — 2026-09-11

Three Portuguese browser cases pass at `9cf4ec2` (35.0 seconds), observing
rendered camera movement, isolated eye-height changes and Top-Down exit under
simulated mouse-lock denial. Three existing English input-reset cases also pass
(39.2 seconds). No runtime changes were needed. Physical input/performance and
remaining release requirements stay open.

### Interior camera preview localization — 2026-09-11

Translated preview, movement, camera adjustment and capture controls, naming
movement arrows accessibly. Check/build, five localization unit tests and three
browser cases pass (58.6 seconds), covering preview rendering, control use,
1920×1080 PNG capture and context cleanup after reposition/close. AI panel,
physical-device and remaining release requirements stay open.

### AI render panel localization — 2026-09-11

Translated AI panel controls/disclosure and style/lighting/mood display choices
while preserving model IDs and provider prompt values. Check/build, five
localization unit tests and three browser cases pass (37.8 seconds), with literal
extra instructions retained and no external requests. Render execution, remaining
diagnostics/device and release qualification stay open.

### AI render execution integration checkpoint — 2026-09-11

Six existing English local-provider browser cases pass at `edd0846` across
three engines and desktop/narrow layouts (2.1 minutes), covering image output,
byte-identical download, failure/cancellation and settings cleanup. No runtime
changes or live AI requests were needed. Portuguese execution, device and
remaining release qualification stay open.

### 3D furniture placement localization — 2026-09-11

Translated placement controls/guidance and reused category labels, with accessible
category selection states. Check/build, five localization unit tests and three
browser cases pass (46.1 seconds), verifying catalog identity and exact floor
Undo/Redo after placement. Item names, remaining viewer text and device/release
requirements stay open.

### Shortcut clipboard failure recovery — 2026-09-11

Reproduced missing feedback on clipboard denial. Copy now catches failure, reports
translated status, supports retry and ignores late results after dialog reopen.
Check/build, five localization unit tests and six browser cases pass (28.6 seconds),
including delayed completion and no page errors. Actual OS permissions and
remaining device/release requirements stay open.

### Blender scene export localization — 2026-09-11

Translated export labels/status and stacked-floor elevation. Check/build, five
localization unit tests and six Portuguese browser cases pass (52.0 seconds),
covering deterministic scene downloads, geometry/height/scope and backup heights
at desktop/narrow widths. External rendering, failure branches and remaining
device/release qualification stay open.

### Known AI render error localization — 2026-09-11

Translated five known app-owned AI error messages while preserving unknown/raw
diagnostics. Check/build, five localization unit tests and three browser cases
pass (35.8 seconds), including missing-key recovery without network requests.
Other failure branches, physical-device and release requirements stay open.

### Canvas status count localization — 2026-09-11

Translated object/geometry counts with singular/plural forms, selection and zoom
text. Check/build, five localization unit tests and twelve browser cases pass
(1.3 minutes), covering desktop/narrow layer counts and welcome/template recovery
with retained project data. Remaining UI/device/release requirements stay open.

### Canvas contextual action localization — 2026-09-11

Translated duplicate/delete, swing-flip and midpoint-split controls. Check/build,
five localization unit tests and six Portuguese browser cases pass (56.3 seconds),
covering mixed/symbol duplication and deletion with IDs, wall references and
Undo/Redo preservation. Swing/split, device and remaining release qualification
stay open.

### Contextual swing and wall split verification — 2026-09-11

Three Portuguese browser cases pass at `2c620e9` (24.2 seconds), checking saved
swing changes, midpoint endpoints and sloped heights, opening dimensions/centers
and exact Undo restoration. No runtime changes were needed. Openings spanning
the split point, curved splitting and device/release requirements stay open.

### Prevent splits from clipping openings — 2026-09-11

Reproduced door/window crossing splits mutating their owning wall. Since an
opening has one wall reference, splitting through its interior now returns null
before taking an undo snapshot. Splits exactly at opening edges remain allowed.
All three canvas split entry points use a shared wrapper with an English/Portuguese
dismissible explanation. Check/build, 943 unit tests and nine browser cases pass;
browser checks cover crossing door/window preservation, notice dismissal and
existing safe split/swing/Undo behavior. Curved splitting, physical gestures and
the remaining native/release backlog stay open.

### Context-menu keyboard navigation — 2026-09-11

Reproduced the context menu opening without focused actions. Menus now focus the
first enabled action, wrap with Up/Down, support Home/End and restore prior focus
on Escape or activation. Tab closes the menu; menu key events no longer bubble
to editor shortcuts. Removed unused action imports and added visible focus styling.
Check/build and six English/Portuguese Chromium/Firefox/WebKit cases pass (52.4
seconds), including keyboard activation, Escape, viewport bounds and annotation
save/reload/edit preservation. These tests open the menu with a pointer; native
keyboard context-menu invocation and physical accessibility checks remain open.

### Open context menus from the keyboard — 2026-09-11

Shift+F10 and the Menu key now open a context menu from the focused canvas. The
menu targets the selected supported element (or canvas for multi-selection),
with its anchor clamped to the canvas. It does not depend on pointer position or
place measurement points. A regression at 211fb0f could not find the wall menu
after Shift+F10; the fixed checks pass.

Check/build and 12 Chromium/Firefox/WebKit cases pass (1.4 minutes), covering
selected-wall keyboard invocation with both keys, opening-safe split activation,
Delete isolation and exact floor preservation, plus English/Portuguese canvas
menus, keyboard activation, Escape/Tab dismissal and annotation persistence.
Furniture/opening/room keyboard target branches and physical assistive-technology
qualification remain to be exercised; broader NEXT scope stays open.

### Context-menu Properties focus — 2026-09-11

Reproduced Properties leaving keyboard focus on the canvas. The explicit action
now waits for the selected panel to render and focuses its first enabled control,
with guards against teardown or a changed selection. Twelve Portuguese browser
cases pass across Chromium/Firefox/WebKit at 1440px/390px (1.1 minutes), checking
selected door/window menu targeting, focus transfer, width edits and exact floor
Undo restoration. Check/build pass with zero Svelte diagnostics. Furniture/room
menu actions and physical assistive-technology checks remain open.

### Room rename keyboard focus — 2026-09-11

Reproduced Escape from inline room rename leaving focus outside the canvas.
Enter/Escape now prevent their default action and restore canvas focus after
commit/cancel. Blur still allows focus to move to the requested control.
Check/build and six Portuguese browser cases across Chromium/Firefox/WebKit at
1440px/390px pass (48.5 seconds). They cover room-menu keyboard targeting, rename
focus, cancellation with exact floor preservation, ordinary blur focus transfer,
name-only updates and exact Undo restoration. Other room-menu actions and physical
accessibility remain open.

### Room floor-material keyboard access — 2026-09-11

Change Floor Texture now selects the room and focuses its current material (or
the first available choice). Material choices have a named group and expose
their selected state. Check/build and six Portuguese browser cases pass across
Chromium/Firefox/WebKit at 1440px/390px (20.8 seconds), covering menu focus,
keyboard material selection, material-only changes and exact Undo alongside the
existing rename cases. Room reset/delete keyboard flows and physical accessibility
remain open.
