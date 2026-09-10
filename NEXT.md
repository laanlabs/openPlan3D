# Next work and pause handoff

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
- **Building completeness:** implement slabs, stair voids and common roof forms.
  Floor elevations and variable endpoint wall heights already exist. Extend native
  editing/preview fidelity for curves, slopes, elevations, opening styles and
  annotations while retaining unsupported data through package returns.
- **Known package presentation limits:** native previews still use straight,
  uniform-height walls and simplified furniture; only one unrotated first-floor
  embedded PNG/JPEG/GIF tracing image maps to the native underlay. Other imagery
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
  focused string-system change. Recheck first-use navigation, dense toolbars,
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

- Replace stale `FEATURES.md` and comparison checklists with a tested capability
  matrix. Refresh README counts/import features and add contributor guidance,
  fixture-oriented issue/PR templates and a release checklist. Historical review
  findings and original package metadata are not authoritative current status.
- The seven remaining Svelte warnings are resolved in the local keyboard/component
  cleanup batch: native favorite buttons, protected control activation/Tab, explicit
  inline-editor focus, reactive menu bounds and removal of the retired material
  picker. See [the validation report](docs/reviews/2026-09-09-editor-keyboard-cleanup.md).
  Keep zero-warning type checks passing. The local WebKit modal failures were
  traced to default Backspace navigation on buttons and are fixed; text deletion
  remains native in editable fields. The CI artifact actions use pinned Node 24
  releases; continue dependency auditing.
- Decide whether to publish/license the currently private iOS repository, add a
  root contributor README, and clarify the two native targets/release branding.
  Review the current iOS 26.2 minimum before distribution; lowering it requires
  an API-availability audit and device testing. These are product/release decisions.

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
