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
